import { prisma } from '../../../database/client';
import logger from '../../../utils/logger';
import WebSocketServer, { InterviewReminderPayload } from '../index';
import { NotificationHandler } from './notificationHandler';
import { scheduleJob, Job } from 'node-schedule';

interface ScheduledReminder {
  interviewId: number;
  userId: number;
  reminderTime: Date;
  job?: Job;
}

export class InterviewHandler {
  private notificationHandler: NotificationHandler;
  private scheduledReminders: Map<string, ScheduledReminder> = new Map();

  constructor(private wsServer: WebSocketServer) {
    this.notificationHandler = new NotificationHandler(wsServer);
    this.initializeReminders();
  }

  private async initializeReminders() {
    try {
      // Load upcoming interviews and schedule reminders
      const upcomingInterviews = await prisma.interview.findMany({
        where: {
          scheduledAt: {
            gte: new Date()
          },
          status: 'scheduled'
        },
        include: {
          application: {
            include: {
              job: {
                include: {
                  company: true
                }
              },
              user: true
            }
          }
        }
      });

      for (const interview of upcomingInterviews) {
        await this.scheduleInterviewReminders(interview);
      }

      logger.info(`Initialized ${upcomingInterviews.length} interview reminders`);
    } catch (error) {
      logger.error('Error initializing interview reminders:', error);
    }
  }

  async scheduleInterviewReminders(interview: any, reminderMinutes: number[] = [1440, 60, 15]) {
    try {
      const application = interview.application;
      const userId = application.userId;

      // Clear existing reminders for this interview
      this.clearInterviewReminders(interview.id);

      // Schedule reminders at specified intervals
      for (const minutes of reminderMinutes) {
        const reminderTime = new Date(interview.scheduledAt.getTime() - minutes * 60 * 1000);
        
        if (reminderTime > new Date()) {
          const reminderKey = `${interview.id}-${minutes}`;
          
          const job = scheduleJob(reminderTime, async () => {
            await this.sendInterviewReminder(
              userId,
              interview,
              application,
              minutes
            );
          });

          this.scheduledReminders.set(reminderKey, {
            interviewId: interview.id,
            userId,
            reminderTime,
            job
          });

          logger.info(`Scheduled interview reminder for interview ${interview.id} at ${reminderTime}`);
        }
      }
    } catch (error) {
      logger.error('Error scheduling interview reminders:', error);
    }
  }

  private async sendInterviewReminder(
    userId: number,
    interview: any,
    application: any,
    minutesBefore: number
  ) {
    try {
      const reminder: InterviewReminderPayload = {
        interviewId: interview.id,
        applicationId: application.id,
        companyName: application.job.company?.name || 'Unknown Company',
        position: application.job.title,
        scheduledAt: interview.scheduledAt,
        location: interview.location,
        type: 'upcoming'
      };

      // Send WebSocket event
      this.wsServer.sendInterviewReminder(userId, reminder);

      // Create notification
      const timeString = this.getTimeString(minutesBefore);
      await this.notificationHandler.createAndSendNotification(
        userId,
        'interview_reminder',
        `Interview Reminder: ${timeString}`,
        `Your interview for ${reminder.position} at ${reminder.companyName} is ${timeString.toLowerCase()}.`,
        {
          interviewId: interview.id,
          applicationId: application.id,
          scheduledAt: interview.scheduledAt,
          location: interview.location,
          minutesBefore
        }
      );

      logger.info(`Interview reminder sent for interview ${interview.id} (${minutesBefore} minutes before)`);
    } catch (error) {
      logger.error('Error sending interview reminder:', error);
    }
  }

