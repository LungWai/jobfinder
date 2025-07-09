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

// Application Status types
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

// Interview types
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

// Document types
export type DocumentType = 
  | 'RESUME'
  | 'COVER_LETTER'
  | 'PORTFOLIO'
  | 'REFERENCE'
  | 'TRANSCRIPT'
  | 'CERTIFICATE'
  | 'OTHER';

// Reminder types
export type ReminderType = 
  | 'EMAIL'
  | 'PUSH'
  | 'SMS';

// Alert frequency types
export type AlertFrequency = 
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY';

// User role types
export type UserRole = 'USER' | 'ADMIN' | 'EMPLOYER';