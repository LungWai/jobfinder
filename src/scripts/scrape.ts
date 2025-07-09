#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { ScraperManager } from '../scrapers/scraper-manager';
import { JobService } from '../services/job.service';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

async function runScraping(portal?: string) {
  const jobService = new JobService();
  const scraperManager = new ScraperManager();

  logger.info('Starting job scraping process...');

  try {
    let results;

    if (portal) {
      logger.info(`Running ${portal} scraper...`);
      const result = await scraperManager.runScraper(portal);
      results = [result];
    } else {
      logger.info('Running all scrapers...');
      results = await scraperManager.runAllScrapers();
    }

    // Summary
    const totalJobs = results.reduce((sum, result) => sum + result.jobsScraped, 0);
    const successfulScrapers = results.filter(result => result.success).length;

    logger.info('Scraping completed', {
      totalJobs,
      successfulScrapers,
      totalScrapers: results.length,
      results: results.map(r => ({
        portal: r.portal,
        success: r.success,
        jobsScraped: r.jobsScraped,
        duration: r.duration,
        errors: r.errors.length
      }))
    });

    // Clean up old jobs (optional)
    const deactivatedCount = await jobService.deactivateOldJobs(30);
    logger.info(`Deactivated ${deactivatedCount} old jobs`);

  } catch (error) {
    logger.error('Fatal error during scraping:', error);
    process.exit(1);
  }
}

// Run the scraping if this script is executed directly
if (require.main === module) {
  const portal = process.argv[2]; // Optional portal argument

  runScraping(portal)
    .then(() => {
      logger.info('Scraping process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Scraping process failed:', error);
      process.exit(1);
    });
}

export { runScraping };
