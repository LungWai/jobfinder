import express from 'express';
import { JobService } from '../../database/job-service';
import { ScraperManager } from '../../scrapers/scraper-manager';
import { seedJobs } from '../../scripts/seed-jobs';
import logger from '../../utils/logger';

const router = express.Router();
const jobService = new JobService();
const scraperManager = new ScraperManager();

/**
 * POST /api/scraping/trigger
 * Manually trigger scraping for a specific portal or all portals
 */
router.post('/trigger', async (req, res) => {
  try {
    const { portal } = req.body;
    
    if (portal && !['jobsdb', 'goodjobs', 'recruit', 'university', 'all'].includes(portal.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid portal',
        message: 'Portal must be one of: jobsdb, goodjobs, recruit, university, all'
      });
    }

    // Run scraping in background (don't wait for completion)
    setImmediate(async () => {
      try {
        if (!portal || portal.toLowerCase() === 'all') {
          logger.info('Starting manual scraping for all portals');
          await scraperManager.runAllScrapers();
        } else {
          logger.info(`Starting manual scraping for ${portal}`);
          await scraperManager.runScraper(portal.toLowerCase());
        }
        logger.info('Manual scraping completed');
      } catch (error) {
        logger.error('Manual scraping failed:', error);
      }
    });

    res.json({
      message: 'Scraping job started',
      portal: portal || 'all',
      status: 'initiated',
      availablePortals: scraperManager.getAvailableScrapers()
    });
  } catch (error) {
    logger.error('Error triggering scraping:', error);
    res.status(500).json({
      error: 'Failed to trigger scraping',
      message: 'An error occurred while starting the scraping job'
    });
  }
});

/**
 * GET /api/scraping/status
 * Get current scraping status and recent logs
 */
router.get('/status', async (req, res) => {
  try {
    const stats = await jobService.getScrapingStats();
    
    res.json({
      lastUpdate: stats.lastUpdate,
      totalJobs: stats.totalJobs,
      jobsByPortal: stats.jobsByPortal,
      recentLogs: stats.recentLogs.slice(0, 5), // Only return last 5 logs
      status: 'active' // In a real implementation, this would check if scraping is currently running
    });
  } catch (error) {
    logger.error('Error getting scraping status:', error);
    res.status(500).json({
      error: 'Failed to fetch scraping status',
      message: 'An error occurred while fetching scraping status'
    });
  }
});

/**
 * GET /api/scraping/logs
 * Get detailed scraping logs with pagination
 */
router.get('/logs', async (req, res) => {
  try {
    const { page = '1', limit = '20', portal } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        message: 'Page must be >= 1 and limit must be between 1 and 100'
      });
    }

    // This would be implemented in the JobService
    // For now, return a simple response
    res.json({
      data: [],
      total: 0,
      page: pageNum,
      limit: limitNum,
      totalPages: 0,
      message: 'Detailed logs endpoint not yet implemented'
    });
  } catch (error) {
    logger.error('Error getting scraping logs:', error);
    res.status(500).json({
      error: 'Failed to fetch scraping logs',
      message: 'An error occurred while fetching scraping logs'
    });
  }
});

/**
 * POST /api/scraping/cleanup
 * Clean up old job listings
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    
    if (typeof daysOld !== 'number' || daysOld < 1 || daysOld > 365) {
      return res.status(400).json({
        error: 'Invalid daysOld parameter',
        message: 'daysOld must be a number between 1 and 365'
      });
    }

    const deactivatedCount = await jobService.deactivateOldJobs(daysOld);
    
    res.json({
      message: 'Cleanup completed',
      deactivatedJobs: deactivatedCount,
      daysOld
    });
  } catch (error) {
    logger.error('Error during cleanup:', error);
    res.status(500).json({
      error: 'Failed to cleanup old jobs',
      message: 'An error occurred while cleaning up old job listings'
    });
  }
});

/**
 * POST /api/scraping/seed
 * Seed the database with sample job data (alternative to scraping)
 */
router.post('/seed', async (req, res) => {
  try {
    logger.info('Starting manual job seeding...');

    await seedJobs();

    const stats = await jobService.getScrapingStats();

    res.json({
      message: 'Database seeded successfully with sample job data',
      totalJobs: stats.totalJobs,
      jobsByPortal: stats.jobsByPortal,
      status: 'success'
    });
  } catch (error) {
    logger.error('Error seeding jobs:', error);
    res.status(500).json({
      error: 'Failed to seed database',
      message: 'An error occurred while seeding the database with sample data'
    });
  }
});

export default router;
