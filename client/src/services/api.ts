import axios from 'axios';
import { JobListing, JobFilters, PaginatedResponse, FilterOptions, ScrapingStats } from '../types/job';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    throw error;
  }
);

export const jobsApi = {
  // Get jobs with filters and pagination
  getJobs: async (
    filters: JobFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<JobListing>> => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.location) params.append('location', filters.location);
    if (filters.salaryMin) params.append('salaryMin', filters.salaryMin.toString());
    if (filters.salaryMax) params.append('salaryMax', filters.salaryMax.toString());
    if (filters.employmentType) params.append('employmentType', filters.employmentType);
    if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
    if (filters.portal) params.append('portal', filters.portal);
    if (filters.datePosted) params.append('datePosted', filters.datePosted);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`/jobs?${params.toString()}`);
    return response.data;
  },

  // Get a specific job by ID
  getJobById: async (id: string): Promise<JobListing> => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  // Get filter options
  getFilterOptions: async (): Promise<FilterOptions> => {
    const response = await api.get('/jobs/filters/options');
    return response.data;
  },

  // Get job statistics
  getStats: async (): Promise<ScrapingStats> => {
    const response = await api.get('/jobs/stats/overview');
    return response.data;
  },
};

export const scrapingApi = {
  // Trigger manual scraping
  triggerScraping: async (portal?: string): Promise<{ message: string; status: string }> => {
    const response = await api.post('/scraping/trigger', { portal });
    return response.data;
  },

  // Get scraping status
  getStatus: async (): Promise<any> => {
    const response = await api.get('/scraping/status');
    return response.data;
  },

  // Clean up old jobs
  cleanup: async (daysOld: number = 30): Promise<{ message: string; deactivatedJobs: number }> => {
    const response = await api.post('/scraping/cleanup', { daysOld });
    return response.data;
  },
};

export default api;
