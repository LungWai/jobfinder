import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { DocumentType } from '@prisma/client';
import { FileUploadConfig } from '../types/application';

// File upload configuration
export const FILE_UPLOAD_CONFIG: FileUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ],
  uploadDir: process.env.UPLOAD_DIR || 'uploads'
};

// Document type specific configurations
const DOCUMENT_TYPE_CONFIG: Record<DocumentType, { 
  mimeTypes: string[]; 
  maxSize: number;
  subDir: string;
}> = {
  RESUME: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    subDir: 'resumes'
  },
  COVER_LETTER: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    maxSize: 2 * 1024 * 1024, // 2MB
    subDir: 'cover-letters'
  },
  PORTFOLIO: {
    mimeTypes: [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    subDir: 'portfolios'
  },
  CERTIFICATE: {
    mimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    subDir: 'certificates'
  },
  REFERENCE: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxSize: 2 * 1024 * 1024, // 2MB
    subDir: 'references'
  },
  OTHER: {
    mimeTypes: FILE_UPLOAD_CONFIG.allowedMimeTypes,
    maxSize: FILE_UPLOAD_CONFIG.maxFileSize,
    subDir: 'other'
  }
};

// Generate unique filename
const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(6).toString('hex');
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase();
  
  return `${baseName}-${timestamp}-${randomString}${extension}`;
};

// Create upload directory if it doesn't exist
export const ensureUploadDirectory = async (subDir?: string): Promise<string> => {
  const baseDir = FILE_UPLOAD_CONFIG.uploadDir;
  const fullDir = subDir ? path.join(baseDir, subDir) : baseDir;
  
  try {
    await fs.access(fullDir);
  } catch {
    await fs.mkdir(fullDir, { recursive: true });
  }
  
  return fullDir;
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Determine subdirectory based on document type
      const documentType = (req.body.type as DocumentType) || DocumentType.OTHER;
      const config = DOCUMENT_TYPE_CONFIG[documentType];
      const uploadDir = await ensureUploadDirectory(config.subDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const documentType = (req.body.type as DocumentType) || DocumentType.OTHER;
  const config = DOCUMENT_TYPE_CONFIG[documentType];
  
  if (config.mimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types for ${documentType}: ${config.mimeTypes.join(', ')}`));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_UPLOAD_CONFIG.maxFileSize
  }
});

// Validate file for specific document type
export const validateFileForDocumentType = (
  file: Express.Multer.File,
  documentType: DocumentType
): { valid: boolean; error?: string } => {
  const config = DOCUMENT_TYPE_CONFIG[documentType];
  
  if (!config.mimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type for ${documentType}. Allowed types: ${config.mimeTypes.join(', ')}`
    };
  }
  
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File too large for ${documentType}. Maximum size: ${config.maxSize / (1024 * 1024)}MB`
    };
  }
  
  return { valid: true };
};

// Delete file
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw error if file doesn't exist
    if ((error as any).code !== 'ENOENT') {
      throw error;
    }
  }
};

// Move file to different directory
export const moveFile = async (oldPath: string, newPath: string): Promise<void> => {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(newPath);
    await ensureUploadDirectory(destDir);
    
    // Move file
    await fs.rename(oldPath, newPath);
  } catch (error) {
    // If rename fails (e.g., across different filesystems), copy and delete
    try {
      await fs.copyFile(oldPath, newPath);
      await fs.unlink(oldPath);
    } catch (copyError) {
      throw new Error(`Failed to move file: ${(copyError as Error).message}`);
    }
  }
};

// Get file stats
export const getFileStats = async (filePath: string): Promise<{
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}> => {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime
  };
};

// Clean up old files (for scheduled cleanup)
export const cleanupOldFiles = async (daysOld: number = 30): Promise<number> => {
  let deletedCount = 0;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const processDirectory = async (dir: string) => {
    try {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          await processDirectory(filePath);
        } else if (stats.mtime < cutoffDate) {
          await deleteFile(filePath);
          deletedCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dir}:`, error);
    }
  };
  
  await processDirectory(FILE_UPLOAD_CONFIG.uploadDir);
  return deletedCount;
};

// Create download stream
export const createDownloadStream = (filePath: string) => {
  const fs = require('fs');
  return fs.createReadStream(filePath);
};