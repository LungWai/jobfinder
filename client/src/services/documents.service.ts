import api from './api';
import { 
  ApplicationDocument, 
  DocumentType,
  PaginatedResponse
} from '../types/api';

interface DocumentFilters {
  type?: DocumentType;
  applicationId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const documentsService = {
  // Get user's documents
  getDocuments: async (
    filters: DocumentFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<ApplicationDocument>> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<PaginatedResponse<ApplicationDocument>>(`/documents?${params.toString()}`);
    return response.data;
  },

  // Get single document
  getDocument: async (id: string): Promise<ApplicationDocument> => {
    const response = await api.get<ApplicationDocument>(`/documents/${id}`);
    return response.data;
  },

  // Upload document
  uploadDocument: async (
    applicationId: string,
    file: File,
    type: DocumentType,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApplicationDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('applicationId', applicationId);
    formData.append('type', type);
    formData.append('name', file.name);

    const response = await api.post<ApplicationDocument>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  // Update document metadata
  updateDocument: async (
    id: string,
    data: { name?: string; type?: DocumentType }
  ): Promise<ApplicationDocument> => {
    const response = await api.patch<ApplicationDocument>(`/documents/${id}`, data);
    return response.data;
  },

  // Delete document
  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  // Get document download URL
  getDownloadUrl: async (id: string): Promise<string> => {
    const response = await api.get<{ url: string }>(`/documents/${id}/download-url`);
    return response.data.url;
  },

  // Download document
  downloadDocument: async (id: string, filename?: string): Promise<void> => {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `document-${id}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Bulk upload documents
  bulkUpload: async (
    applicationId: string,
    files: File[],
    type: DocumentType,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApplicationDocument[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('applicationId', applicationId);
    formData.append('type', type);

    const response = await api.post<ApplicationDocument[]>('/documents/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  // Get document templates
  getTemplates: async (type: DocumentType): Promise<Array<{
    id: string;
    name: string;
    description: string;
    content: string;
    type: DocumentType;
  }>> => {
    const response = await api.get(`/documents/templates?type=${type}`);
    return response.data;
  },

  // Scan document for information extraction
  scanDocument: async (id: string): Promise<{
    text: string;
    extractedData: {
      email?: string;
      phone?: string;
      skills?: string[];
      experience?: Array<{
        company: string;
        position: string;
        duration: string;
      }>;
      education?: Array<{
        institution: string;
        degree: string;
        year: string;
      }>;
    };
  }> => {
    const response = await api.post(`/documents/${id}/scan`);
    return response.data;
  },

  // Validate document
  validateDocument: async (file: File, type: DocumentType): Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await api.post('/documents/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Get storage usage
  getStorageUsage: async (): Promise<{
    used: number; // in bytes
    limit: number; // in bytes
    percentage: number;
  }> => {
    const response = await api.get('/documents/storage');
    return response.data;
  },
};