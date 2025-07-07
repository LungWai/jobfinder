import { PrismaClient } from '@prisma/client';
import { JobListing, JobFilters, PaginatedResponse, ScrapingResult } from '../types/job';
import { generateJobHash } from '../utils/hash';
import logger from '../utils/logger';
import prisma from './client';

export class JobService {
  private db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  /**
   * Save or update a job listing
   */
  async saveJob(jobData: Partial<JobListing>): Promise<{ job: any; isNew: boolean }> {
    try {
      if (!jobData.contentHash) {
        jobData.contentHash = generateJobHash(jobData);
      }

      // Check if job already exists
      const existingJob = await this.db.jobListing.findUnique({
        where: { contentHash: jobData.contentHash }
      });

      if (existingJob) {
        // Update existing job
        const updatedJob = await this.db.jobListing.update({
          where: { id: existingJob.id },
          data: {
            ...jobData,
            lastScrapedAt: new Date(),
            scrapedCount: existingJob.scrapedCount + 1,
            updatedAt: new Date()
          }
        });
        return { job: updatedJob, isNew: false };
      } else {
        // Create new job
        const newJob = await this.db.jobListing.create({
          data: {
            title: jobData.title!,
            company: jobData.company!,
            location: jobData.location!,
            description: jobData.description!,
            originalUrl: jobData.originalUrl!,
            sourcePortal: jobData.sourcePortal!,
            contentHash: jobData.contentHash!,
            salaryMin: jobData.salaryMin,
            salaryMax: jobData.salaryMax,
            salaryCurrency: jobData.salaryCurrency || 'HKD',
            requirements: jobData.requirements,
            benefits: jobData.benefits,
            applicationDeadline: jobData.applicationDeadline,
            jobCategory: jobData.jobCategory,
            employmentType: jobData.employmentType,
            experienceLevel: jobData.experienceLevel,
            lastScrapedAt: new Date()
          }
        });
        return { job: newJob, isNew: true };
      }
    } catch (error) {
      logger.error('Error saving job:', error);
      throw error;
    }
  }

  /**
   * Get jobs with filtering and pagination
   */
  async getJobs(filters: JobFilters = {}, page: number = 1, limit: number = 20): Promise<PaginatedResponse<JobListing>> {
    try {
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {
        isActive: true
      };

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search } },
          { company: { contains: filters.search } },
          { description: { contains: filters.search } }
        ];
      }

      if (filters.category) {
        where.jobCategory = { contains: filters.category };
      }

      if (filters.location) {
        where.location = { contains: filters.location };
      }

      if (filters.portal) {
        where.sourcePortal = filters.portal;
      }

      if (filters.employmentType) {
        where.employmentType = filters.employmentType;
      }

      if (filters.experienceLevel) {
        where.experienceLevel = filters.experienceLevel;
      }

      if (filters.salaryMin || filters.salaryMax) {
        where.AND = [];
        if (filters.salaryMin) {
          where.AND.push({ salaryMin: { gte: filters.salaryMin } });
        }
        if (filters.salaryMax) {
          where.AND.push({ salaryMax: { lte: filters.salaryMax } });
        }
      }

      if (filters.datePosted) {
        const now = new Date();
        let dateThreshold: Date;
        
        switch (filters.datePosted) {
          case 'today':
            dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateThreshold = new Date(0);
        }
        
        where.createdAt = { gte: dateThreshold };
      }

      // Get total count
      const total = await this.db.jobListing.count({ where });

      // Get jobs
      const jobs = await this.db.jobListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      return {
        data: jobs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting jobs:', error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJobById(id: string): Promise<JobListing | null> {
    try {
      return await this.db.jobListing.findUnique({
        where: { id }
      });
    } catch (error) {
      logger.error('Error getting job by ID:', error);
      throw error;
    }
  }

  /**
   * Log scraping result
   */
  async logScrapingResult(result: ScrapingResult): Promise<void> {
    try {
      await this.db.scrapingLog.create({
        data: {
          portal: result.portal,
          status: result.success ? 'SUCCESS' : 'ERROR',
          jobsScraped: result.jobsScraped,
          jobsNew: result.jobsNew,
          jobsUpdated: result.jobsUpdated,
          errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
          startTime: new Date(Date.now() - result.duration * 1000),
          endTime: new Date(),
          duration: result.duration
        }
      });
    } catch (error) {
      logger.error('Error logging scraping result:', error);
    }
  }

  /**
   * Get scraping statistics
   */
  async getScrapingStats(): Promise<any> {
    try {
      const totalJobs = await this.db.jobListing.count({ where: { isActive: true } });
      const jobsByPortal = await this.db.jobListing.groupBy({
        by: ['sourcePortal'],
        where: { isActive: true },
        _count: { id: true }
      });

      const recentLogs = await this.db.scrapingLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      const lastUpdate = await this.db.jobListing.findFirst({
        orderBy: { lastScrapedAt: 'desc' },
        select: { lastScrapedAt: true }
      });

      return {
        totalJobs,
        jobsByPortal,
        recentLogs,
        lastUpdate: lastUpdate?.lastScrapedAt
      };
    } catch (error) {
      logger.error('Error getting scraping stats:', error);
      throw error;
    }
  }

  /**
   * Deactivate old jobs (older than specified days)
   */
  async deactivateOldJobs(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await this.db.jobListing.updateMany({
        where: {
          lastScrapedAt: { lt: cutoffDate },
          isActive: true
        },
        data: { isActive: false }
      });

      logger.info(`Deactivated ${result.count} old jobs`);
      return result.count;
    } catch (error) {
      logger.error('Error deactivating old jobs:', error);
      throw error;
    }
  }
}
