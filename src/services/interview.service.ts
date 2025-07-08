import { PrismaClient, InterviewStatus, InterviewResult, Prisma } from '@prisma/client';
import { 
  CreateInterviewInput, 
  UpdateInterviewInput, 
  InterviewerInput,
  InterviewFilters,
  ServiceResponse,
  PaginatedResponse
} from '../types/application';
import { logger } from '../utils/logger';
import { ReminderService } from './reminder.service';

export class InterviewService {
  private reminderService: ReminderService;

  constructor(private prisma: PrismaClient) {
    this.reminderService = new ReminderService(prisma);
  }

  /**
   * Schedule a new interview
   */
  async scheduleInterview(
    userId: string,
    input: CreateInterviewInput
  ): ServiceResponse<any> {
    try {
      // Verify application ownership
      const application = await this.prisma.jobApplication.findFirst({
        where: {
          id: input.applicationId,
          userId
        },
        include: {
          jobListing: true
        }
      });

      if (!application) {
        return {
          success: false,
          error: 'Application not found'
        };
      }

      // Check for conflicting interviews
      const existingInterview = await this.prisma.interview.findFirst({
        where: {
          application: { userId },
          scheduledAt: {
            gte: new Date(input.scheduledAt.getTime() - 30 * 60 * 1000), // 30 minutes before
            lte: new Date(input.scheduledAt.getTime() + (input.duration || 60) * 60 * 1000) // Duration after
          },
          status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED] }
        }
      });

      if (existingInterview) {
        return {
          success: false,
          error: 'You have another interview scheduled at this time'
        };
      }

      // Create interview
      const interview = await this.prisma.interview.create({
        data: {
          applicationId: input.applicationId,
          type: input.type,
          round: input.round || 1,
          status: InterviewStatus.SCHEDULED,
          scheduledAt: input.scheduledAt,
          duration: input.duration,
          location: input.location,
          locationDetails: input.locationDetails,
          isOnline: input.isOnline || false,
          meetingUrl: input.meetingUrl,
          jobDescription: input.jobDescription,
          preparationNotes: input.preparationNotes,
          questionsToAsk: input.questionsToAsk || []
        },
        include: {
          application: {
            include: {
              jobListing: true
            }
          }
        }
      });

      // Update application status
      await this.prisma.jobApplication.update({
        where: { id: input.applicationId },
        data: { 
          status: 'INTERVIEW_SCHEDULED',
          statusHistory: {
            create: {
              fromStatus: application.status,
              toStatus: 'INTERVIEW_SCHEDULED',
              reason: 'Interview scheduled'
            }
          }
        }
      });

      // Create automated reminders
      await this.createInterviewReminders(userId, interview);

      // Log activity
      await this.logActivity(userId, 'INTERVIEW_SCHEDULED', 'Interview', interview.id, {
        jobTitle: application.jobListing.title,
        company: application.jobListing.company,
        interviewType: input.type
      });

