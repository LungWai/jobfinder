// Export all services from a single entry point
export { default as api, updateTokens } from './api';
export { jobsApi, scrapingApi } from './api';
export { authService } from './auth.service';
export { jobsService } from './jobs.service';
export { applicationsService } from './applications.service';
export { interviewsService } from './interviews.service';
export { documentsService } from './documents.service';
export { remindersService } from './reminders.service';
export { profileService } from './profile.service';

// Re-export types for convenience
export type {
  // Common types
  ApiError,
  ApiResponse,
  PaginatedResponse,
  
  // Auth types
  User,
  UserProfile,
  AuthTokens,
  LoginResponse,
  RegisterResponse,
  
  // Job types
  JobListing,
  JobFilters,
  FilterOptions,
  ScrapingStats,
  
  // Application types
  JobApplication,
  ApplicationStatus,
  ApplicationStatusHistory,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationStats,
  
  // Interview types
  Interview,
  InterviewType,
  InterviewStatus,
  CreateInterviewRequest,
  UpdateInterviewRequest,
  InterviewStats,
  
  // Document types
  ApplicationDocument,
  DocumentType,
  UploadDocumentRequest,
  
  // Reminder types
  InterviewReminder,
  ReminderType,
  CreateReminderRequest,
  
  // Other types
  SavedSearch,
  AlertFrequency,
  Company,
  UserActivityStats,
} from '../types/api';