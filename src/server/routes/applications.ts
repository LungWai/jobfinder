import { Router, Request, Response } from 'express';
import { ApplicationService } from '../../services/application.service';
import { authenticate } from '../../auth/auth.middleware';
import { prisma } from '../../database/client';
import { 
  CreateApplicationInput, 
  UpdateApplicationInput,
  ApplicationStatus,
  ApplicationWithRelations
} from '../../types/application';
import { validateRequest } from '../../utils/validators';
import { body, param, query } from 'express-validator';

const router = Router();
const applicationService = new ApplicationService(prisma);

// All routes require authentication
router.use(authenticate);

// Create a new application
router.post('/', 
  [
    body('jobId').isInt().withMessage('Valid job ID is required'),
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('status').optional().isIn(Object.values(ApplicationStatus)),
    body('appliedDate').optional().isISO8601(),
    body('coverLetter').optional().isString(),
    body('notes').optional().isString(),
    body('source').optional().isString(),
    body('referralName').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const application = await applicationService.createApplication({
        ...req.body,
        userId
      });
      res.status(201).json(application);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create application' });
    }
  }
);

// Get all applications for the authenticated user
router.get('/',
  [
    query('status').optional().isIn(Object.values(ApplicationStatus)),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'appliedDate', 'companyName', 'position']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('search').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as ApplicationStatus | undefined;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';
      const search = req.query.search as string | undefined;

      const applications = await applicationService.getUserApplications(userId, {
        page,
        limit,
        status,
        sortBy,
        sortOrder,
        search
      });

      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  }
);

// Get application statistics for the user
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const statistics = await applicationService.getUserStatistics(userId);
    res.json(statistics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get a specific application
router.get('/:id',
  [
    param('id').isInt().withMessage('Valid application ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const applicationId = parseInt(req.params.id);
      
      const application = await applicationService.getApplication(applicationId, userId);
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      res.json(application);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch application' });
    }
  }
);

// Get application timeline/history
router.get('/:id/timeline',
  [
    param('id').isInt().withMessage('Valid application ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const applicationId = parseInt(req.params.id);
      
      const timeline = await applicationService.getApplicationTimeline(applicationId, userId);
      
      if (!timeline) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      res.json(timeline);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch timeline' });
    }
  }
);

// Update an application
router.put('/:id',
  [
    param('id').isInt().withMessage('Valid application ID is required'),
    body('status').optional().isIn(Object.values(ApplicationStatus)),
    body('notes').optional().isString(),
    body('coverLetter').optional().isString(),
    body('followUpDate').optional().isISO8601(),
    body('interviewDate').optional().isISO8601(),
    body('rejectionReason').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const applicationId = parseInt(req.params.id);
      
      const application = await applicationService.updateApplication(
        applicationId,
        userId,
        req.body
      );
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      res.json(application);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update application' });
    }
  }
);

// Add notes to an application
router.post('/:id/notes',
  [
    param('id').isInt().withMessage('Valid application ID is required'),
    body('content').notEmpty().withMessage('Note content is required'),
    body('type').optional().isIn(['general', 'interview', 'followup', 'feedback']),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const applicationId = parseInt(req.params.id);
      
      const note = await applicationService.addNote(
        applicationId,
        userId,
        req.body.content,
        req.body.type || 'general'
      );
      
      if (!note) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add note' });
    }
  }
);

// Delete an application
router.delete('/:id',
  [
    param('id').isInt().withMessage('Valid application ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const applicationId = parseInt(req.params.id);
      
      const success = await applicationService.deleteApplication(applicationId, userId);
      
      if (!success) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete application' });
    }
  }
);

// Batch update applications
router.put('/batch',
  [
    body('applicationIds').isArray().withMessage('Application IDs must be an array'),
    body('applicationIds.*').isInt().withMessage('Each application ID must be a number'),
    body('updates').isObject().withMessage('Updates must be an object'),
    body('updates.status').optional().isIn(Object.values(ApplicationStatus)),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { applicationIds, updates } = req.body;
      
      const results = await applicationService.batchUpdateApplications(
        applicationIds,
        userId,
        updates
      );
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch update applications' });
    }
  }
);

// Export applications as CSV
router.get('/export/csv',
  [
    query('status').optional().isIn(Object.values(ApplicationStatus)),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const filters = {
        status: req.query.status as ApplicationStatus | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };
      
      const csv = await applicationService.exportApplicationsAsCSV(userId, filters);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export applications' });
    }
  }
);

export default router;