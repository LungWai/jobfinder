import { Router, Request, Response } from 'express';
import { DocumentService } from '../../services/document.service';
import { authenticateUser } from '../../auth/auth.middleware';
import { validateRequest } from '../../utils/validators';
import { body, param, query } from 'express-validator';
import { DocumentType } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const documentService = new DocumentService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.user!.id;
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents', userId.toString());
    
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
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and RTF files are allowed.'));
    }
  }
});

// All routes require authentication
router.use(authenticateUser);

// Upload a document
router.post('/',
  upload.single('document'),
  [
    body('type').isIn(Object.values(DocumentType)).withMessage('Valid document type is required'),
    body('applicationId').optional().isInt(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user!.id;
      const document = await documentService.uploadDocument({
        userId,
        type: req.body.type,
        applicationId: req.body.applicationId ? parseInt(req.body.applicationId) : undefined,
        name: req.body.name || req.file.originalname,
        description: req.body.description,
        tags: req.body.tags || [],
        file: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        }
      });

      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// Get all documents for the authenticated user
router.get('/',
  [
    query('type').optional().isIn(Object.values(DocumentType)),
    query('applicationId').optional().isInt(),
    query('tags').optional().isArray(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const filters = {
        type: req.query.type as DocumentType | undefined,
        applicationId: req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined,
        tags: req.query.tags as string[] | undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string | undefined
      };

      const documents = await documentService.getUserDocuments(userId, filters);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }
);

// Get a specific document metadata
router.get('/:id',
  [
    param('id').isInt().withMessage('Valid document ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      const document = await documentService.getDocument(documentId, userId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }
);

// Download a document
router.get('/:id/download',
  [
    param('id').isInt().withMessage('Valid document ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      const document = await documentService.getDocument(documentId, userId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), 'uploads', 'documents', userId.toString(), document.filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ error: 'File not found on disk' });
      }
      
      res.download(filePath, document.originalName);
    } catch (error) {
      res.status(500).json({ error: 'Failed to download document' });
    }
  }
);

// Update document metadata
router.put('/:id',
  [
    param('id').isInt().withMessage('Valid document ID is required'),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString(),
    body('applicationId').optional().isInt(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      const document = await documentService.updateDocument(
        documentId,
        userId,
        req.body
      );
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update document' });
    }
  }
);

// Update document tags
router.put('/:id/tags',
  [
    param('id').isInt().withMessage('Valid document ID is required'),
    body('tags').isArray().withMessage('Tags must be an array'),
    body('tags.*').isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      const document = await documentService.updateDocumentTags(
        documentId,
        userId,
        req.body.tags
      );
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update tags' });
    }
  }
);

// Delete a document
router.delete('/:id',
  [
    param('id').isInt().withMessage('Valid document ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      const document = await documentService.getDocument(documentId, userId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Delete file from disk
      const filePath = path.join(process.cwd(), 'uploads', 'documents', userId.toString(), document.filename);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Failed to delete file from disk:', error);
      }
      
      await documentService.deleteDocument(documentId, userId);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);

// Get document versions
router.get('/:id/versions',
  [
    param('id').isInt().withMessage('Valid document ID is required'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      const versions = await documentService.getDocumentVersions(documentId, userId);
      
      if (!versions) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch document versions' });
    }
  }
);

// Create a new version of a document
router.post('/:id/versions',
  upload.single('document'),
  [
    param('id').isInt().withMessage('Valid document ID is required'),
    body('description').optional().isString(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      const version = await documentService.createDocumentVersion(
        documentId,
        userId,
        {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        },
        req.body.description
      );
      
      if (!version) {
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.status(201).json(version);
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ error: 'Failed to create document version' });
    }
  }
);

// Batch delete documents
router.post('/batch/delete',
  [
    body('documentIds').isArray().withMessage('Document IDs must be an array'),
    body('documentIds.*').isInt().withMessage('Each document ID must be a number'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { documentIds } = req.body;
      
      const results = await documentService.batchDeleteDocuments(documentIds, userId);
      
      res.json({
        deleted: results.deleted,
        failed: results.failed
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete documents' });
    }
  }
);

// Get document statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await documentService.getDocumentStatistics(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document statistics' });
  }
});

export default router;