import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { JobListing, JobFilters, PaginatedResponse, FilterOptions, ScrapingStats } from '../types/job';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor for auth and logging
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        accessToken = newAccessToken;
        refreshToken = newRefreshToken;

        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        
        // Clear tokens and redirect to login
        accessToken = null;
        refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Dispatch custom event for auth failure
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle specific error codes
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = retryAfter 
        ? `Too many requests. Please try again in ${retryAfter} seconds.`
        : 'Too many requests. Please try again later.';
      return Promise.reject(new Error(message));
    }

    if (error.response?.status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }

    // Log error in development
    if (import.meta.env.DEV) {
      console.error('API Response Error:', error);
    }

    return Promise.reject(error);
  }
);

// Export function to update tokens (used by auth service)
export const updateTokens = (newAccessToken: string | null, newRefreshToken: string | null) => {
  accessToken = newAccessToken;
  refreshToken = newRefreshToken;
  
  if (newAccessToken) {
    localStorage.setItem('accessToken', newAccessToken);
  } else {
    localStorage.removeItem('accessToken');
  }
  
  if (newRefreshToken) {
    localStorage.setItem('refreshToken', newRefreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

// Retry configuration with exponential backoff
const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    // Don't retry auth errors
    if (error instanceof AxiosError && error.response?.status === 401) {
      throw error;
    }
    
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

export const jobsApi = {
  // Get jobs with filters and pagination
  getJobs: async (
    filters: JobFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<JobListing>> => {
    return retryRequest(async () => {
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
    });
  },

  // Get a specific job by ID
  getJobById: async (id: string): Promise<JobListing> => {
    return retryRequest(async () => {
      const response = await api.get(`/jobs/${id}`);
      return response.data;
    });
  },

  // Get filter options
  getFilterOptions: async (): Promise<FilterOptions> => {
    return retryRequest(async () => {
      const response = await api.get('/jobs/filters/options');
      return response.data;
    });
  },

  // Get job statistics
  getStats: async (): Promise<ScrapingStats> => {
    return retryRequest(async () => {
      const response = await api.get('/jobs/stats/overview');
      return response.data;
    });
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
