import { 
  useQuery, 
  useMutation, 
  useInfiniteQuery,
  UseQueryOptions,
  UseMutationOptions,
  UseInfiniteQueryOptions
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  authService,
  jobsService,
  jobsApi,
  applicationsService,
  interviewsService,
  documentsService,
  remindersService,
  profileService,
  scrapingApi,
} from '../services';
import {
  User,
  JobListing,
  JobFilters,
  PaginatedResponse,
  FilterOptions,
  JobApplication,
  Interview,
  ApplicationDocument,
  InterviewReminder,
  UserProfile,
  ApiError,
} from '../types/api';

// Generic error type for React Query
type QueryError = AxiosError<ApiError>;

// Auth hooks
export const useCurrentUser = (options?: UseQueryOptions<User, QueryError>) => {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: authService.getCurrentUser,
    ...options,
  });
};

export const useLogin = (options?: UseMutationOptions<any, QueryError, any>) => {
  return useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      invalidateQueries.user();
    },
    ...options,
  });
};

export const useLogout = (options?: UseMutationOptions<void, QueryError, void>) => {
  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      invalidateQueries.user();
    },
    ...options,
  });
};

// Job hooks
export const useJobs = (
  filters: JobFilters = {},
  page: number = 1,
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<JobListing>, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters, page, limit),
    queryFn: () => jobsApi.getJobs(filters, page, limit),
    ...options,
  });
};

export const useInfiniteJobs = (
  filters: JobFilters = {},
  limit: number = 20,
  options?: UseInfiniteQueryOptions<PaginatedResponse<JobListing>, QueryError>
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.list(filters, 1, limit),
    queryFn: ({ pageParam = 1 }) => jobsApi.getJobs(filters, pageParam, limit),
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage <= lastPage.totalPages ? nextPage : undefined;
    },
    initialPageParam: 1,
    ...options,
  });
};

export const useJob = (
  id: string,
  options?: UseQueryOptions<JobListing, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => jobsApi.getJobById(id),
    enabled: !!id,
    ...options,
  });
};

export const useJobFilters = (
  options?: UseQueryOptions<FilterOptions, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.jobs.filters,
    queryFn: jobsApi.getFilterOptions,
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

export const useJobStats = (options?: UseQueryOptions<any, QueryError>) => {
  return useQuery({
    queryKey: queryKeys.jobs.stats,
    queryFn: jobsApi.getStats,
    ...options,
  });
};

// Application hooks
export const useApplications = (
  filters: any = {},
  page: number = 1,
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<JobApplication>, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.applications.list(filters, page, limit),
    queryFn: () => applicationsService.getApplications(filters, page, limit),
    ...options,
  });
};

export const useApplication = (
  id: string,
  options?: UseQueryOptions<JobApplication, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.applications.detail(id),
    queryFn: () => applicationsService.getApplication(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateApplication = (
  options?: UseMutationOptions<JobApplication, QueryError, any>
) => {
  return useMutation({
    mutationFn: applicationsService.createApplication,
    onSuccess: () => {
      invalidateQueries.applications();
    },
    ...options,
  });
};

export const useUpdateApplication = (
  options?: UseMutationOptions<JobApplication, QueryError, { id: string; data: any }>
) => {
  return useMutation({
    mutationFn: ({ id, data }) => applicationsService.updateApplication(id, data),
    onSuccess: (data) => {
      invalidateQueries.application(data.id);
      invalidateQueries.applications();
    },
    ...options,
  });
};

export const useCheckIfApplied = (
  jobListingId: string,
  options?: UseQueryOptions<{ applied: boolean; applicationId?: string }, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.applications.check(jobListingId),
    queryFn: () => applicationsService.checkIfApplied(jobListingId),
    enabled: !!jobListingId,
    ...options,
  });
};

// Interview hooks
export const useInterviews = (
  filters: any = {},
  page: number = 1,
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<Interview>, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.interviews.list(filters, page, limit),
    queryFn: () => interviewsService.getInterviews(filters, page, limit),
    ...options,
  });
};

export const useUpcomingInterviews = (
  days: number = 7,
  options?: UseQueryOptions<Interview[], QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.interviews.upcoming,
    queryFn: () => interviewsService.getUpcoming(days),
    ...options,
  });
};

export const useInterview = (
  id: string,
  options?: UseQueryOptions<Interview, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.interviews.detail(id),
    queryFn: () => interviewsService.getInterview(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateInterview = (
  options?: UseMutationOptions<Interview, QueryError, any>
) => {
  return useMutation({
    mutationFn: interviewsService.createInterview,
    onSuccess: () => {
      invalidateQueries.interviews();
    },
    ...options,
  });
};

// Document hooks
export const useDocuments = (
  filters: any = {},
  page: number = 1,
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<ApplicationDocument>, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.documents.list(filters, page, limit),
    queryFn: () => documentsService.getDocuments(filters, page, limit),
    ...options,
  });
};

export const useUploadDocument = (
  options?: UseMutationOptions<ApplicationDocument, QueryError, any>
) => {
  return useMutation({
    mutationFn: ({ applicationId, file, type, onProgress }) =>
      documentsService.uploadDocument(applicationId, file, type, onProgress),
    onSuccess: (data) => {
      invalidateQueries.application(data.applicationId);
    },
    ...options,
  });
};

// Reminder hooks
export const useReminders = (
  filters: any = {},
  page: number = 1,
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<InterviewReminder>, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.reminders.list(filters, page, limit),
    queryFn: () => remindersService.getReminders(filters, page, limit),
    ...options,
  });
};

export const useUpcomingReminders = (
  hours: number = 24,
  options?: UseQueryOptions<InterviewReminder[], QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.reminders.upcoming,
    queryFn: () => remindersService.getUpcoming(hours),
    ...options,
  });
};

// Profile hooks
export const useProfile = (options?: UseQueryOptions<UserProfile, QueryError>) => {
  return useQuery({
    queryKey: queryKeys.profile.all,
    queryFn: profileService.getProfile,
    ...options,
  });
};

export const useUpdateProfile = (
  options?: UseMutationOptions<UserProfile, QueryError, any>
) => {
  return useMutation({
    mutationFn: profileService.updateProfile,
    onSuccess: () => {
      invalidateQueries.user();
    },
    ...options,
  });
};

export const useProfileCompleteness = (
  options?: UseQueryOptions<any, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.profile.completeness,
    queryFn: profileService.getCompleteness,
    ...options,
  });
};

// Scraping hooks
export const useScrapingStatus = (
  options?: UseQueryOptions<any, QueryError>
) => {
  return useQuery({
    queryKey: queryKeys.scraping.status,
    queryFn: scrapingApi.getStatus,
    refetchInterval: 5000, // Poll every 5 seconds
    ...options,
  });
};

export const useTriggerScraping = (
  options?: UseMutationOptions<any, QueryError, string | undefined>
) => {
  return useMutation({
    mutationFn: (portal?: string) => scrapingApi.triggerScraping(portal),
    onSuccess: () => {
      invalidateQueries.jobs();
    },
    ...options,
  });
};