      return {
        success: true,
        data: interview,
        message: 'Interview scheduled successfully'
      };
    } catch (error) {
      logger.error('Error scheduling interview:', error);
      return {
        success: false,
        error: 'Failed to schedule interview'
      };
    }
  }

  /**
   * Update interview details
   */
  async updateInterview(
    userId: string,
    interviewId: string,
    input: UpdateInterviewInput
  ): ServiceResponse<any> {
    try {
      // Verify ownership
      const existing = await this.prisma.interview.findFirst({
        where: {
          id: interviewId,
          application: { userId }
        },
        include: {
          application: {
            include: {
              jobListing: true
            }
          }
        }
      });

      if (!existing) {
        return {
          success: false,
          error: 'Interview not found'
        };
      }

      // Check if rescheduling conflicts with other interviews
      if (input.scheduledAt && input.scheduledAt !== existing.scheduledAt) {
        const conflictingInterview = await this.prisma.interview.findFirst({
          where: {
            id: { not: interviewId },
            application: { userId },
            scheduledAt: {
              gte: new Date(input.scheduledAt.getTime() - 30 * 60 * 1000),
              lte: new Date(input.scheduledAt.getTime() + (input.duration || existing.duration || 60) * 60 * 1000)
            },
            status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED] }
          }
        });

        if (conflictingInterview) {
          return {
            success: false,
            error: 'You have another interview scheduled at this time'
          };
        }
      }

      // Update interview
      const interview = await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          ...input,
          status: input.scheduledAt && input.scheduledAt !== existing.scheduledAt 
            ? InterviewStatus.RESCHEDULED 
            : input.status || existing.status,
          completedAt: input.status === InterviewStatus.COMPLETED ? new Date() : undefined
        },
        include: {
          application: {
            include: {
              jobListing: true
            }
          },
          interviewers: true
        }
      });

      // Update application status if interview is completed
      if (input.status === InterviewStatus.COMPLETED && existing.status !== InterviewStatus.COMPLETED) {
        await this.prisma.jobApplication.update({
          where: { id: existing.application.id },
          data: { 
            status: 'INTERVIEW_COMPLETED',
            statusHistory: {
              create: {
                fromStatus: existing.application.status,
                toStatus: 'INTERVIEW_COMPLETED',
                reason: 'Interview completed'
              }
            }
          }
        });
      }

      // Update reminders if rescheduled
      if (input.scheduledAt && input.scheduledAt !== existing.scheduledAt) {
        await this.updateInterviewReminders(userId, interview);
      }

      // Log activity
      await this.logActivity(userId, 'INTERVIEW_UPDATED', 'Interview', interviewId, {
        changes: input
      });

      return {
        success: true,
        data: interview,
        message: 'Interview updated successfully'
      };
    } catch (error) {
      logger.error('Error updating interview:', error);
      return {
        success: false,
        error: 'Failed to update interview'
      };
    }
  }

  /**
   * Add or update interviewers
   */
  async manageInterviewers(
    userId: string,
    interviewId: string,
    interviewers: InterviewerInput[]
  ): ServiceResponse<any> {
    try {
      // Verify ownership
      const interview = await this.prisma.interview.findFirst({
        where: {
          id: interviewId,
          application: { userId }
        }
      });

      if (!interview) {
        return {
          success: false,
          error: 'Interview not found'
        };
      }

      // Delete existing interviewers
      await this.prisma.interviewer.deleteMany({
        where: { interviewId }
      });

      // Create new interviewers
      const createdInterviewers = await this.prisma.interviewer.createMany({
        data: interviewers.map(interviewer => ({
          ...interviewer,
          interviewId
        }))
      });

      // Get updated interview with interviewers
      const updatedInterview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          interviewers: true
        }
      });

      return {
        success: true,
        data: updatedInterview,
        message: `${createdInterviewers.count} interviewers added`
      };
    } catch (error) {
      logger.error('Error managing interviewers:', error);
      return {
        success: false,
        error: 'Failed to manage interviewers'
      };
    }
  }

  /**
   * Add interview feedback
   */
  async addFeedback(
    userId: string,
    interviewId: string,
    feedback: {
      interviewNotes?: string;
      feedback?: string;
      rating?: number;
      result?: InterviewResult;
      nextSteps?: string;
    }
  ): ServiceResponse<any> {
    try {
      // Verify ownership
      const interview = await this.prisma.interview.findFirst({
        where: {
          id: interviewId,
          application: { userId }
        }
      });

      if (!interview) {
        return {
          success: false,
          error: 'Interview not found'
        };
      }

      // Validate rating
      if (feedback.rating && (feedback.rating < 1 || feedback.rating > 5)) {
        return {
          success: false,
          error: 'Rating must be between 1 and 5'
        };
      }

      // Update interview with feedback
      const updatedInterview = await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          ...feedback,
          status: InterviewStatus.COMPLETED,
          completedAt: interview.status !== InterviewStatus.COMPLETED ? new Date() : interview.completedAt
        },
        include: {
          application: {
            include: {
              jobListing: true
            }
          }
        }
      });

      // Log activity
      await this.logActivity(userId, 'INTERVIEW_FEEDBACK_ADDED', 'Interview', interviewId, {
        rating: feedback.rating,
        result: feedback.result
      });

      return {
        success: true,
        data: updatedInterview,
        message: 'Feedback added successfully'
      };
    } catch (error) {
      logger.error('Error adding interview feedback:', error);
      return {
        success: false,
        error: 'Failed to add feedback'
      };
    }
  }

  /**
   * Get user interviews with filters
   */
  async getUserInterviews(
    userId: string,
    filters: InterviewFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<PaginatedResponse<any>>> {
    try {
      const where: Prisma.InterviewWhereInput = {
        application: { userId },
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.scheduledAfter && { scheduledAt: { gte: filters.scheduledAfter } }),
        ...(filters.scheduledBefore && { scheduledAt: { lte: filters.scheduledBefore } }),
        ...(filters.result && { result: filters.result })
      };

      const total = await this.prisma.interview.count({ where });

      const interviews = await this.prisma.interview.findMany({
        where,
        include: {
          application: {
            include: {
              jobListing: {
                include: {
                  companyProfile: true,
                  locationData: true
                }
              }
            }
          },
          interviewers: true,
          reminders: {
            where: { isCompleted: false }
          }
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      return {
        success: true,
        data: {
          items: interviews,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      logger.error('Error fetching user interviews:', error);
      return {
        success: false,
        error: 'Failed to fetch interviews'
      };
    }
  }

  /**
   * Get upcoming interviews
   */
  async getUpcomingInterviews(
    userId: string,
    days: number = 7
  ): ServiceResponse<any[]> {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const interviews = await this.prisma.interview.findMany({
        where: {
          application: { userId },
          scheduledAt: {
            gte: new Date(),
            lte: endDate
          },
          status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED] }
        },
        include: {
          application: {
            include: {
              jobListing: {
                include: {
                  companyProfile: true,
                  locationData: true
                }
              }
            }
          },
          interviewers: true
        },
        orderBy: { scheduledAt: 'asc' }
      });

      return {
        success: true,
        data: interviews
      };
    } catch (error) {
      logger.error('Error fetching upcoming interviews:', error);
      return {
        success: false,
        error: 'Failed to fetch upcoming interviews'
      };
    }
  }

  /**
   * Cancel an interview
   */
  async cancelInterview(
    userId: string,
    interviewId: string,
    reason?: string
  ): ServiceResponse<void> {
    try {
      const interview = await this.prisma.interview.findFirst({
        where: {
          id: interviewId,
          application: { userId }
        }
      });

      if (!interview) {
        return {
          success: false,
          error: 'Interview not found'
        };
      }

      if (interview.status === InterviewStatus.COMPLETED) {
        return {
          success: false,
          error: 'Cannot cancel a completed interview'
        };
      }

      await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: InterviewStatus.CANCELLED,
          feedback: reason ? `Cancelled: ${reason}` : 'Interview cancelled'
        }
      });

      // Cancel related reminders
      await this.prisma.applicationReminder.updateMany({
        where: {
          interviewId,
          isCompleted: false
        },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      });

      // Log activity
      await this.logActivity(userId, 'INTERVIEW_CANCELLED', 'Interview', interviewId, {
        reason
      });

      return {
        success: true,
        message: 'Interview cancelled successfully'
      };
    } catch (error) {
      logger.error('Error cancelling interview:', error);
      return {
        success: false,
        error: 'Failed to cancel interview'
      };
    }
  }

  /**
   * Create automated interview reminders
   */
  private async createInterviewReminders(userId: string, interview: any): Promise<void> {
    try {
      const reminders = [
        {
          type: 'INTERVIEW_PREP' as const,
          title: 'Prepare for interview',
          description: `Interview with ${interview.application.jobListing.company} tomorrow`,
          dueDate: new Date(interview.scheduledAt.getTime() - 24 * 60 * 60 * 1000) // 1 day before
        },
        {
          type: 'INTERVIEW_DAY' as const,
          title: 'Interview today',
          description: `Interview with ${interview.application.jobListing.company} at ${interview.scheduledAt.toLocaleTimeString()}`,
          dueDate: new Date(interview.scheduledAt.getTime() - 2 * 60 * 60 * 1000) // 2 hours before
        }
      ];

      for (const reminder of reminders) {
        if (reminder.dueDate > new Date()) {
          await this.reminderService.createReminder(userId, {
            ...reminder,
            interviewId: interview.id
          });
        }
      }
    } catch (error) {
      logger.error('Error creating interview reminders:', error);
    }
  }

  /**
   * Update interview reminders when rescheduled
   */
  private async updateInterviewReminders(userId: string, interview: any): Promise<void> {
    try {
      // Cancel existing reminders
      await this.prisma.applicationReminder.updateMany({
        where: {
          interviewId: interview.id,
          isCompleted: false
        },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      });

      // Create new reminders
      await this.createInterviewReminders(userId, interview);
    } catch (error) {
      logger.error('Error updating interview reminders:', error);
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