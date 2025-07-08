import { PrismaClient, DocumentType, Prisma } from '@prisma/client';
import { 
  UploadDocumentInput,
  DocumentFilters,
  DocumentVersionInput,
  ServiceResponse,
  PaginatedResponse,
  UploadedFile
} from '../types/application';
import { 
  validateFileForDocumentType, 
  deleteFile, 
  moveFile,
  getFileStats,
  createDownloadStream 
} from '../utils/file-upload';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export class DocumentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Upload a new document
   */
  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    input: UploadDocumentInput
  ): ServiceResponse<any> {
    try {
      // Validate file for document type
      const validation = validateFileForDocumentType(file, input.type);
      if (!validation.valid) {
        // Clean up uploaded file
        await deleteFile(file.path);
        return {
          success: false,
          error: validation.error
        };
      }

      // If applicationId provided, verify ownership
      if (input.applicationId) {
        const application = await this.prisma.jobApplication.findFirst({
          where: {
            id: input.applicationId,
            userId
          }
        });

        if (!application) {
          await deleteFile(file.path);
          return {
            success: false,
            error: 'Application not found'
          };
        }
      }

      // Handle versioning for resumes
      if (input.type === DocumentType.RESUME) {
        await this.handleResumeVersioning(userId, input.version);
      }

      // Create document record
      const document = await this.prisma.applicationDocument.create({
        data: {
          userId,
          applicationId: input.applicationId,
          type: input.type,
          name: input.name,
          filename: file.filename,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          version: input.version,
          tags: input.tags || [],
          isActive: true
        }
      });

      // Log activity
      await this.logActivity(userId, 'DOCUMENT_UPLOADED', 'ApplicationDocument', document.id, {
        documentType: input.type,
        fileName: file.originalname
      });

      return {
        success: true,
        data: document,
        message: 'Document uploaded successfully'
      };
    } catch (error) {
      logger.error('Error uploading document:', error);
      // Clean up file on error
      if (file?.path) {
        await deleteFile(file.path);
      }
      return {
        success: false,
        error: 'Failed to upload document'
      };
    }
  }

  /**
   * Get user documents with filters
   */
  async getUserDocuments(
    userId: string,
    filters: DocumentFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<PaginatedResponse<any>>> {
    try {
      const where: Prisma.ApplicationDocumentWhereInput = {
        userId,
        ...(filters.type && { type: filters.type }),
        ...(filters.applicationId && { applicationId: filters.applicationId }),
        ...(filters.tags && filters.tags.length > 0 && {
          tags: { hasSome: filters.tags }
        }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive })
      };

      const total = await this.prisma.applicationDocument.count({ where });

      const documents = await this.prisma.applicationDocument.findMany({
        where,
        include: {
          application: {
            include: {
              jobListing: {
                select: {
                  title: true,
                  company: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      return {
        success: true,
        data: {
          items: documents,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      logger.error('Error fetching user documents:', error);
      return {
        success: false,
        error: 'Failed to fetch documents'
      };
    }
  }

  /**
   * Download a document
   */
  async downloadDocument(
    userId: string,
    documentId: string
  ): ServiceResponse<{ stream: any; document: any }> {
    try {
      const document = await this.prisma.applicationDocument.findFirst({
        where: {
          id: documentId,
          userId
        }
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      // Check if file exists
      try {
        await fs.access(document.filePath);
      } catch {
        return {
          success: false,
          error: 'Document file not found on server'
        };
      }

      // Create download stream
      const stream = createDownloadStream(document.filePath);

      return {
        success: true,
        data: {
          stream,
          document
        }
      };
    } catch (error) {
      logger.error('Error downloading document:', error);
      return {
        success: false,
        error: 'Failed to download document'
      };
    }
  }

  /**
   * Update document tags
   */
  async updateDocumentTags(
    userId: string,
    documentId: string,
    tags: string[]
  ): ServiceResponse<any> {
    try {
      const document = await this.prisma.applicationDocument.findFirst({
        where: {
          id: documentId,
          userId
        }
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      const updatedDocument = await this.prisma.applicationDocument.update({
        where: { id: documentId },
        data: { tags }
      });

      return {
        success: true,
        data: updatedDocument,
        message: 'Tags updated successfully'
      };
    } catch (error) {
      logger.error('Error updating document tags:', error);
      return {
        success: false,
        error: 'Failed to update tags'
      };
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    userId: string,
    documentId: string
  ): ServiceResponse<void> {
    try {
      const document = await this.prisma.applicationDocument.findFirst({
        where: {
          id: documentId,
          userId
        }
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      // Delete file from filesystem
      await deleteFile(document.filePath);

      // Delete database record
      await this.prisma.applicationDocument.delete({
        where: { id: documentId }
      });

      // Log activity
      await this.logActivity(userId, 'DOCUMENT_DELETED', 'ApplicationDocument', documentId, {
        documentType: document.type,
        fileName: document.filename
      });

      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting document:', error);
      return {
        success: false,
        error: 'Failed to delete document'
      };
    }
  }

  /**
   * Get document versions (for resumes)
   */
  async getDocumentVersions(
    userId: string,
    type: DocumentType = DocumentType.RESUME
  ): ServiceResponse<any[]> {
    try {
      const documents = await this.prisma.applicationDocument.findMany({
        where: {
          userId,
          type,
          version: { not: null }
        },
        orderBy: [
          { version: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      // Group by version
      const versionMap = new Map<string, any[]>();
      for (const doc of documents) {
        const version = doc.version!;
        if (!versionMap.has(version)) {
          versionMap.set(version, []);
        }
        versionMap.get(version)!.push(doc);
      }

      const versions = Array.from(versionMap.entries()).map(([version, docs]) => ({
        version,
        documents: docs,
        createdAt: docs[0].createdAt,
        isActive: docs.some(d => d.isActive)
      }));

      return {
        success: true,
        data: versions
      };
    } catch (error) {
      logger.error('Error fetching document versions:', error);
      return {
        success: false,
        error: 'Failed to fetch versions'
      };
    }
  }

  /**
   * Set active document version
   */
  async setActiveVersion(
    userId: string,
    input: DocumentVersionInput
  ): ServiceResponse<any> {
    try {
      const document = await this.prisma.applicationDocument.findFirst({
        where: {
          id: input.documentId,
          userId
        }
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      // Deactivate all documents of the same type and version
      await this.prisma.applicationDocument.updateMany({
        where: {
          userId,
          type: document.type,
          version: document.version
        },
        data: { isActive: false }
      });

      // Activate the selected document
      const activatedDocument = await this.prisma.applicationDocument.update({
        where: { id: input.documentId },
        data: { isActive: true }
      });

      return {
        success: true,
        data: activatedDocument,
        message: 'Document version activated'
      };
    } catch (error) {
      logger.error('Error setting active version:', error);
      return {
        success: false,
        error: 'Failed to set active version'
      };
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(userId: string): ServiceResponse<any> {
    try {
      const documents = await this.prisma.applicationDocument.findMany({
        where: { userId }
      });

      const stats = {
        total: documents.length,
        byType: {} as Record<DocumentType, number>,
        totalSize: 0,
        activeResumes: 0,
        versions: new Set<string>()
      };

      for (const doc of documents) {
        // Count by type
        stats.byType[doc.type] = (stats.byType[doc.type] || 0) + 1;
        
        // Total size
        stats.totalSize += doc.fileSize;
        
        // Active resumes
        if (doc.type === DocumentType.RESUME && doc.isActive) {
          stats.activeResumes++;
        }
        
        // Unique versions
        if (doc.version) {
          stats.versions.add(doc.version);
        }
      }

      return {
        success: true,
        data: {
          ...stats,
          totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2),
          uniqueVersions: stats.versions.size
        }
      };
    } catch (error) {
      logger.error('Error calculating document statistics:', error);
      return {
        success: false,
        error: 'Failed to calculate statistics'
      };
    }
  }

  /**
   * Validate document exists and belongs to user
   */
  async validateDocument(
    userId: string,
    documentId: string
  ): ServiceResponse<boolean> {
    try {
      const document = await this.prisma.applicationDocument.findFirst({
        where: {
          id: documentId,
          userId
        }
      });

      if (!document) {
        return {
          success: false,
          data: false,
          error: 'Document not found'
        };
      }

      // Check if file exists
      try {
        await fs.access(document.filePath);
        return {
          success: true,
          data: true
        };
      } catch {
        return {
          success: false,
          data: false,
          error: 'Document file not found on server'
        };
      }
    } catch (error) {
      logger.error('Error validating document:', error);
      return {
        success: false,
        data: false,
        error: 'Failed to validate document'
      };
    }
  }

  /**
   * Handle resume versioning
   */
  private async handleResumeVersioning(userId: string, version?: string): Promise<void> {
    if (!version) return;

    try {
      // Deactivate all previous resumes with different versions
      await this.prisma.applicationDocument.updateMany({
        where: {
          userId,
          type: DocumentType.RESUME,
          version: { not: version }
        },
        data: { isActive: false }
      });
    } catch (error) {
      logger.error('Error handling resume versioning:', error);
    }
  }

  /**
   * Log activity
   */
  private async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          metadata
        }
      });
    } catch (error) {
      logger.error('Error logging activity:', error);
    }
  }

  /**
   * Bulk delete documents
   */
  async bulkDeleteDocuments(
    userId: string,
    documentIds: string[]
  ): ServiceResponse<number> {
    try {
      // Get documents to delete
      const documents = await this.prisma.applicationDocument.findMany({
        where: {
          id: { in: documentIds },
          userId
        }
      });

      if (documents.length === 0) {
        return {
          success: false,
          error: 'No documents found to delete'
        };
      }

      // Delete files
      const deletePromises = documents.map(doc => deleteFile(doc.filePath));
      await Promise.allSettled(deletePromises);

      // Delete database records
      const result = await this.prisma.applicationDocument.deleteMany({
        where: {
          id: { in: documentIds },
          userId
        }
      });

      return {
        success: true,
        data: result.count,
        message: `${result.count} documents deleted`
      };
    } catch (error) {
      logger.error('Error bulk deleting documents:', error);
      return {
        success: false,
        error: 'Failed to delete documents'
      };
    }
  }
}