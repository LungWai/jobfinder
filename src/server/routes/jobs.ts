import express from 'express';
import { JobService } from '../../database/job-service';
import { JobFilters } from '../../types/job';
import logger from '../../utils/logger';

const router = express.Router();
const jobService = new JobService();

/**
 * GET /api/jobs
 * Get jobs with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      location,
      salaryMin,
      salaryMax,
      employmentType,
      experienceLevel,
      portal,
      datePosted,
      page = '1',
      limit = '20'
    } = req.query;

    const filters: JobFilters = {};
    
    if (search) filters.search = search as string;
    if (category) filters.category = category as string;
    if (location) filters.location = location as string;
    if (salaryMin) filters.salaryMin = parseInt(salaryMin as string);
    if (salaryMax) filters.salaryMax = parseInt(salaryMax as string);
    if (employmentType) filters.employmentType = employmentType as string;
    if (experienceLevel) filters.experienceLevel = experienceLevel as string;
    if (portal) filters.portal = portal as string;
    if (datePosted) filters.datePosted = datePosted as 'today' | 'week' | 'month' | 'all';

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        message: 'Page must be >= 1 and limit must be between 1 and 100'
      });
    }

    const result = await jobService.getJobs(filters, pageNum, limitNum);
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting jobs:', error);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: 'An error occurred while fetching job listings'
    });
  }
});

/**
 * GET /api/jobs/:id
 * Get a specific job by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await jobService.getJobById(id);
    
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'The requested job listing could not be found'
      });
    }
    
    res.json(job);
  } catch (error) {
    logger.error('Error getting job by ID:', error);
    res.status(500).json({
      error: 'Failed to fetch job',
      message: 'An error occurred while fetching the job listing'
    });
  }
});

/**
 * GET /api/jobs/stats/overview
 * Get job statistics and overview
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await jobService.getScrapingStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting job stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: 'An error occurred while fetching job statistics'
    });
  }
});

/**
 * GET /api/jobs/filters/options
 * Get available filter options
 */
router.get('/filters/options', async (req, res) => {
  try {
    // This would typically come from the database
    // For now, return static options
    const options = {
      portals: ['JobsDB', 'CT Good Jobs', 'Recruit.com.hk', 'University Jobs'],
      categories: [
        'Information Technology',
        'Finance',
        'Marketing',
        'Sales',
        'Human Resources',
        'Engineering',
        'Healthcare',
        'Education',
        'Legal',
        'Operations'
      ],
      locations: [
        'Central',
        'Admiralty',
        'Wan Chai',
        'Causeway Bay',
        'Tsim Sha Tsui',
        'Mong Kok',
        'Kwun Tong',
        'Sha Tin',
        'Tai Po',
        'Tuen Mun'
      ],
      employmentTypes: [
        'Full-time',
        'Part-time',
        'Contract',
        'Temporary',
        'Internship'
      ],
      experienceLevels: [
        'Entry Level',
        'Mid Level',
        'Senior Level',
        'Executive Level'
      ]
    };
    
    res.json(options);
  } catch (error) {
    logger.error('Error getting filter options:', error);
    res.status(500).json({
      error: 'Failed to fetch filter options',
      message: 'An error occurred while fetching filter options'
    });
  }
});

export default router;
