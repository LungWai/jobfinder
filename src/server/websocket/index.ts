import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger';
import { prisma } from '../../database/client';
import { Express } from 'express';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userEmail?: string;
}

interface NotificationPayload {
  id: string;
  type: 'job_match' | 'application_update' | 'interview_reminder' | 'document_request' | 'general';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read?: boolean;
}

interface ApplicationUpdatePayload {
  applicationId: number;
  status: string;
  previousStatus?: string;
  message?: string;
  timestamp: Date;
}

interface InterviewReminderPayload {
  interviewId: number;
  applicationId: number;
  companyName: string;
  position: string;
  scheduledAt: Date;
  location?: string;
  type: 'upcoming' | 'rescheduled' | 'cancelled';
}

class WebSocketServer {
  private io: SocketIOServer;
  private httpServer: HTTPServer;
  private userSockets: Map<number, Set<string>> = new Map();

  constructor(app: Express) {
    this.httpServer = createServer(app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.CORS_ORIGIN
          : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;

        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`WebSocket client connected: ${socket.id} (User: ${socket.userId})`);

      // Add socket to user's socket set
      if (socket.userId) {
        this.addUserSocket(socket.userId, socket.id);
        
        // Join user-specific room
        socket.join(`user:${socket.userId}`);
        
        // Send connection acknowledgment
        socket.emit('connected', {
          socketId: socket.id,
          userId: socket.userId
        });
      }

      // Handle notification acknowledgment
      socket.on('notification:read', async (notificationId: string) => {
        try {
          // Here you would update the notification as read in the database
          logger.info(`Notification ${notificationId} marked as read by user ${socket.userId}`);
          
          // Broadcast to all user's devices
          if (socket.userId) {
            this.io.to(`user:${socket.userId}`).emit('notification:updated', {
              id: notificationId,
              read: true
            });
          }
        } catch (error) {
          logger.error('Error marking notification as read:', error);
          socket.emit('error', { message: 'Failed to update notification' });
        }
      });

      // Handle subscription to application updates
      socket.on('subscribe:application', async (applicationId: number) => {
        try {
          // Verify user owns this application
          const application = await prisma.jobApplication.findFirst({
            where: {
              id: applicationId,
              userId: socket.userId
            }
          });

          if (application) {
            socket.join(`application:${applicationId}`);
            socket.emit('subscribed:application', { applicationId });
          } else {
            socket.emit('error', { message: 'Application not found or access denied' });
          }
        } catch (error) {
          logger.error('Error subscribing to application:', error);
          socket.emit('error', { message: 'Failed to subscribe to application updates' });
        }
      });

      // Handle unsubscription from application updates
      socket.on('unsubscribe:application', (applicationId: number) => {
        socket.leave(`application:${applicationId}`);
        socket.emit('unsubscribed:application', { applicationId });
      });

      // Handle interview reminder preferences
      socket.on('reminder:preferences', async (preferences: { 
        enableReminders: boolean;
        reminderTimes: number[]; // minutes before interview
      }) => {
        try {
          if (socket.userId) {
            // Store user preferences (you might want to add this to your user model)
            logger.info(`Updated reminder preferences for user ${socket.userId}:`, preferences);
            socket.emit('reminder:preferences:updated', preferences);
          }
        } catch (error) {
          logger.error('Error updating reminder preferences:', error);
          socket.emit('error', { message: 'Failed to update reminder preferences' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id} (User: ${socket.userId})`);
        if (socket.userId) {
          this.removeUserSocket(socket.userId, socket.id);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`WebSocket error for client ${socket.id}:`, error);
      });
    });
  }

  private addUserSocket(userId: number, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeUserSocket(userId: number, socketId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  // Public methods for sending events

  public sendNotification(userId: number, notification: NotificationPayload) {
    this.io.to(`user:${userId}`).emit('notification', notification);
    logger.info(`Notification sent to user ${userId}:`, notification.type);
  }

  public sendApplicationUpdate(userId: number, update: ApplicationUpdatePayload) {
    this.io.to(`user:${userId}`).emit('application:update', update);
    this.io.to(`application:${update.applicationId}`).emit('application:update', update);
    logger.info(`Application update sent for application ${update.applicationId}`);
  }

  public sendInterviewReminder(userId: number, reminder: InterviewReminderPayload) {
    this.io.to(`user:${userId}`).emit('interview:reminder', reminder);
    logger.info(`Interview reminder sent to user ${userId} for interview ${reminder.interviewId}`);
  }

  public broadcastJobMatch(userId: number, jobData: {
    jobId: number;
    title: string;
    company: string;
    matchScore?: number;
  }) {
    const notification: NotificationPayload = {
      id: `job-match-${jobData.jobId}-${Date.now()}`,
      type: 'job_match',
      title: 'New Job Match!',
      message: `${jobData.title} at ${jobData.company} matches your profile`,
      data: jobData,
      timestamp: new Date()
    };
    this.sendNotification(userId, notification);
  }

  public getOnlineUsers(): number[] {
    return Array.from(this.userSockets.keys());
  }

  public isUserOnline(userId: number): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  public getUserSocketCount(userId: number): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  public listen(port?: number) {
    const wsPort = port || parseInt(process.env.WS_PORT || '3002');
    this.httpServer.listen(wsPort, () => {
      logger.info(`WebSocket server listening on port ${wsPort}`);
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public close() {
    this.io.close();
    this.httpServer.close();
  }
}

export default WebSocketServer;
export type { NotificationPayload, ApplicationUpdatePayload, InterviewReminderPayload };