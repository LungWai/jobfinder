import api from './api';
import { 
  Interview, 
  CreateInterviewRequest, 
  UpdateInterviewRequest,
  InterviewStats,
  PaginatedResponse,
  InterviewStatus,
  InterviewType
} from '../types/api';

interface InterviewFilters {
  status?: InterviewStatus;
  type?: InterviewType;
  dateFrom?: string;
  dateTo?: string;
  applicationId?: string;
}

export const interviewsService = {
  // Get user's interviews
  getInterviews: async (
    filters: InterviewFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Interview>> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<PaginatedResponse<Interview>>(`/interviews?${params.toString()}`);
    return response.data;
  },

  // Get upcoming interviews
  getUpcoming: async (days: number = 7): Promise<Interview[]> => {
    const response = await api.get<Interview[]>(`/interviews/upcoming?days=${days}`);
    return response.data;
  },

  // Get single interview
  getInterview: async (id: string): Promise<Interview> => {
    const response = await api.get<Interview>(`/interviews/${id}`);
    return response.data;
  },

  // Create new interview
  createInterview: async (data: CreateInterviewRequest): Promise<Interview> => {
    const response = await api.post<Interview>('/interviews', data);
    return response.data;
  },

  // Update interview
  updateInterview: async (id: string, data: UpdateInterviewRequest): Promise<Interview> => {
    const response = await api.patch<Interview>(`/interviews/${id}`, data);
    return response.data;
  },

  // Delete interview
  deleteInterview: async (id: string): Promise<void> => {
    await api.delete(`/interviews/${id}`);
  },

  // Reschedule interview
  reschedule: async (
    id: string, 
    newDate: string, 
    reason?: string
  ): Promise<Interview> => {
    const response = await api.post<Interview>(`/interviews/${id}/reschedule`, {
      scheduledAt: newDate,
      reason,
    });
    return response.data;
  },

  // Cancel interview
  cancel: async (id: string, reason?: string): Promise<Interview> => {
    const response = await api.post<Interview>(`/interviews/${id}/cancel`, { reason });
    return response.data;
  },

  // Mark interview as completed
  complete: async (
    id: string, 
    notes?: string, 
    outcome?: 'passed' | 'failed' | 'pending'
  ): Promise<Interview> => {
    const response = await api.post<Interview>(`/interviews/${id}/complete`, {
      notes,
      outcome,
    });
    return response.data;
  },

  // Get interview statistics
  getStats: async (): Promise<InterviewStats> => {
    const response = await api.get<InterviewStats>('/interviews/stats');
    return response.data;
  },

  // Get interview preparation materials
  getPreparationMaterials: async (id: string): Promise<{
    companyInfo: any;
    commonQuestions: string[];
    tips: string[];
    relatedExperiences: any[];
  }> => {
    const response = await api.get(`/interviews/${id}/preparation`);
    return response.data;
  },

  // Add interview feedback
  addFeedback: async (
    id: string,
    feedback: {
      rating: number;
      strengths: string[];
      improvements: string[];
      notes?: string;
    }
  ): Promise<Interview> => {
    const response = await api.post<Interview>(`/interviews/${id}/feedback`, feedback);
    return response.data;
  },

  // Get interview calendar events
  getCalendarEvents: async (
    startDate: string,
    endDate: string
  ): Promise<Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    type: InterviewType;
    location?: string;
    meetingUrl?: string;
  }>> => {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    
    const response = await api.get(`/interviews/calendar?${params.toString()}`);
    return response.data;
  },

  // Export interview to calendar
  exportToCalendar: async (id: string, format: 'ics' | 'google'): Promise<string | Blob> => {
    const response = await api.get(`/interviews/${id}/export?format=${format}`, {
      responseType: format === 'ics' ? 'blob' : 'json',
    });
    
    return response.data;
  },

  // Get interview history for a company
  getCompanyHistory: async (companyName: string): Promise<Interview[]> => {
    const response = await api.get(`/interviews/company/${encodeURIComponent(companyName)}`);
    return response.data;
  },

  // Batch update interview status
  batchUpdateStatus: async (
    interviewIds: string[],
    status: InterviewStatus
  ): Promise<{ updated: number }> => {
    const response = await api.post('/interviews/batch/status', {
      interviewIds,
      status,
    });
    return response.data;
  },
};