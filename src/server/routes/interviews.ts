import { Router, Request, Response } from 'express';
import { InterviewService } from '../../services/interview.service';
import { authenticateUser } from '../../auth/auth.middleware';
import { validateRequest } from '../../utils/validators';
import { body, param, query } from 'express-validator';
import { InterviewType, InterviewStatus } from '@prisma/client';

const router = Router();
const interviewService = new InterviewService();

// All routes require authentication
router.use(authenticateUser);

// Schedule a new interview
router.post('/',
  [
    body('applicationId').isInt().withMessage('Valid application ID is required'),
    body('scheduledAt').isISO8601().withMessage('Valid scheduled date is required'),
    body('type').isIn(Object.values(InterviewType)).withMessage('Valid interview type is required'),
    body('format').isIn(['in_person', 'video', 'phone']).withMessage('Valid format is required'),
    body('location').optional().isString(),
    body('meetingLink').optional().isURL(),
    body('interviewerName').optional().isString(),
    body('interviewerTitle').optional().isString(),
    body('duration').optional().isInt({ min: 15, max: 480 }),
    body('notes').optional().isString(),
    body('round').optional().isInt({ min: 1 }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const interview = await interviewService.scheduleInterview({
        ...req.body,
        userId
      });
      res.status(201).json(interview);
    } catch (error) {
      res.status(500).json({ error: 'Failed to schedule interview' });
    }
  }
);

// Get all interviews for the authenticated user
router.get('/',
  [
    query('status').optional().isIn(Object.values(InterviewStatus)),
    query('type').optional().isIn(Object.values(InterviewType)),
    query('applicationId').optional().isInt(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const filters = {
        status: req.query.status as InterviewStatus | undefined,
        type: req.query.type as InterviewType | undefined,
        applicationId: req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const interviews = await interviewService.getUserInterviews(userId, filters);
      res.json(interviews);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch interviews' });
    }
  }
);

// Get upcoming interviews
router.get('/upcoming',
  [
    query('days').optional().isInt({ min: 1, max: 90 }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string) || 7;
      const interviews = await interviewService.getUpcomingInterviews(userId, days);
      res.json(interviews);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch upcoming interviews' });
    }
  }
);

// Get a specific interview
router.get('/:id',
  [
    param('id').isInt().withMessage('Valid interview ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const interviewId = parseInt(req.params.id);
      
      const interview = await interviewService.getInterview(interviewId, userId);
      
      if (!interview) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch interview' });
    }
  }
);

// Update an interview
router.put('/:id',
  [
    param('id').isInt().withMessage('Valid interview ID is required'),
    body('scheduledAt').optional().isISO8601(),
    body('status').optional().isIn(Object.values(InterviewStatus)),
    body('location').optional().isString(),
    body('meetingLink').optional().isURL(),
    body('interviewerName').optional().isString(),
    body('interviewerTitle').optional().isString(),
    body('notes').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const interviewId = parseInt(req.params.id);
      
      const interview = await interviewService.updateInterview(
        interviewId,
        userId,
        req.body
      );
      
      if (!interview) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update interview' });
    }
  }
);

// Add interview feedback
router.post('/:id/feedback',
  [
    param('id').isInt().withMessage('Valid interview ID is required'),
    body('feedback').notEmpty().withMessage('Feedback is required'),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('strengths').optional().isArray(),
    body('weaknesses').optional().isArray(),
    body('nextSteps').optional().isString(),
    body('wouldRecommend').optional().isBoolean(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const interviewId = parseInt(req.params.id);
      
      const feedback = await interviewService.addFeedback(
        interviewId,
        userId,
        req.body
      );
      
      if (!feedback) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      res.status(201).json(feedback);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add feedback' });
    }
  }
);

// Complete an interview (mark as completed)
router.post('/:id/complete',
  [
    param('id').isInt().withMessage('Valid interview ID is required'),
    body('outcome').optional().isIn(['passed', 'failed', 'pending']),
    body('notes').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const interviewId = parseInt(req.params.id);
      
      const interview = await interviewService.completeInterview(
        interviewId,
        userId,
        req.body.outcome,
        req.body.notes
      );
      
      if (!interview) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete interview' });
    }
  }
);

// Cancel an interview
router.delete('/:id',
  [
    param('id').isInt().withMessage('Valid interview ID is required'),
    body('reason').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const interviewId = parseInt(req.params.id);
      
      const interview = await interviewService.cancelInterview(
        interviewId,
        userId,
        req.body.reason
      );
      
      if (!interview) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel interview' });
    }
  }
);

// Get interview preparation resources
router.get('/:id/preparation',
  [
    param('id').isInt().withMessage('Valid interview ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const interviewId = parseInt(req.params.id);
      
      const preparation = await interviewService.getPreparationResources(
        interviewId,
        userId
      );
      
      if (!preparation) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      res.json(preparation);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch preparation resources' });
    }
  }
);

// Create interview reminder
router.post('/:id/reminder',
  [
    param('id').isInt().withMessage('Valid interview ID is required'),
    body('reminderTime').isISO8601().withMessage('Valid reminder time is required'),
    body('type').optional().isIn(['email', 'push', 'sms']),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const interviewId = parseInt(req.params.id);
      
      const reminder = await interviewService.createInterviewReminder(
        interviewId,
        userId,
        new Date(req.body.reminderTime),
        req.body.type || 'email'
      );
      
      if (!reminder) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      res.status(201).json(reminder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create reminder' });
    }
  }
);

// Export interview calendar
router.get('/export/calendar',
  [
    query('format').optional().isIn(['ics', 'google']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const format = req.query.format as string || 'ics';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const calendar = await interviewService.exportInterviewCalendar(
        userId,
        format,
        startDate,
        endDate
      );
      
      if (format === 'ics') {
        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', 'attachment; filename="interviews.ics"');
      }
      
      res.send(calendar);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export calendar' });
    }
  }
);

export default router;