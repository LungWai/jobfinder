import { PrismaClient, ApplicationStatus, Prisma } from '@prisma/client';
import { 
  CreateApplicationInput, 
  UpdateApplicationInput, 
  ApplicationFilters,
  ApplicationStatistics,
  ServiceResponse,
  PaginatedResponse,
  STATUS_WORKFLOW
} from '../types/application';
import { logger } from '../utils/logger';

export class ApplicationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new job application
   */
  async createApplication(
    userId: string, 
    input: CreateApplicationInput
  ): ServiceResponse<any> {
    try {
      // Check if application already exists
      const existing = await this.prisma.jobApplication.findUnique({
        where: {
          userId_jobListingId: {
            userId,
            jobListingId: input.jobListingId
          }
        }
      });

      if (existing) {
        return {
          success: false,
          error: 'Application already exists for this job'
        };
      }

      // Verify job listing exists and is active
      const jobListing = await this.prisma.jobListing.findFirst({
        where: {
          id: input.jobListingId,
          isActive: true
        }
      });

      if (!jobListing) {
        return {
          success: false,
          error: 'Job listing not found or inactive'
        };
      }

      // Create application with status history
      const application = await this.prisma.jobApplication.create({
        data: {
          userId,
          jobListingId: input.jobListingId,
          status: input.status || ApplicationStatus.BOOKMARKED,
          appliedVia: input.appliedVia,
          applicationUrl: input.applicationUrl,
          applicationEmail: input.applicationEmail,
          coverLetter: input.coverLetter,
          customResume: input.customResume || false,
          resumeVersion: input.resumeVersion,
          notes: input.notes,
          bookmarkedAt: input.status === ApplicationStatus.BOOKMARKED ? new Date() : undefined,
          appliedAt: [ApplicationStatus.APPLIED, ApplicationStatus.APPLIED_EXTERNAL].includes(input.status || ApplicationStatus.BOOKMARKED) 
            ? new Date() 
            : undefined,
          statusHistory: {
            create: {
              toStatus: input.status || ApplicationStatus.BOOKMARKED,
              reason: 'Initial application created'
            }
          }
        },
        include: {
          jobListing: {
            include: {
              companyProfile: true,
              locationData: true
            }
          },
          statusHistory: true
        }
      });

      // Update job listing application count
      await this.prisma.jobListing.update({
        where: { id: input.jobListingId },
        data: { applicationCount: { increment: 1 } }
      });

      // Log activity
      await this.logActivity(userId, 'APPLICATION_CREATED', 'JobApplication', application.id, {
        jobTitle: jobListing.title,
        company: jobListing.company
      });

      return {
        success: true,
        data: application,
        message: 'Application created successfully'
      };
    } catch (error) {
      logger.error('Error creating application:', error);
      return {
        success: false,
        error: 'Failed to create application'
      };
    }
  }

  /**
   * Update an existing application
   */
  async updateApplication(
    userId: string,
    applicationId: string,
    input: UpdateApplicationInput
  ): ServiceResponse<any> {
    try {
      // Verify ownership
      const existing = await this.prisma.jobApplication.findFirst({
        where: {
          id: applicationId,
          userId
        }
      });

      if (!existing) {
        return {
          success: false,
          error: 'Application not found'
        };
      }

      // Validate status transition if status is being updated
      if (input.status && input.status !== existing.status) {
        const validTransition = await this.validateStatusTransition(
          existing.status,
          input.status
        );

        if (!validTransition) {
          return {
            success: false,
            error: `Invalid status transition from ${existing.status} to ${input.status}`
          };
        }
      }

      // Prepare update data
      const updateData: Prisma.JobApplicationUpdateInput = {
        ...input,
        updatedAt: new Date()
      };

      // Update timestamps based on status changes
      if (input.status) {
        if ([ApplicationStatus.APPLIED, ApplicationStatus.APPLIED_EXTERNAL].includes(input.status) && !existing.appliedAt) {
          updateData.appliedAt = new Date();
        }
        if (input.status === ApplicationStatus.IN_REVIEW && !existing.respondedAt) {
          updateData.respondedAt = new Date();
        }
      }

      // Update application
      const application = await this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: updateData,
        include: {
          jobListing: {
            include: {
              companyProfile: true,
              locationData: true
            }
          },
          interviews: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      // Add status history entry if status changed
      if (input.status && input.status !== existing.status) {
        await this.prisma.applicationStatusHistory.create({
          data: {
            applicationId,
            fromStatus: existing.status,
            toStatus: input.status,
            reason: input.notes || 'Status updated'
          }
        });
      }

      // Log activity
      await this.logActivity(userId, 'APPLICATION_UPDATED', 'JobApplication', applicationId, {
        changes: input
      });

      return {
        success: true,
        data: application,
        message: 'Application updated successfully'
      };
    } catch (error) {
      logger.error('Error updating application:', error);
      return {
        success: false,
        error: 'Failed to update application'
      };
    }
  }

  /**
   * Get user applications with filters
   */
  async getUserApplications(
    userId: string,
    filters: ApplicationFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<PaginatedResponse<any>>> {
    try {
      const where: Prisma.JobApplicationWhereInput = {
        userId,
        ...(filters.status && {
          status: Array.isArray(filters.status) 
            ? { in: filters.status }
            : filters.status
        }),
        ...(filters.jobTitle && {
          jobListing: {
            title: { contains: filters.jobTitle, mode: 'insensitive' }
          }
        }),
        ...(filters.company && {
          jobListing: {
            company: { contains: filters.company, mode: 'insensitive' }
          }
        }),
        ...(filters.appliedAfter && {
          appliedAt: { gte: filters.appliedAfter }
        }),
        ...(filters.appliedBefore && {
          appliedAt: { lte: filters.appliedBefore }
        }),
        ...(filters.hasInterview && {
          interviews: { some: {} }
        }),
        ...(filters.hasOffer && {
          status: ApplicationStatus.OFFER_RECEIVED
        })
      };

      // Get total count
      const total = await this.prisma.jobApplication.count({ where });

      // Get paginated results
      const applications = await this.prisma.jobApplication.findMany({
        where,
        include: {
          jobListing: {
            include: {
              companyProfile: true,
              locationData: true
            }
          },
          interviews: {
            orderBy: { scheduledAt: 'asc' },
            take: 1
          },
          documents: {
            where: { isActive: true }
          },
          reminders: {
            where: { 
              isCompleted: false,
              dueDate: { gte: new Date() }
            },
            orderBy: { dueDate: 'asc' },
            take: 1
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      return {
        success: true,
        data: {
          items: applications,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      logger.error('Error fetching user applications:', error);
      return {
        success: false,
        error: 'Failed to fetch applications'
      };
    }
  }

  /**
   * Get application statistics for a user
   */
  async getApplicationStatistics(userId: string): Promise<ServiceResponse<ApplicationStatistics>> {
    try {
      // Get all user applications
      const applications = await this.prisma.jobApplication.findMany({
        where: { userId },
        include: {
          interviews: true
        }
      });

      // Calculate statistics
      const stats: ApplicationStatistics = {
        total: applications.length,
        byStatus: {} as Record<ApplicationStatus, number>,
        responseRate: 0,
        averageResponseTime: 0,
        interviewConversionRate: 0,
        offerRate: 0,
        recentApplications: 0,
        upcomingInterviews: 0
      };

      // Count by status
      for (const status of Object.values(ApplicationStatus)) {
        stats.byStatus[status] = applications.filter(app => app.status === status).length;
      }

      // Calculate response rate
      const appliedCount = applications.filter(app => 
        [ApplicationStatus.APPLIED, ApplicationStatus.APPLIED_EXTERNAL].includes(app.status) ||
        app.appliedAt !== null
      ).length;
      
      const respondedCount = applications.filter(app => app.respondedAt !== null).length;
      stats.responseRate = appliedCount > 0 ? (respondedCount / appliedCount) * 100 : 0;

      // Calculate average response time
      const responseTimes = applications
        .filter(app => app.appliedAt && app.respondedAt)
        .map(app => app.respondedAt!.getTime() - app.appliedAt!.getTime());
      
      if (responseTimes.length > 0) {
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        stats.averageResponseTime = Math.round(avgTime / (1000 * 60 * 60 * 24)); // Convert to days
      }

      // Calculate interview conversion rate
      const interviewCount = applications.filter(app => app.interviews.length > 0).length;
      stats.interviewConversionRate = appliedCount > 0 ? (interviewCount / appliedCount) * 100 : 0;

      // Calculate offer rate
      const offerCount = stats.byStatus[ApplicationStatus.OFFER_RECEIVED] || 0;
      stats.offerRate = interviewCount > 0 ? (offerCount / interviewCount) * 100 : 0;

      // Count recent applications (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      stats.recentApplications = applications.filter(app => 
        app.createdAt > sevenDaysAgo
      ).length;

      // Count upcoming interviews
      const now = new Date();
      const upcomingInterviews = await this.prisma.interview.count({
        where: {
          application: { userId },
          scheduledAt: { gte: now },
          status: { in: ['SCHEDULED', 'RESCHEDULED'] }
        }
      });
      stats.upcomingInterviews = upcomingInterviews;

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Error calculating application statistics:', error);
      return {
        success: false,
        error: 'Failed to calculate statistics'
      };
    }
  }

  /**
   * Delete an application
   */
  async deleteApplication(userId: string, applicationId: string): ServiceResponse<void> {
    try {
      // Verify ownership
      const application = await this.prisma.jobApplication.findFirst({
        where: {
          id: applicationId,
          userId
        }
      });

      if (!application) {
        return {
          success: false,
          error: 'Application not found'
        };
      }

      // Delete application (cascade will handle related records)
      await this.prisma.jobApplication.delete({
        where: { id: applicationId }
      });

      // Update job listing application count
      await this.prisma.jobListing.update({
        where: { id: application.jobListingId },
        data: { applicationCount: { decrement: 1 } }
      });

      // Log activity
      await this.logActivity(userId, 'APPLICATION_DELETED', 'JobApplication', applicationId);

      return {
        success: true,
        message: 'Application deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting application:', error);
      return {
        success: false,
        error: 'Failed to delete application'
      };
    }
  }

  /**
   * Validate status transition
   */
  private async validateStatusTransition(
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus
  ): Promise<boolean> {
    const allowedTransitions = STATUS_WORKFLOW[fromStatus] || [];
    return allowedTransitions.includes(toStatus);
  }

  /**
   * Log user activity
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

  /**
   * Get application timeline
   */
  async getApplicationTimeline(userId: string, applicationId: string): ServiceResponse<any> {
    try {
      const application = await this.prisma.jobApplication.findFirst({
        where: {
          id: applicationId,
          userId
        },
        include: {
          statusHistory: {
            orderBy: { createdAt: 'asc' }
          },
          interviews: {
            orderBy: { scheduledAt: 'asc' },
            include: {
              interviewers: true
            }
          },
          reminders: {
            orderBy: { dueDate: 'asc' }
          }
        }
      });

      if (!application) {
        return {
          success: false,
          error: 'Application not found'
        };
      }

      // Build timeline events
      const timeline = [];

      // Add status changes
      for (const status of application.statusHistory) {
        timeline.push({
          type: 'status_change',
          date: status.createdAt,
          data: status
        });
      }

      // Add interviews
      for (const interview of application.interviews) {
        timeline.push({
          type: 'interview',
          date: interview.scheduledAt,
          data: interview
        });
      }

      // Add reminders
      for (const reminder of application.reminders) {
        timeline.push({
          type: 'reminder',
          date: reminder.dueDate,
          data: reminder
        });
      }

      // Sort by date
      timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

      return {
        success: true,
        data: {
          application,
          timeline
        }
      };
    } catch (error) {
      logger.error('Error fetching application timeline:', error);
      return {
        success: false,
        error: 'Failed to fetch timeline'
      };
    }
  }
}