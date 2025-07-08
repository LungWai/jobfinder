import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { queueService } from './queue.service';
import { emailService } from './email.service';
import { ReminderService } from './reminder.service';
import { ScraperManager } from '../scrapers/scraper-manager';
import { JobService } from '../database/job-service';
import path from 'path';
import fs from 'fs/promises';

interface ScheduledTask {
  name: string;
  schedule: string;
  description: string;
  handler: () => Promise<void>;
  cronJob?: cron.ScheduledTask;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private prisma: PrismaClient;
  private reminderService: ReminderService;
  private scraperManager: ScraperManager;
  private jobService: JobService;
  private isRunning: boolean = false;

  constructor() {
    this.prisma = new PrismaClient();
    this.reminderService = new ReminderService(this.prisma);
    this.scraperManager = new ScraperManager();
    this.jobService = new JobService();
    
    this.initializeTasks();
    this.registerQueueHandlers();
  }

  /**
   * Initialize all scheduled tasks
   */
  private initializeTasks(): void {
    // Daily scraping job at 3 AM
    this.addTask({
      name: 'daily-scraping',
      schedule: '0 3 * * *', // 3:00 AM every day
      description: 'Run all job scrapers daily at 3 AM',
      enabled: true,
      handler: async () => {
        logger.info('Starting scheduled daily scraping');
        await queueService.addJob('scraping', { type: 'all' });
      }
    });

    // Interview reminder dispatch (every 30 minutes)
    this.addTask({
      name: 'interview-reminders',
      schedule: '*/30 * * * *', // Every 30 minutes
      description: 'Check and send interview reminders 1 hour before',
      enabled: true,
      handler: async () => {
        logger.info('Checking for upcoming interviews');
        await queueService.addJob('interview-reminders', {});
      }
    });

    // Job alert emails (daily at 9 AM)
    this.addTask({
      name: 'job-alerts',
      schedule: '0 9 * * *', // 9:00 AM every day
      description: 'Send daily job alert emails to subscribed users',
      enabled: true,
      handler: async () => {
        logger.info('Starting daily job alerts');
        await queueService.addJob('job-alerts', {});
      }
    });

    // Application follow-up reminders (daily at 10 AM)
    this.addTask({
      name: 'follow-up-reminders',
      schedule: '0 10 * * *', // 10:00 AM every day
      description: 'Send application follow-up reminders',
      enabled: true,
      handler: async () => {
        logger.info('Checking for follow-up reminders');
        await queueService.addJob('follow-up-reminders', {});
      }
    });

    // General reminder notifications (every hour)
    this.addTask({
      name: 'reminder-notifications',
      schedule: '0 * * * *', // Every hour
      description: 'Send due reminder notifications',
      enabled: true,
      handler: async () => {
        logger.info('Sending reminder notifications');
        await queueService.addJob('reminder-notifications', {});
      }
    });

    // Cleanup old logs (daily at 2 AM)
    this.addTask({
      name: 'cleanup-logs',
      schedule: '0 2 * * *', // 2:00 AM every day
      description: 'Clean up old log files',
      enabled: true,
      handler: async () => {
        logger.info('Starting log cleanup');
        await queueService.addJob('cleanup-logs', { daysToKeep: 30 });
      }
    });

    // Cleanup completed jobs (weekly on Sunday at 1 AM)
    this.addTask({
      name: 'cleanup-jobs',
      schedule: '0 1 * * 0', // 1:00 AM every Sunday
      description: 'Clean up old completed and expired jobs',
      enabled: true,
      handler: async () => {
        logger.info('Starting job cleanup');
        await queueService.addJob('cleanup-jobs', { daysOld: 90 });
      }
    });

    // Queue cleanup (every 6 hours)
    this.addTask({
      name: 'cleanup-queue',
      schedule: '0 */6 * * *', // Every 6 hours
      description: 'Clean up old queue jobs',
      enabled: true,
      handler: async () => {
        logger.info('Cleaning up old queue jobs');
        await queueService.cleanupOldJobs(24);
      }
    });
  }

