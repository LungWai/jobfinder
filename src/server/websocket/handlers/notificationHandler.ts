import { prisma } from '../../../database/client';
import logger from '../../../utils/logger';
import WebSocketServer from '../index';

export interface Notification {
  id: number;
  userId: number;
  type: 'job_match' | 'application_update' | 'interview_reminder' | 'document_request' | 'general';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationHandler {
  constructor(private wsServer: WebSocketServer) {}

  async createAndSendNotification(
    userId: number,
    type: Notification['type'],
    title: string,
    message: string,
    data?: any
  ): Promise<Notification> {
    try {
      // Create notification in database (you might need to add a Notification model to your schema)
      const notification = {
        id: Date.now(), // Temporary ID generation
        userId,
        type,
        title,
        message,
        data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Send real-time notification if user is online
      if (this.wsServer.isUserOnline(userId)) {
        this.wsServer.sendNotification(userId, {
          id: notification.id.toString(),
          type,
          title,
          message,
          data,
          timestamp: notification.createdAt,
          read: false
        });
      }

      logger.info(`Notification created and sent to user ${userId}: ${type}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async markAsRead(userId: number, notificationId: number): Promise<void> {
    try {
      // Update notification in database
      // await prisma.notification.update({
      //   where: { id: notificationId, userId },
      //   data: { read: true }
      // });

      // Notify all user's devices
      this.wsServer.getIO().to(`user:${userId}`).emit('notification:updated', {
        id: notificationId.toString(),
        read: true
      });

      logger.info(`Notification ${notificationId} marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: number): Promise<void> {
    try {
      // Update all notifications for user
      // await prisma.notification.updateMany({
      //   where: { userId, read: false },
      //   data: { read: true }
      // });

      // Notify all user's devices
      this.wsServer.getIO().to(`user:${userId}`).emit('notifications:all_read');

      logger.info(`All notifications marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getUserNotifications(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<Notification[]> {
    try {
      // Fetch from database
      // const notifications = await prisma.notification.findMany({
      //   where: { userId },
      //   orderBy: { createdAt: 'desc' },
      //   take: limit,
      //   skip: offset
      // });

      // Temporary mock data
      const notifications: Notification[] = [];
      
      return notifications;
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async deleteNotification(userId: number, notificationId: number): Promise<void> {
    try {
      // Delete from database
      // await prisma.notification.delete({
      //   where: { id: notificationId, userId }
      // });

      // Notify all user's devices
      this.wsServer.getIO().to(`user:${userId}`).emit('notification:deleted', {
        id: notificationId.toString()
      });

      logger.info(`Notification ${notificationId} deleted for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }
}