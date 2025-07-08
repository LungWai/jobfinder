import api from './api';
import { 
  JobListing, 
  JobFilters, 
  PaginatedResponse, 
  FilterOptions, 
  ScrapingStats 
} from '../types/api';

// Re-export jobsApi from main api file for backward compatibility
export { jobsApi } from './api';

// Additional job-related services
export const jobsService = {
  // Search jobs with advanced filters
  searchJobs: async (
    filters: JobFilters = {},
    page: number = 1,
    limit: number = 20,
    sortBy?: 'date' | 'salary' | 'relevance'
  ): Promise<PaginatedResponse<JobListing>> => {
    const params = new URLSearchParams();
    
    // Add all filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (sortBy) params.append('sortBy', sortBy);

    const response = await api.get<PaginatedResponse<JobListing>>(`/jobs?${params.toString()}`);
    return response.data;
  },

  // Get job by ID with related jobs
  getJobDetails: async (id: string): Promise<{
    job: JobListing;
    relatedJobs: JobListing[];
  }> => {
    const response = await api.get(`/jobs/${id}/details`);
    return response.data;
  },

  // Get trending job categories
  getTrendingCategories: async (): Promise<Array<{
    category: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>> => {
    const response = await api.get('/jobs/trending/categories');
    return response.data;
  },

  // Get salary insights
  getSalaryInsights: async (category?: string, location?: string): Promise<{
    average: number;
    median: number;
    percentile25: number;
    percentile75: number;
    currency: string;
  }> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (location) params.append('location', location);
    
    const response = await api.get(`/jobs/insights/salary?${params.toString()}`);
    return response.data;
  },

  // Mark job as viewed
  markAsViewed: async (jobId: string): Promise<void> => {
    await api.post(`/jobs/${jobId}/view`);
  },

  // Get user's recently viewed jobs
  getRecentlyViewed: async (limit: number = 10): Promise<JobListing[]> => {
    const response = await api.get(`/jobs/recently-viewed?limit=${limit}`);
    return response.data;
  },

  // Get job recommendations based on user profile
  getRecommendations: async (limit: number = 20): Promise<JobListing[]> => {
    const response = await api.get(`/jobs/recommendations?limit=${limit}`);
    return response.data;
  },

  // Report a job listing
  reportJob: async (jobId: string, reason: string, details?: string): Promise<void> => {
    await api.post(`/jobs/${jobId}/report`, { reason, details });
  },

  // Get company jobs
  getCompanyJobs: async (
    companyName: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<JobListing>> => {
    const params = new URLSearchParams({
      company: companyName,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await api.get<PaginatedResponse<JobListing>>(`/jobs?${params.toString()}`);
    return response.data;
  },
};