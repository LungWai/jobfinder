import { EventEmitter } from 'events';
import logger from '../utils/logger';

export interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export type JobHandler<T = any> = (job: QueueJob<T>) => Promise<void>;

/**
 * Simple in-memory queue service
 * For production, consider using Bull or similar queue libraries
 */
export class QueueService extends EventEmitter {
  private jobs: Map<string, QueueJob> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startProcessing();
  }

  /**
   * Register a job handler
   */
  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
    logger.info(`Registered handler for job type: ${jobType}`);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = any>(type: string, data: T, options: { maxAttempts?: number } = {}): Promise<string> {
    const jobId = this.generateJobId();
    const job: QueueJob<T> = {
      id: jobId,
      type,
      data,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      status: 'pending',
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    this.emit('job:created', job);
    logger.info(`Job ${jobId} of type ${type} added to queue`);

    return jobId;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): QueueJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: QueueJob['status']): QueueJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Get jobs by type
   */
  getJobsByType(type: string): QueueJob[] {
    return Array.from(this.jobs.values()).filter(job => job.type === type);
  }

  /**
   * Start processing jobs
   */
  private startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      if (!this.processing) {
        this.processNextJob();
      }
    }, 1000); // Check for jobs every second
  }

  /**
   * Stop processing jobs
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process the next pending job
   */
  private async processNextJob(): Promise<void> {
    const pendingJobs = this.getJobsByStatus('pending');
    if (pendingJobs.length === 0) return;

    const job = pendingJobs[0];
    const handler = this.handlers.get(job.type);

    if (!handler) {
      logger.error(`No handler registered for job type: ${job.type}`);
      job.status = 'failed';
      job.error = 'No handler registered';
      job.failedAt = new Date();
      this.emit('job:failed', job);
      return;
    }

    this.processing = true;
    job.status = 'processing';
    job.processedAt = new Date();
    job.attempts++;
    this.emit('job:processing', job);

    try {
      logger.info(`Processing job ${job.id} of type ${job.type} (attempt ${job.attempts}/${job.maxAttempts})`);
      await handler(job);
      
      job.status = 'completed';
      job.completedAt = new Date();
      this.emit('job:completed', job);
      logger.info(`Job ${job.id} completed successfully`);
      
      // Clean up completed job after 1 hour
      setTimeout(() => {
        this.jobs.delete(job.id);
      }, 60 * 60 * 1000);
    } catch (error: any) {
      logger.error(`Job ${job.id} failed:`, error);
      job.error = error.message;

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.failedAt = new Date();
        this.emit('job:failed', job);
        logger.error(`Job ${job.id} failed after ${job.attempts} attempts`);
      } else {
        job.status = 'pending'; // Retry
        logger.info(`Job ${job.id} will be retried (${job.attempts}/${job.maxAttempts})`);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
  } {
    const jobs = Array.from(this.jobs.values());
    const stats = {
      total: jobs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      byType: {} as Record<string, number>
    };

    for (const job of jobs) {
      stats[job.status]++;
      stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear completed and failed jobs older than specified hours
   */
  async cleanupOldJobs(hoursOld: number = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursOld);
    
    let cleaned = 0;
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.createdAt < cutoffDate
      ) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    logger.info(`Cleaned up ${cleaned} old jobs`);
    return cleaned;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const queueService = new QueueService();