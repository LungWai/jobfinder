import { QueryClient, QueryClientConfig } from '@tanstack/react-query';

// Default query client configuration
const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Stale time: how long before data is considered stale
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cache time: how long inactive data stays in cache
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (except 429)
        if (error?.response?.status && error.response.status >= 400 && error.response.status < 500) {
          return error.response.status === 429 && failureCount < 3;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus in production only
      refetchOnWindowFocus: import.meta.env.PROD,
      
      // Don't refetch on reconnect by default
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      
      // Retry delay
      retryDelay: 1000,
    },
  },
};

// Create the query client
export const queryClient = new QueryClient(queryConfig);

// Query key factory for consistent query keys
export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    profile: ['auth', 'profile'] as const,
  },
  
  // Jobs
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters: any, page: number, limit: number) => 
      [...queryKeys.jobs.lists(), { filters, page, limit }] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    filters: ['jobs', 'filters'] as const,
    stats: ['jobs', 'stats'] as const,
    trending: ['jobs', 'trending'] as const,
    recommendations: ['jobs', 'recommendations'] as const,
    recentlyViewed: ['jobs', 'recently-viewed'] as const,
  },
  
  // Applications
  applications: {
    all: ['applications'] as const,
    lists: () => [...queryKeys.applications.all, 'list'] as const,
    list: (filters: any, page: number, limit: number) => 
      [...queryKeys.applications.lists(), { filters, page, limit }] as const,
    details: () => [...queryKeys.applications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.applications.details(), id] as const,
    stats: ['applications', 'stats'] as const,
    timeline: (id: string) => ['applications', id, 'timeline'] as const,
    check: (jobId: string) => ['applications', 'check', jobId] as const,
  },
  
  // Interviews
  interviews: {
    all: ['interviews'] as const,
    lists: () => [...queryKeys.interviews.all, 'list'] as const,
    list: (filters: any, page: number, limit: number) => 
      [...queryKeys.interviews.lists(), { filters, page, limit }] as const,
    details: () => [...queryKeys.interviews.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.interviews.details(), id] as const,
    upcoming: ['interviews', 'upcoming'] as const,
    stats: ['interviews', 'stats'] as const,
    calendar: (start: string, end: string) => ['interviews', 'calendar', { start, end }] as const,
    preparation: (id: string) => ['interviews', id, 'preparation'] as const,
  },
  
  // Documents
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (filters: any, page: number, limit: number) => 
      [...queryKeys.documents.lists(), { filters, page, limit }] as const,
    details: () => [...queryKeys.documents.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.documents.details(), id] as const,
    templates: (type: string) => ['documents', 'templates', type] as const,
    storage: ['documents', 'storage'] as const,
  },
  
  // Reminders
  reminders: {
    all: ['reminders'] as const,
    lists: () => [...queryKeys.reminders.all, 'list'] as const,
    list: (filters: any, page: number, limit: number) => 
      [...queryKeys.reminders.lists(), { filters, page, limit }] as const,
    details: () => [...queryKeys.reminders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.reminders.details(), id] as const,
    upcoming: ['reminders', 'upcoming'] as const,
    settings: ['reminders', 'settings'] as const,
    templates: (type: string) => ['reminders', 'templates', type] as const,
    history: ['reminders', 'history'] as const,
  },
  
  // Profile
  profile: {
    all: ['profile'] as const,
    completeness: ['profile', 'completeness'] as const,
    visibility: ['profile', 'visibility'] as const,
    skills: (category: string) => ['profile', 'skills', category] as const,
    public: (id: string) => ['profile', 'public', id] as const,
  },
  
  // Scraping
  scraping: {
    status: ['scraping', 'status'] as const,
  },
};

// Helper to invalidate queries
export const invalidateQueries = {
  // Invalidate all job-related queries
  jobs: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
  
  // Invalidate specific job
  job: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) }),
  
  // Invalidate all application-related queries
  applications: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications.all }),
  
  // Invalidate specific application
  application: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.applications.detail(id) }),
  
  // Invalidate all interview-related queries
  interviews: () => queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all }),
  
  // Invalidate specific interview
  interview: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.interviews.detail(id) }),
  
  // Invalidate user data
  user: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
  },
};