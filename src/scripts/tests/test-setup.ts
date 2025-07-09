#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { JobService } from '../services/job.service';
import logger from '../utils/logger';
import prisma from '../database/client';

// Load environment variables
dotenv.config();

async function testSetup() {
  logger.info('Testing application setup...');
  
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await prisma.$connect();
    logger.info('✅ Database connection successful');
    
    // Test JobService
    logger.info('Testing JobService...');
    const jobService = new JobService();
    
    // Get current stats
    const stats = await jobService.getScrapingStats();
    logger.info('✅ JobService working', {
      totalJobs: stats.totalJobs,
      portals: stats.jobsByPortal.length
    });
    
    // Test creating a sample job (for testing)
    const sampleJob = {
      title: 'Test Software Engineer Position',
      company: 'Test Company Ltd',
      location: 'Central, Hong Kong',
      description: 'This is a test job posting to verify the system is working correctly.',
      originalUrl: 'https://example.com/test-job',
      sourcePortal: 'Test Portal',
      jobCategory: 'Information Technology',
      employmentType: 'Full-time',
      experienceLevel: 'Mid Level',
      salaryMin: 25000,
      salaryMax: 35000,
      salaryCurrency: 'HKD'
    };
    
    const { job, isNew } = await jobService.saveJob(sampleJob);
    logger.info('✅ Job creation/update working', {
      jobId: job.id,
      isNew,
      title: job.title
    });
    
    // Test getting jobs with filters
    const jobsResult = await jobService.getJobs({}, 1, 5);
    logger.info('✅ Job retrieval working', {
      totalJobs: jobsResult.total,
      currentPage: jobsResult.page,
      jobsOnPage: jobsResult.data.length
    });
    
    logger.info('🎉 All tests passed! Application setup is working correctly.');
    
  } catch (error) {
    logger.error('❌ Setup test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSetup()
    .then(() => {
      logger.info('Setup test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Setup test failed:', error);
      process.exit(1);
    });
}

export { testSetup };
