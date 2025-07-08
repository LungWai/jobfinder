// Common API response types
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// User and Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  userId: string;
  bio?: string;
  location?: string;
  phone?: string;
  skills: string[];
  experience?: string;
  education?: string;
  preferredJobCategories: string[];
  preferredLocations: string[];
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  profilePictureUrl?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RegisterResponse extends AuthTokens {
  user: User;
}

// Job Application types
export interface JobApplication {
  id: string;
  userId: string;
  jobListingId: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes?: string;
  coverLetter?: string;
  resumeUrl?: string;
  createdAt: string;
  updatedAt: string;
  jobListing?: JobListing;
  statusHistory: ApplicationStatusHistory[];
  interviews: Interview[];
  documents: ApplicationDocument[];
}

export type ApplicationStatus = 
  | 'DRAFT'
  | 'APPLIED'
  | 'REVIEWING'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEWED'
  | 'OFFER_RECEIVED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  notes?: string;
  createdAt: string;
}

export interface CreateApplicationRequest {
  jobListingId: string;
  coverLetter?: string;
  resumeUrl?: string;
  notes?: string;
}

export interface UpdateApplicationRequest {
  status?: ApplicationStatus;
  coverLetter?: string;
  resumeUrl?: string;
  notes?: string;
}

// Interview types
export interface Interview {
  id: string;
  applicationId: string;
  type: InterviewType;
  scheduledAt: string;
  duration?: number; // in minutes
  location?: string;
  meetingUrl?: string;
  interviewerName?: string;
  interviewerTitle?: string;
  notes?: string;
  status: InterviewStatus;
  createdAt: string;
  updatedAt: string;
  application?: JobApplication;
  reminders: InterviewReminder[];
}

export type InterviewType = 
  | 'PHONE_SCREENING'
  | 'TECHNICAL'
  | 'BEHAVIORAL'
  | 'ONSITE'
  | 'PANEL'
  | 'FINAL';

export type InterviewStatus = 
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export interface CreateInterviewRequest {
  applicationId: string;
  type: InterviewType;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingUrl?: string;
  interviewerName?: string;
  interviewerTitle?: string;
  notes?: string;
}

export interface UpdateInterviewRequest {
  type?: InterviewType;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  meetingUrl?: string;
  interviewerName?: string;
  interviewerTitle?: string;
  notes?: string;
  status?: InterviewStatus;
}

// Document types
export interface ApplicationDocument {
  id: string;
  applicationId: string;
  name: string;
  type: DocumentType;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 
  | 'RESUME'
  | 'COVER_LETTER'
  | 'PORTFOLIO'
  | 'REFERENCE'
  | 'TRANSCRIPT'
  | 'CERTIFICATE'
  | 'OTHER';

export interface UploadDocumentRequest {
  applicationId: string;
  name: string;
  type: DocumentType;
  file: File;
}

// Reminder types
export interface InterviewReminder {
  id: string;
  interviewId: string;
  reminderTime: string;
  type: ReminderType;
  isSent: boolean;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType = 
  | 'EMAIL'
  | 'PUSH'
  | 'SMS';

export interface CreateReminderRequest {
  interviewId: string;
  reminderTime: string;
  type: ReminderType;
}

// Saved Search types
export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: JobFilters;
  emailAlerts: boolean;
  alertFrequency?: AlertFrequency;
  lastAlertSent?: string;
  createdAt: string;
  updatedAt: string;
}

export type AlertFrequency = 
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY';

export interface CreateSavedSearchRequest {
  name: string;
  filters: JobFilters;
  emailAlerts?: boolean;
  alertFrequency?: AlertFrequency;
}

// Company types
export interface Company {
  id: string;
  name: string;
  normalizedName: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  jobListings?: JobListing[];
}

// Analytics types
export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  recentApplications: JobApplication[];
  conversionRate: number;
  averageTimeToResponse: number; // in days
}

export interface InterviewStats {
  total: number;
  upcoming: number;
  completed: number;
  byType: Record<InterviewType, number>;
  successRate: number;
}

export interface UserActivityStats {
  applicationsThisWeek: number;
  applicationsThisMonth: number;
  interviewsThisWeek: number;
  interviewsThisMonth: number;
  savedSearches: number;
  profileCompleteness: number; // percentage
}

// Import existing job types
export type { JobListing, JobFilters, PaginatedResponse, FilterOptions, ScrapingStats } from './job';

// Re-export JobListing for imports
import type { JobListing } from './job';
export { JobListing };