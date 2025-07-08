import api from './api';
import { 
  JobApplication, 
  CreateApplicationRequest, 
  UpdateApplicationRequest,
  ApplicationStats,
  PaginatedResponse,
  ApplicationStatus
} from '../types/api';

interface ApplicationFilters {
  status?: ApplicationStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  jobCategory?: string;
  company?: string;
}

export const applicationsService = {
  // Get user's applications
  getApplications: async (
    filters: ApplicationFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<JobApplication>> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<PaginatedResponse<JobApplication>>(`/applications?${params.toString()}`);
    return response.data;
  },

  // Get single application
  getApplication: async (id: string): Promise<JobApplication> => {
    const response = await api.get<JobApplication>(`/applications/${id}`);
    return response.data;
  },

  // Create new application
  createApplication: async (data: CreateApplicationRequest): Promise<JobApplication> => {
    const response = await api.post<JobApplication>('/applications', data);
    return response.data;
  },

  // Update application
  updateApplication: async (id: string, data: UpdateApplicationRequest): Promise<JobApplication> => {
    const response = await api.patch<JobApplication>(`/applications/${id}`, data);
    return response.data;
  },

  // Delete application
  deleteApplication: async (id: string): Promise<void> => {
    await api.delete(`/applications/${id}`);
  },

  // Update application status
  updateStatus: async (id: string, status: ApplicationStatus, notes?: string): Promise<JobApplication> => {
    const response = await api.post<JobApplication>(`/applications/${id}/status`, { status, notes });
    return response.data;
  },

  // Add note to application
  addNote: async (id: string, note: string): Promise<JobApplication> => {
    const response = await api.post<JobApplication>(`/applications/${id}/notes`, { note });
    return response.data;
  },

  // Get application statistics
  getStats: async (): Promise<ApplicationStats> => {
    const response = await api.get<ApplicationStats>('/applications/stats');
    return response.data;
  },

  // Check if user already applied to a job
  checkIfApplied: async (jobListingId: string): Promise<{ applied: boolean; applicationId?: string }> => {
    const response = await api.get(`/applications/check/${jobListingId}`);
    return response.data;
  },

  // Get application timeline
  getTimeline: async (id: string): Promise<Array<{
    id: string;
    type: 'status_change' | 'interview' | 'note' | 'document';
    timestamp: string;
    data: any;
  }>> => {
    const response = await api.get(`/applications/${id}/timeline`);
    return response.data;
  },

  // Bulk update applications
  bulkUpdateStatus: async (
    applicationIds: string[],
    status: ApplicationStatus
  ): Promise<{ updated: number }> => {
    const response = await api.post('/applications/bulk/status', {
      applicationIds,
      status,
    });
    return response.data;
  },

  // Export applications to CSV
  exportToCSV: async (filters: ApplicationFilters = {}): Promise<Blob> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await api.get(`/applications/export?${params.toString()}`, {
      responseType: 'blob',
    });
    
    return response.data;
  },

  // Get application templates
  getTemplates: async (): Promise<Array<{
    id: string;
    name: string;
    content: string;
    type: 'cover_letter' | 'follow_up';
  }>> => {
    const response = await api.get('/applications/templates');
    return response.data;
  },

  // Save application as draft
  saveDraft: async (data: CreateApplicationRequest): Promise<JobApplication> => {
    const response = await api.post<JobApplication>('/applications/draft', data);
    return response.data;
  },
};