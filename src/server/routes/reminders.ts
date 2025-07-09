import { Router, Request, Response } from 'express';
import { ReminderService } from '../../services/reminder.service';
import { authenticate } from '../../auth/auth.middleware';
import { prisma } from '../../database/client';
import { validateRequest } from '../../utils/validators';
import { body, param, query } from 'express-validator';
import { ReminderType, ReminderStatus } from '@prisma/client';

const router = Router();
const reminderService = new ReminderService(prisma);

// All routes require authentication
router.use(authenticate);

// Create a reminder
router.post('/',
  [
    body('type').isIn(Object.values(ReminderType)).withMessage('Valid reminder type is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('reminderTime').isISO8601().withMessage('Valid reminder time is required'),
    body('applicationId').optional().isInt(),
    body('interviewId').optional().isInt(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('recurring').optional().isBoolean(),
    body('recurringPattern').optional().isIn(['daily', 'weekly', 'monthly']),
    body('metadata').optional().isObject(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const reminder = await reminderService.createReminder({
        ...req.body,
        userId,
        reminderTime: new Date(req.body.reminderTime)
      });
      res.status(201).json(reminder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create reminder' });
    }
  }
);

// Get all reminders for the authenticated user
router.get('/',
  [
    query('status').optional().isIn(Object.values(ReminderStatus)),
    query('type').optional().isIn(Object.values(ReminderType)),
    query('applicationId').optional().isInt(),
    query('interviewId').optional().isInt(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('includeCompleted').optional().isBoolean(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const filters = {
        status: req.query.status as ReminderStatus | undefined,
        type: req.query.type as ReminderType | undefined,
        applicationId: req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined,
        interviewId: req.query.interviewId ? parseInt(req.query.interviewId as string) : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        includeCompleted: req.query.includeCompleted === 'true',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const reminders = await reminderService.getUserReminders(userId, filters);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reminders' });
    }
  }
);

// Get upcoming reminders
router.get('/upcoming',
  [
    query('days').optional().isInt({ min: 1, max: 30 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string) || 7;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const reminders = await reminderService.getUpcomingReminders(userId, days, limit);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch upcoming reminders' });
    }
  }
);

// Get overdue reminders
router.get('/overdue', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const reminders = await reminderService.getOverdueReminders(userId);
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overdue reminders' });
  }
});

// Get a specific reminder
router.get('/:id',
  [
    param('id').isInt().withMessage('Valid reminder ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const reminderId = parseInt(req.params.id);
      
      const reminder = await reminderService.getReminder(reminderId, userId);
      
      if (!reminder) {
        return res.status(404).json({ error: 'Reminder not found' });
      }
      
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reminder' });
    }
  }
);

// Update a reminder
router.put('/:id',
  [
    param('id').isInt().withMessage('Valid reminder ID is required'),
    body('message').optional().notEmpty(),
    body('reminderTime').optional().isISO8601(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('status').optional().isIn(Object.values(ReminderStatus)),
    body('metadata').optional().isObject(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const reminderId = parseInt(req.params.id);
      
      const updates = {
        ...req.body,
        reminderTime: req.body.reminderTime ? new Date(req.body.reminderTime) : undefined
      };
      
      const reminder = await reminderService.updateReminder(
        reminderId,
        userId,
        updates
      );
      
      if (!reminder) {
        return res.status(404).json({ error: 'Reminder not found' });
      }
      
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update reminder' });
    }
  }
);

// Complete a reminder
router.post('/:id/complete',
  [
    param('id').isInt().withMessage('Valid reminder ID is required'),
    body('notes').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const reminderId = parseInt(req.params.id);
      
      const reminder = await reminderService.completeReminder(
        reminderId,
        userId,
        req.body.notes
      );
      
      if (!reminder) {
        return res.status(404).json({ error: 'Reminder not found' });
      }
      
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete reminder' });
    }
  }
);

// Snooze a reminder
router.post('/:id/snooze',
  [
    param('id').isInt().withMessage('Valid reminder ID is required'),
    body('snoozeDuration').isInt({ min: 5, max: 10080 }).withMessage('Snooze duration must be between 5 and 10080 minutes'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const reminderId = parseInt(req.params.id);
      const snoozeDuration = req.body.snoozeDuration;
      
      const reminder = await reminderService.snoozeReminder(
        reminderId,
        userId,
        snoozeDuration
      );
      
      if (!reminder) {
        return res.status(404).json({ error: 'Reminder not found' });
      }
      
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to snooze reminder' });
    }
  }
);

// Delete a reminder
router.delete('/:id',
  [
    param('id').isInt().withMessage('Valid reminder ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const reminderId = parseInt(req.params.id);
      
      const success = await reminderService.deleteReminder(reminderId, userId);
      
      if (!success) {
        return res.status(404).json({ error: 'Reminder not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete reminder' });
    }
  }
);

// Batch update reminders
router.put('/batch',
  [
    body('reminderIds').isArray().withMessage('Reminder IDs must be an array'),
    body('reminderIds.*').isInt().withMessage('Each reminder ID must be a number'),
    body('updates').isObject().withMessage('Updates must be an object'),
    body('updates.status').optional().isIn(Object.values(ReminderStatus)),
    body('updates.priority').optional().isIn(['low', 'medium', 'high']),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { reminderIds, updates } = req.body;
      
      const results = await reminderService.batchUpdateReminders(
        reminderIds,
        userId,
        updates
      );
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch update reminders' });
    }
  }
);

// Create automated reminders for an application
router.post('/automated',
  [
    body('applicationId').isInt().withMessage('Valid application ID is required'),
    body('reminderTypes').isArray().withMessage('Reminder types must be an array'),
    body('reminderTypes.*').isIn(['followup', 'interview_prep', 'thank_you', 'status_check']),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { applicationId, reminderTypes } = req.body;
      
      const reminders = await reminderService.createAutomatedReminders(
        applicationId,
        userId,
        reminderTypes
      );
      
      res.status(201).json(reminders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create automated reminders' });
    }
  }
);

// Get reminder statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await reminderService.getReminderStatistics(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reminder statistics' });
  }
});

// Update reminder preferences
router.put('/preferences',
  [
    body('emailNotifications').optional().isBoolean(),
    body('pushNotifications').optional().isBoolean(),
    body('defaultReminderTime').optional().isInt({ min: 0, max: 23 }),
    body('reminderAdvanceMinutes').optional().isInt({ min: 5, max: 1440 }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const preferences = await reminderService.updateReminderPreferences(
        userId,
        req.body
      );
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update reminder preferences' });
    }
  }
);

export default router;