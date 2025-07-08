import { PrismaClient, ReminderType, ApplicationStatus, Prisma } from '@prisma/client';
import { 
  CreateReminderInput,
  UpdateReminderInput,
  ReminderFilters,
  ServiceResponse,
  PaginatedResponse,
  AUTOMATED_REMINDERS,
  AutomatedReminderConfig
} from '../types/application';
import logger from '../utils/logger';
import { EmailService } from './email.service';

export class ReminderService {
  private emailService: EmailService;

  constructor(private prisma: PrismaClient) {
    this.emailService = new EmailService();
  }

  /**
   * Create a new reminder
   */
  async createReminder(
    userId: string,
    input: CreateReminderInput
  ): ServiceResponse<any> {
    try {
      // Validate application ownership if applicationId provided
      if (input.applicationId) {
        const application = await this.prisma.jobApplication.findFirst({
          where: {
            id: input.applicationId,
            userId
          }
        });

        if (!application) {
          return {
            success: false,
            error: 'Application not found'
          };
        }
      }

      // Validate interview ownership if interviewId provided
      if (input.interviewId) {
        const interview = await this.prisma.interview.findFirst({
          where: {
            id: input.interviewId,
            application: { userId }
          }
        });

        if (!interview) {
          return {
            success: false,
            error: 'Interview not found'
          };
        }
      }

      // Create reminder
      const reminder = await this.prisma.applicationReminder.create({
        data: {
          userId,
          applicationId: input.applicationId,
          interviewId: input.interviewId,
          type: input.type,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate
        },
        include: {
          application: {
            include: {
              jobListing: {
                select: {
                  title: true,
                  company: true
                }
              }
            }
          },
          interview: true
        }
      });

      // Log activity
      await this.logActivity(userId, 'REMINDER_CREATED', 'ApplicationReminder', reminder.id, {
        reminderType: input.type,
        dueDate: input.dueDate
      });

      return {
        success: true,
        data: reminder,
        message: 'Reminder created successfully'
      };
    } catch (error) {
      logger.error('Error creating reminder:', error);
      return {
        success: false,
        error: 'Failed to create reminder'
      };
    }
  }

  /**
   * Update an existing reminder
   */
  async updateReminder(
    userId: string,
    reminderId: string,
    input: UpdateReminderInput
  ): ServiceResponse<any> {
    try {
      // Verify ownership
      const existing = await this.prisma.applicationReminder.findFirst({
        where: {
          id: reminderId,
          userId
        }
      });

      if (!existing) {
        return {
          success: false,
          error: 'Reminder not found'
        };
      }

      // Update reminder
      const reminder = await this.prisma.applicationReminder.update({
        where: { id: reminderId },
        data: {
          ...input,
          completedAt: input.isCompleted === true && !existing.isCompleted 
            ? new Date() 
            : input.isCompleted === false 
            ? null 
            : existing.completedAt
        },
        include: {
          application: {
            include: {
              jobListing: {
                select: {
                  title: true,
                  company: true
                }
              }
            }
          },
          interview: true
        }
      });

      return {
        success: true,
        data: reminder,
        message: 'Reminder updated successfully'
      };
    } catch (error) {
      logger.error('Error updating reminder:', error);
      return {
        success: false,
        error: 'Failed to update reminder'
      };
    }
  }