  private getTimeString(minutes: number): string {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return days === 1 ? 'Tomorrow' : `In ${days} days`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return hours === 1 ? 'In 1 hour' : `In ${hours} hours`;
    } else {
      return `In ${minutes} minutes`;
    }
  }

  async handleInterviewRescheduled(
    interviewId: number,
    newScheduledAt: Date,
    previousScheduledAt: Date
  ) {
    try {
      const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              job: {
                include: {
                  company: true
                }
              },
              user: true
            }
          }
        }
      });

      if (!interview) {
        logger.error(`Interview ${interviewId} not found`);
        return;
      }

      // Clear old reminders
      this.clearInterviewReminders(interviewId);

      // Schedule new reminders
      await this.scheduleInterviewReminders({
        ...interview,
        scheduledAt: newScheduledAt
      });

      // Send rescheduled notification
      const reminder: InterviewReminderPayload = {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        companyName: interview.application.job.company?.name || 'Unknown Company',
        position: interview.application.job.title,
        scheduledAt: newScheduledAt,
        location: interview.location,
        type: 'rescheduled'
      };

      this.wsServer.sendInterviewReminder(interview.application.userId, reminder);

      await this.notificationHandler.createAndSendNotification(
        interview.application.userId,
        'interview_reminder',
        'Interview Rescheduled',
        `Your interview for ${reminder.position} at ${reminder.companyName} has been rescheduled to ${newScheduledAt.toLocaleString()}.`,
        {
          interviewId: interview.id,
          applicationId: interview.applicationId,
          previousScheduledAt,
          newScheduledAt
        }
      );
    } catch (error) {
      logger.error('Error handling interview reschedule:', error);
    }
  }

  async handleInterviewCancelled(interviewId: number) {
    try {
      const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              job: {
                include: {
                  company: true
                }
              },
              user: true
            }
          }
        }
      });

      if (!interview) {
        logger.error(`Interview ${interviewId} not found`);
        return;
      }

      // Clear reminders
      this.clearInterviewReminders(interviewId);

      // Send cancellation notification
      const reminder: InterviewReminderPayload = {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        companyName: interview.application.job.company?.name || 'Unknown Company',
        position: interview.application.job.title,
        scheduledAt: interview.scheduledAt,
        location: interview.location,
        type: 'cancelled'
      };

      this.wsServer.sendInterviewReminder(interview.application.userId, reminder);

      await this.notificationHandler.createAndSendNotification(
        interview.application.userId,
        'interview_reminder',
        'Interview Cancelled',
        `Your interview for ${reminder.position} at ${reminder.companyName} has been cancelled.`,
        {
          interviewId: interview.id,
          applicationId: interview.applicationId
        }
      );
    } catch (error) {
      logger.error('Error handling interview cancellation:', error);
    }
  }

  private clearInterviewReminders(interviewId: number) {
    const keysToDelete: string[] = [];
    
    this.scheduledReminders.forEach((reminder, key) => {
      if (reminder.interviewId === interviewId) {
        if (reminder.job) {
          reminder.job.cancel();
        }
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.scheduledReminders.delete(key));
    logger.info(`Cleared ${keysToDelete.length} reminders for interview ${interviewId}`);
  }

  async updateReminderPreferences(userId: number, preferences: {
    enableReminders: boolean;
    reminderTimes: number[];
  }) {
    try {
      // Update user preferences (you might want to store this in the database)
      logger.info(`Updated reminder preferences for user ${userId}:`, preferences);

      // Reschedule existing reminders with new preferences
      if (preferences.enableReminders) {
        const userInterviews = await prisma.interview.findMany({
          where: {
            application: {
              userId
            },
            scheduledAt: {
              gte: new Date()
            },
            status: 'scheduled'
          },
          include: {
            application: {
              include: {
                job: {
                  include: {
                    company: true
                  }
                },
                user: true
              }
            }
          }
        });

        for (const interview of userInterviews) {
          await this.scheduleInterviewReminders(interview, preferences.reminderTimes);
        }
      } else {
        // Clear all reminders for this user
        this.scheduledReminders.forEach((reminder, key) => {
          if (reminder.userId === userId) {
            if (reminder.job) {
              reminder.job.cancel();
            }
            this.scheduledReminders.delete(key);
          }
        });
      }
    } catch (error) {
      logger.error('Error updating reminder preferences:', error);
      throw error;
    }
  }
}