  /**
   * Register queue job handlers
   */
  private registerQueueHandlers(): void {
    // Scraping handler
    queueService.registerHandler('scraping', async (job) => {
      const { type } = job.data;
      if (type === 'all') {
        await this.scraperManager.runAllScrapers();
      } else {
        await this.scraperManager.runScraper(type);
      }
    });

    // Interview reminders handler
    queueService.registerHandler('interview-reminders', async () => {
      const oneHourFromNow = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

      const interviews = await this.prisma.interview.findMany({
        where: {
          scheduledAt: {
            gte: new Date(),
            lte: oneHourFromNow
          },
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
          reminderSent: false
        },
        include: {
          application: {
            include: {
              user: true,
              jobListing: true
            }
          }
        }
      });

      for (const interview of interviews) {
        try {
          await emailService.sendInterviewReminderEmail(
            interview.application.user.email,
            interview.application.user.name || 'User',
            {
              company: interview.application.jobListing.company,
              position: interview.application.jobListing.title,
              date: interview.scheduledAt,
              time: interview.scheduledAt.toLocaleTimeString(),
              location: interview.location || undefined,
              type: interview.isOnline ? 'video' : 'in_person',
              notes: interview.preparationNotes || undefined,
              meetingLink: interview.meetingUrl || undefined
            }
          );

          // Mark reminder as sent
          await this.prisma.interview.update({
            where: { id: interview.id },
            data: { reminderSent: true }
          });

          logger.info(`Interview reminder sent for interview ${interview.id}`);
        } catch (error) {
          logger.error(`Failed to send interview reminder for ${interview.id}:`, error);
        }
      }
    });

    // Job alerts handler
    queueService.registerHandler('job-alerts', async () => {
      // Get users with active job alerts
      const users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          isVerified: true,
          profile: {
            preferences: {
              path: ['emailNotifications', 'jobAlerts'],
              equals: true
            }
          }
        },
        include: {
          savedSearches: {
            where: { alertEnabled: true }
          }
        }
      });

