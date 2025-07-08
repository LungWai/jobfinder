import { prisma } from '../../../database/client';
import logger from '../../../utils/logger';
import WebSocketServer, { ApplicationUpdatePayload } from '../index';
import { NotificationHandler } from './notificationHandler';

export class ApplicationHandler {
  private notificationHandler: NotificationHandler;

  constructor(private wsServer: WebSocketServer) {
    this.notificationHandler = new NotificationHandler(wsServer);
  }

  async handleStatusUpdate(
    applicationId: number,
    newStatus: string,
    previousStatus: string,
    message?: string
  ): Promise<void> {
    try {
      // Get application details
      const application = await prisma.jobApplication.findUnique({
        where: { id: applicationId },
        include: {
          job: {
            include: {
              company: true
            }
          },
          user: true
        }
      });

      if (!application) {
        logger.error(`Application ${applicationId} not found`);
        return;
      }

      const update: ApplicationUpdatePayload = {
        applicationId,
        status: newStatus,
        previousStatus,
        message,
        timestamp: new Date()
      };

      // Send real-time update
      this.wsServer.sendApplicationUpdate(application.userId, update);

      // Create notification
      const notificationTitle = this.getNotificationTitle(newStatus, previousStatus);
      const notificationMessage = this.getNotificationMessage(
        newStatus,
        application.job.title,
        application.job.company?.name || 'Unknown Company',
        message
      );

      await this.notificationHandler.createAndSendNotification(
        application.userId,
        'application_update',
        notificationTitle,
        notificationMessage,
        {
          applicationId,
          jobId: application.jobId,
          newStatus,
          previousStatus
        }
      );

      logger.info(`Application ${applicationId} status updated and notification sent`);
    } catch (error) {
      logger.error('Error handling application status update:', error);
      throw error;
    }
  }

  private getNotificationTitle(newStatus: string, previousStatus: string): string {
    const statusTitles: Record<string, string> = {
      'submitted': 'Application Submitted',
      'under_review': 'Application Under Review',
      'shortlisted': 'Congratulations! You\'ve Been Shortlisted',
      'interview_scheduled': 'Interview Scheduled',
      'interviewed': 'Interview Completed',
      'offer_received': 'Job Offer Received!',
      'rejected': 'Application Update',
      'withdrawn': 'Application Withdrawn',
      'accepted': 'Offer Accepted'
    };

    return statusTitles[newStatus] || 'Application Status Update';
  }

  private getNotificationMessage(
    status: string,
    jobTitle: string,
    companyName: string,
    customMessage?: string
  ): string {
    if (customMessage) {
      return customMessage;
    }

    const messages: Record<string, string> = {
      'submitted': `Your application for ${jobTitle} at ${companyName} has been submitted successfully.`,
      'under_review': `Your application for ${jobTitle} at ${companyName} is now under review.`,
      'shortlisted': `Great news! You've been shortlisted for ${jobTitle} at ${companyName}.`,
      'interview_scheduled': `An interview has been scheduled for ${jobTitle} at ${companyName}.`,
      'interviewed': `Your interview for ${jobTitle} at ${companyName} has been marked as completed.`,
      'offer_received': `Congratulations! You've received an offer for ${jobTitle} at ${companyName}.`,
      'rejected': `Your application for ${jobTitle} at ${companyName} has been updated.`,
      'withdrawn': `Your application for ${jobTitle} at ${companyName} has been withdrawn.`,
      'accepted': `You've accepted the offer for ${jobTitle} at ${companyName}. Congratulations!`
    };

    return messages[status] || `Your application for ${jobTitle} at ${companyName} has been updated to: ${status}`;
  }

  async subscribeToApplication(userId: number, applicationId: number): Promise<boolean> {
    try {
      // Verify user owns the application
      const application = await prisma.jobApplication.findFirst({
        where: {
          id: applicationId,
          userId
        }
      });

      return !!application;
    } catch (error) {
      logger.error('Error subscribing to application:', error);
      return false;
    }
  }

  async getApplicationUpdates(applicationId: number, userId: number): Promise<any[]> {
    try {
      // Get application history
      const history = await prisma.applicationStatusHistory.findMany({
        where: {
          applicationId,
          application: {
            userId
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return history;
    } catch (error) {
      logger.error('Error fetching application updates:', error);
      throw error;
    }
  }
}