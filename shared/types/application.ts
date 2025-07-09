import { ApplicationStatus, InterviewType, InterviewStatus, DocumentType, ReminderType, AlertFrequency } from './api';
import { JobListing, JobFilters } from './job';

// Job Application types
export interface JobApplication {
  id: string;
  userId: string;
  jobListingId: string;
  status: ApplicationStatus;
  appliedAt: Date | string;
  notes?: string;
  coverLetter?: string;
  resumeUrl?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  jobListing?: JobListing;
  statusHistory?: ApplicationStatusHistory[];
  interviews?: Interview[];
  documents?: ApplicationDocument[];
}

export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  notes?: string;
  createdAt: Date | string;
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
  scheduledAt: Date | string;
  duration?: number; // in minutes
  location?: string;
  meetingUrl?: string;
  interviewerName?: string;
  interviewerTitle?: string;
  notes?: string;
  status: InterviewStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  application?: JobApplication;
  reminders?: InterviewReminder[];
}

export interface CreateInterviewRequest {
  applicationId: string;
  type: InterviewType;
  scheduledAt: Date | string;
  duration?: number;
  location?: string;
  meetingUrl?: string;
  interviewerName?: string;
  interviewerTitle?: string;
  notes?: string;
}

export interface UpdateInterviewRequest {
  type?: InterviewType;
  scheduledAt?: Date | string;
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
  uploadedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

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
  reminderTime: Date | string;
  type: ReminderType;
  isSent: boolean;
  sentAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateReminderRequest {
  interviewId: string;
  reminderTime: Date | string;
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
  lastAlertSent?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSavedSearchRequest {
  name: string;
  filters: JobFilters;
  emailAlerts?: boolean;
  alertFrequency?: AlertFrequency;
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