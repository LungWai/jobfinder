import { Router, Request, Response } from 'express';
import { authenticate } from '../../auth/auth.middleware';
import { validateRequest } from '../../utils/validators';
import { body, query } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.user!.id;
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles', userId.toString());
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            createdAt: true,
            isVerified: true
          }
        }
      }
    });
    
    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = await prisma.userProfile.create({
        data: { userId },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              createdAt: true,
              isVerified: true
            }
          }
        }
      });
      return res.json(newProfile);
    }
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/',
  [
    body('headline').optional().isString().isLength({ max: 200 }),
    body('bio').optional().isString().isLength({ max: 2000 }),
    body('location').optional().isString().isLength({ max: 100 }),
    body('phoneNumber').optional().isMobilePhone(),
    body('linkedinUrl').optional().isURL(),
    body('githubUrl').optional().isURL(),
    body('portfolioUrl').optional().isURL(),
    body('yearsOfExperience').optional().isInt({ min: 0, max: 50 }),
    body('currentCompany').optional().isString(),
    body('currentPosition').optional().isString(),
    body('isOpenToWork').optional().isBoolean(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: req.body,
        create: {
          userId,
          ...req.body
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              createdAt: true,
              isVerified: true
            }
          }
        }
      });
      
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Update profile photo
router.post('/photo',
  upload.single('photo'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
      }

      const userId = req.user!.id;
      const photoUrl = `/uploads/profiles/${userId}/${req.file.filename}`;
      
      // Delete old photo if exists
      const existingProfile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { photoUrl: true }
      });
      
      if (existingProfile?.photoUrl) {
        const oldPhotoPath = path.join(process.cwd(), existingProfile.photoUrl);
        try {
          await fs.unlink(oldPhotoPath);
        } catch (error) {
          console.error('Failed to delete old photo:', error);
        }
      }
      
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: { photoUrl },
        create: { userId, photoUrl }
      });
      
      res.json({ photoUrl: profile.photoUrl });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  }
);

// Update skills
router.put('/skills',
  [
    body('skills').isArray().withMessage('Skills must be an array'),
    body('skills.*').isString().isLength({ min: 1, max: 50 }),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { skills } = req.body;
      
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: { skills },
        create: { userId, skills }
      });
      
      res.json({ skills: profile.skills });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update skills' });
    }
  }
);

// Update job preferences
router.put('/preferences',
  [
    body('desiredPositions').optional().isArray(),
    body('desiredPositions.*').optional().isString(),
    body('desiredSalaryMin').optional().isInt({ min: 0 }),
    body('desiredSalaryMax').optional().isInt({ min: 0 }),
    body('preferredLocations').optional().isArray(),
    body('preferredLocations.*').optional().isString(),
    body('remotePreference').optional().isIn(['remote', 'hybrid', 'onsite', 'flexible']),
    body('jobTypes').optional().isArray(),
    body('jobTypes.*').optional().isIn(['full_time', 'part_time', 'contract', 'freelance', 'internship']),
    body('industries').optional().isArray(),
    body('industries.*').optional().isString(),
    body('companySizes').optional().isArray(),
    body('companySizes.*').optional().isIn(['startup', 'small', 'medium', 'large', 'enterprise']),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: {
          jobPreferences: req.body
        },
        create: {
          userId,
          jobPreferences: req.body
        }
      });
      
      res.json({ jobPreferences: profile.jobPreferences });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update job preferences' });
    }
  }
);

// Get profile statistics
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const [
      applicationsCount,
      interviewsCount,
      offersCount,
      documentsCount,
      activeRemindersCount,
      recentActivity
    ] = await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.interview.count({ where: { application: { userId } } }),
      prisma.application.count({ where: { userId, status: 'offer_received' } }),
      prisma.document.count({ where: { userId } }),
      prisma.reminder.count({ where: { userId, status: 'pending' } }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          action: true,
          entity: true,
          createdAt: true
        }
      })
    ]);
    
    res.json({
      applications: {
        total: applicationsCount,
        offers: offersCount
      },
      interviews: {
        total: interviewsCount
      },
      documents: {
        total: documentsCount
      },
      reminders: {
        active: activeRemindersCount
      },
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get profile completion percentage
router.get('/completion', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            isVerified: true
          }
        }
      }
    });
    
    if (!profile) {
      return res.json({ completion: 0, missingFields: ['profile'] });
    }
    
    const fields = [
      { field: 'name', value: profile.user.name },
      { field: 'headline', value: profile.headline },
      { field: 'bio', value: profile.bio },
      { field: 'location', value: profile.location },
      { field: 'phoneNumber', value: profile.phoneNumber },
      { field: 'skills', value: profile.skills && profile.skills.length > 0 },
      { field: 'linkedinUrl', value: profile.linkedinUrl },
      { field: 'photoUrl', value: profile.photoUrl },
      { field: 'emailVerified', value: profile.user.isVerified },
      { field: 'jobPreferences', value: profile.jobPreferences && Object.keys(profile.jobPreferences).length > 0 }
    ];
    
    const completedFields = fields.filter(f => f.value).length;
    const completion = Math.round((completedFields / fields.length) * 100);
    const missingFields = fields.filter(f => !f.value).map(f => f.field);
    
    res.json({
      completion,
      missingFields,
      completedFields,
      totalFields: fields.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate profile completion' });
  }
});

// Export profile data
router.get('/export',
  [
    query('format').optional().isIn(['json', 'pdf']),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const format = req.query.format as string || 'json';
      
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          applications: {
            include: {
              job: true,
              interviews: true,
              documents: true,
              statusHistory: true
            }
          },
          documents: true,
          reminders: {
            where: { status: 'pending' }
          }
        }
      });
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="profile-export.json"');
        res.json(userData);
      } else {
        // PDF export would require additional library like puppeteer or pdfkit
        res.status(501).json({ error: 'PDF export not yet implemented' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to export profile data' });
    }
  }
);

// Delete profile (and all associated data)
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Delete all user data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all related data
      await tx.activityLog.deleteMany({ where: { userId } });
      await tx.reminder.deleteMany({ where: { userId } });
      await tx.document.deleteMany({ where: { userId } });
      await tx.interview.deleteMany({ where: { application: { userId } } });
      await tx.statusHistory.deleteMany({ where: { application: { userId } } });
      await tx.application.deleteMany({ where: { userId } });
      await tx.savedSearch.deleteMany({ where: { userId } });
      await tx.userProfile.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    
    // Delete user files
    const userDir = path.join(process.cwd(), 'uploads', 'profiles', userId.toString());
    try {
      await fs.rmdir(userDir, { recursive: true });
    } catch (error) {
      console.error('Failed to delete user directory:', error);
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

export default router;