  /**
   * Get user reminders with filters
   */
  async getUserReminders(
    userId: string,
    filters: ReminderFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<PaginatedResponse<any>>> {
    try {
      const where: Prisma.ApplicationReminderWhereInput = {
        userId,
        ...(filters.type && { type: filters.type }),
        ...(filters.isCompleted !== undefined && { isCompleted: filters.isCompleted }),
        ...(filters.isSnoozed !== undefined && { isSnoozed: filters.isSnoozed }),
        ...(filters.dueBefore && { dueDate: { lte: filters.dueBefore } }),
        ...(filters.dueAfter && { dueDate: { gte: filters.dueAfter } }),
        ...(filters.applicationId && { applicationId: filters.applicationId }),
        ...(filters.interviewId && { interviewId: filters.interviewId })
      };

      const total = await this.prisma.applicationReminder.count({ where });

      const reminders = await this.prisma.applicationReminder.findMany({
        where,
        include: {
          application: {
            include: {
              jobListing: {
                select: {
                  title: true,
                  company: true
                }
              }
            }
          },
          interview: {
            include: {
              application: {
                include: {
                  jobListing: {
                    select: {
                      title: true,
                      company: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { isCompleted: 'asc' },
          { dueDate: 'asc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      return {
        success: true,
        data: {
          items: reminders,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      logger.error('Error fetching user reminders:', error);
      return {
        success: false,
        error: 'Failed to fetch reminders'
      };
    }
  }

  /**
   * Get upcoming reminders
   */
  async getUpcomingReminders(
    userId: string,
    hours: number = 24
  ): ServiceResponse<any[]> {
    try {
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + hours);

      const reminders = await this.prisma.applicationReminder.findMany({
        where: {
          userId,
          isCompleted: false,
          isSnoozed: false,
          dueDate: {
            gte: new Date(),
            lte: endDate
          }
        },
        include: {
          application: {
            include: {
              jobListing: {
                select: {
                  title: true,
                  company: true
                }
              }
            }
          },
          interview: true
        },
        orderBy: { dueDate: 'asc' }
      });

      return {
        success: true,
        data: reminders
      };
    } catch (error) {
      logger.error('Error fetching upcoming reminders:', error);
      return {
        success: false,
        error: 'Failed to fetch upcoming reminders'
      };
    }
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder(
    userId: string,
    reminderId: string,
    snoozedUntil: Date
  ): ServiceResponse<any> {
    try {
      const reminder = await this.prisma.applicationReminder.findFirst({
        where: {
          id: reminderId,
          userId
        }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found'
        };
      }

      if (reminder.isCompleted) {
        return {
          success: false,
          error: 'Cannot snooze a completed reminder'
        };
      }

      const updatedReminder = await this.prisma.applicationReminder.update({
        where: { id: reminderId },
        data: {
          isSnoozed: true,
          snoozedUntil,
          dueDate: snoozedUntil
        }
      });

      return {
        success: true,
        data: updatedReminder,
        message: 'Reminder snoozed successfully'
      };
    } catch (error) {
      logger.error('Error snoozing reminder:', error);
      return {
        success: false,
        error: 'Failed to snooze reminder'
      };
    }
  }

  /**
   * Complete a reminder
   */
  async completeReminder(
    userId: string,
    reminderId: string
  ): ServiceResponse<any> {
    try {
      const reminder = await this.prisma.applicationReminder.findFirst({
        where: {
          id: reminderId,
          userId
        }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found'
        };
      }

      const updatedReminder = await this.prisma.applicationReminder.update({
        where: { id: reminderId },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      });

      return {
        success: true,
        data: updatedReminder,
        message: 'Reminder completed successfully'
      };
    } catch (error) {
      logger.error('Error completing reminder:', error);
      return {
        success: false,
        error: 'Failed to complete reminder'
      };
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(
    userId: string,
    reminderId: string
  ): ServiceResponse<void> {
    try {
      const reminder = await this.prisma.applicationReminder.findFirst({
        where: {
          id: reminderId,
          userId
        }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found'
        };
      }

      await this.prisma.applicationReminder.delete({
        where: { id: reminderId }
      });

      return {
        success: true,
        message: 'Reminder deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting reminder:', error);
      return {
        success: false,
        error: 'Failed to delete reminder'
      };
    }
  }

  /**
   * Create automated reminders based on application status changes
   */
  async createAutomatedReminders(
    userId: string,
    applicationId: string,
    newStatus: ApplicationStatus
  ): Promise<void> {
    try {
      const application = await this.prisma.jobApplication.findUnique({
        where: { id: applicationId },
        include: {
          jobListing: {
            select: {
              title: true,
              company: true
            }
          }
        }
      });

      if (!application) return;

      // Find applicable automated reminders
      const applicableReminders = AUTOMATED_REMINDERS.filter(
        config => config.trigger === newStatus
      );

      for (const config of applicableReminders) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + config.daysOffset);

        // Skip if due date is in the past
        if (dueDate < new Date()) continue;

        // Check if similar reminder already exists
        const existingReminder = await this.prisma.applicationReminder.findFirst({
          where: {
            userId,
            applicationId,
            type: config.type,
            isCompleted: false,
            dueDate: {
              gte: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000),
              lte: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        });

        if (!existingReminder) {
          await this.createReminder(userId, {
            applicationId,
            type: config.type,
            title: config.title.replace('{company}', application.jobListing.company),
            description: config.description.replace('{company}', application.jobListing.company),
            dueDate
          });
        }
      }
    } catch (error) {
      logger.error('Error creating automated reminders:', error);
    }
  }

  /**
   * Send reminder notifications (for scheduled job)
   */
  async sendReminderNotifications(): Promise<number> {
    try {
      // Get all due reminders that haven't been sent
      const dueReminders = await this.prisma.applicationReminder.findMany({
        where: {
          dueDate: { lte: new Date() },
          isCompleted: false,
          emailSent: false,
          user: {
            isActive: true,
            isVerified: true
          }
        },
        include: {
          user: true,
          application: {
            include: {
              jobListing: {
                select: {
                  title: true,
                  company: true
                }
              }
            }
          },
          interview: {
            include: {
              application: {
                include: {
                  jobListing: {
                    select: {
                      title: true,
                      company: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      let sentCount = 0;

      for (const reminder of dueReminders) {
        try {
          // Prepare email content
          let context = '';
          if (reminder.application) {
            context = `for ${reminder.application.jobListing.title} at ${reminder.application.jobListing.company}`;
          } else if (reminder.interview) {
            context = `for interview with ${reminder.interview.application.jobListing.company}`;
          }

          // Send email
          await this.emailService.sendReminderEmail(
            reminder.user.email,
            reminder.user.name || 'User',
            reminder.title,
            reminder.description || '',
            context
          );

          // Mark as sent
          await this.prisma.applicationReminder.update({
            where: { id: reminder.id },
            data: { emailSent: true }
          });

          sentCount++;
        } catch (error) {
          logger.error(`Error sending reminder ${reminder.id}:`, error);
        }
      }

      return sentCount;
    } catch (error) {
      logger.error('Error sending reminder notifications:', error);
      return 0;
    }
  }

  /**
   * Get reminder statistics
   */
  async getReminderStatistics(userId: string): ServiceResponse<any> {
    try {
      const reminders = await this.prisma.applicationReminder.findMany({
        where: { userId }
      });

      const now = new Date();
      const stats = {
        total: reminders.length,
        completed: reminders.filter(r => r.isCompleted).length,
        pending: reminders.filter(r => !r.isCompleted).length,
        overdue: reminders.filter(r => !r.isCompleted && r.dueDate < now).length,
        upcoming: reminders.filter(r => !r.isCompleted && r.dueDate >= now).length,
        snoozed: reminders.filter(r => r.isSnoozed && !r.isCompleted).length,
        byType: {} as Record<ReminderType, number>
      };

      // Count by type
      for (const type of Object.values(ReminderType)) {
        stats.byType[type] = reminders.filter(r => r.type === type).length;
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Error calculating reminder statistics:', error);
      return {
        success: false,
        error: 'Failed to calculate statistics'
      };
    }
  }

  /**
   * Bulk update reminders
   */
  async bulkUpdateReminders(
    userId: string,
    reminderIds: string[],
    update: { isCompleted?: boolean; isSnoozed?: boolean; snoozedUntil?: Date }
  ): ServiceResponse<number> {
    try {
      // Verify ownership
      const reminders = await this.prisma.applicationReminder.findMany({
        where: {
          id: { in: reminderIds },
          userId
        }
      });

      if (reminders.length !== reminderIds.length) {
        return {
          success: false,
          error: 'Some reminders not found or not owned by user'
        };
      }

      // Update reminders
      const result = await this.prisma.applicationReminder.updateMany({
        where: {
          id: { in: reminderIds },
          userId
        },
        data: {
          ...update,
          completedAt: update.isCompleted ? new Date() : undefined
        }
      });

      return {
        success: true,
        data: result.count,
        message: `${result.count} reminders updated`
      };
    } catch (error) {
      logger.error('Error bulk updating reminders:', error);
      return {
        success: false,
        error: 'Failed to update reminders'
      };
    }
  }

  /**
   * Log activity
   */
  private async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          metadata
        }
      });
    } catch (error) {
      logger.error('Error logging activity:', error);
    }
  }
}