      for (const user of users) {
        for (const search of user.savedSearches) {
          try {
            // Get new jobs matching the search criteria
            const newJobs = await this.prisma.jobListing.findMany({
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                },
                isActive: true,
                ...(search.searchQuery as any) // Assumes searchQuery is stored as Prisma where clause
              },
              take: 10,
              orderBy: { createdAt: 'desc' }
            });

            if (newJobs.length > 0) {
              await emailService.sendJobAlertEmail(
                user.email,
                user.name || 'User',
                newJobs.map(job => ({
                  id: job.id,
                  title: job.title,
                  company: job.company,
                  location: job.location || 'Not specified',
                  salary: job.salary || undefined,
                  postedDate: job.createdAt
                })),
                search.name
              );

              logger.info(`Job alert sent to ${user.email} for search "${search.name}"`);
            }
          } catch (error) {
            logger.error(`Failed to send job alert to ${user.email}:`, error);
          }
        }
      }
    });

    // Follow-up reminders handler
    queueService.registerHandler('follow-up-reminders', async () => {
      // Find applications that need follow-up
      const applicationsNeedingFollowUp = await this.prisma.jobApplication.findMany({
        where: {
          status: { in: ['APPLIED', 'UNDER_REVIEW'] },
          createdAt: {
            lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Applied more than 7 days ago
          },
          user: {
            isActive: true,
            isVerified: true
          }
        },
        include: {
          user: true,
          jobListing: true,
          reminders: {
            where: {
              type: 'FOLLOW_UP',
              isCompleted: false
            }
          }
        }
      });

      for (const application of applicationsNeedingFollowUp) {
        // Skip if already has a pending follow-up reminder
        if (application.reminders.length > 0) continue;

        try {
          // Create follow-up reminder
          await this.reminderService.createReminder(application.userId, {
            applicationId: application.id,
            type: 'FOLLOW_UP',
            title: `Follow up on ${application.jobListing.title} application`,
            description: `It's been a week since you applied to ${application.jobListing.company}. Consider following up on your application.`,
            dueDate: new Date()
          });

          logger.info(`Follow-up reminder created for application ${application.id}`);
        } catch (error) {
          logger.error(`Failed to create follow-up reminder for application ${application.id}:`, error);
        }
      }
    });

    // Reminder notifications handler
    queueService.registerHandler('reminder-notifications', async () => {
      const sentCount = await this.reminderService.sendReminderNotifications();
      logger.info(`Sent ${sentCount} reminder notifications`);
    });

    // Log cleanup handler
    queueService.registerHandler('cleanup-logs', async (job) => {
      const { daysToKeep = 30 } = job.data;
      const logsDir = path.join(process.cwd(), 'logs');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      try {
        const files = await fs.readdir(logsDir);
        let deletedCount = 0;

        for (const file of files) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate && file.endsWith('.log')) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }

        logger.info(`Cleaned up ${deletedCount} old log files`);
      } catch (error) {
        logger.error('Failed to clean up logs:', error);
      }
    });

    // Job cleanup handler
    queueService.registerHandler('cleanup-jobs', async (job) => {
      const { daysOld = 90 } = job.data;
      const deactivatedCount = await this.jobService.deactivateOldJobs(daysOld);
      logger.info(`Deactivated ${deactivatedCount} old job listings`);
    });
  }

  /**
   * Add a scheduled task
   */
  private addTask(taskConfig: Omit<ScheduledTask, 'cronJob' | 'lastRun' | 'nextRun'>): void {
    const task: ScheduledTask = {
      ...taskConfig,
      lastRun: undefined,
      nextRun: undefined
    };

    this.tasks.set(task.name, task);
    logger.info(`Scheduled task "${task.name}" registered: ${task.description}`);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    for (const [name, task] of this.tasks) {
      if (!task.enabled) {
        logger.info(`Task "${name}" is disabled, skipping`);
        continue;
      }

      try {
        task.cronJob = cron.schedule(task.schedule, async () => {
          logger.info(`Executing scheduled task: ${name}`);
          task.lastRun = new Date();
          
          try {
            await task.handler();
          } catch (error) {
            logger.error(`Error executing task "${name}":`, error);
          }
        }, {
          scheduled: true,
          timezone: process.env.TZ || 'Asia/Hong_Kong'
        });

        logger.info(`Task "${name}" scheduled with cron: ${task.schedule}`);
      } catch (error) {
        logger.error(`Failed to schedule task "${name}":`, error);
      }
    }

    this.isRunning = true;
    logger.info('Scheduler service started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    for (const [name, task] of this.tasks) {
      if (task.cronJob) {
        task.cronJob.stop();
        logger.info(`Task "${name}" stopped`);
      }
    }

    this.isRunning = false;
    logger.info('Scheduler service stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    tasks: Array<{
      name: string;
      schedule: string;
      description: string;
      enabled: boolean;
      lastRun?: Date;
      nextRun?: Date;
    }>;
    queueStats: ReturnType<typeof queueService.getStats>;
  } {
    const tasks = Array.from(this.tasks.values()).map(task => ({
      name: task.name,
      schedule: task.schedule,
      description: task.description,
      enabled: task.enabled,
      lastRun: task.lastRun,
      nextRun: task.nextRun
    }));

    return {
      isRunning: this.isRunning,
      tasks,
      queueStats: queueService.getStats()
    };
  }

  /**
   * Manually trigger a task
   */
  async triggerTask(taskName: string): Promise<void> {
    const task = this.tasks.get(taskName);
    if (!task) {
      throw new Error(`Task "${taskName}" not found`);
    }

    logger.info(`Manually triggering task: ${taskName}`);
    await task.handler();
  }

  /**
   * Enable or disable a task
   */
  setTaskEnabled(taskName: string, enabled: boolean): void {
    const task = this.tasks.get(taskName);
    if (!task) {
      throw new Error(`Task "${taskName}" not found`);
    }

    task.enabled = enabled;

    if (this.isRunning) {
      if (enabled && !task.cronJob) {
        // Start the task
        task.cronJob = cron.schedule(task.schedule, async () => {
          logger.info(`Executing scheduled task: ${taskName}`);
          task.lastRun = new Date();
          await task.handler();
        }, {
          scheduled: true,
          timezone: process.env.TZ || 'Asia/Hong_Kong'
        });
      } else if (!enabled && task.cronJob) {
        // Stop the task
        task.cronJob.stop();
        task.cronJob = undefined;
      }
    }

    logger.info(`Task "${taskName}" ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();