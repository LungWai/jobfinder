// TypeScript interfaces for job application tracking features

import { 
  ApplicationStatus, 
  InterviewType, 
  InterviewStatus, 
  InterviewResult,
  DocumentType,
  ReminderType,
  AlertFrequency
} from '@prisma/client';

// Application interfaces
export interface CreateApplicationInput {
  jobListingId: string;
  status?: ApplicationStatus;
  appliedVia?: string;
  applicationUrl?: string;
  applicationEmail?: string;
  coverLetter?: string;
  customResume?: boolean;
  resumeVersion?: string;
  notes?: string;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  appliedVia?: string;
  applicationUrl?: string;
  applicationEmail?: string;
  coverLetter?: string;
  customResume?: boolean;
  resumeVersion?: string;
  notes?: string;
  companyResponse?: string;
  rejectionReason?: string;
  offerDetails?: string;
  offerSalary?: number;
  offerDeadline?: Date;
}

export interface ApplicationFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  jobTitle?: string;
  company?: string;
  appliedAfter?: Date;
  appliedBefore?: Date;
  hasInterview?: boolean;
  hasOffer?: boolean;
}

export interface ApplicationStatistics {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number;
  averageResponseTime: number;
  interviewConversionRate: number;
  offerRate: number;
  recentApplications: number;
  upcomingInterviews: number;
}

// Interview interfaces
export interface CreateInterviewInput {
  applicationId: string;
  type: InterviewType;
  round?: number;
  scheduledAt: Date;
  duration?: number;
  location?: string;
  locationDetails?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  jobDescription?: string;
  preparationNotes?: string;
  questionsToAsk?: string[];
}

export interface UpdateInterviewInput {
  type?: InterviewType;
  status?: InterviewStatus;
  scheduledAt?: Date;
  duration?: number;
  location?: string;
  locationDetails?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  jobDescription?: string;
  preparationNotes?: string;
  questionsToAsk?: string[];
  interviewNotes?: string;
  feedback?: string;
  rating?: number;
  result?: InterviewResult;
  nextSteps?: string;
}

export interface InterviewerInput {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  notes?: string;
}

export interface InterviewFilters {
  status?: InterviewStatus;
  type?: InterviewType;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  result?: InterviewResult;
}

// Document interfaces
export interface UploadDocumentInput {
  applicationId?: string;
  type: DocumentType;
  name: string;
  tags?: string[];
  version?: string;
}

export interface DocumentFilters {
  type?: DocumentType;
  applicationId?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface DocumentVersionInput {
  documentId: string;
  version: string;
}

// Reminder interfaces
export interface CreateReminderInput {
  applicationId?: string;
  interviewId?: string;
  type: ReminderType;
  title: string;
  description?: string;
  dueDate: Date;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string;
  dueDate?: Date;
  isCompleted?: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: Date;
}

export interface ReminderFilters {
  type?: ReminderType;
  isCompleted?: boolean;
  isSnoozed?: boolean;
  dueBefore?: Date;
  dueAfter?: Date;
  applicationId?: string;
  interviewId?: string;
}

// File upload configuration
export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  uploadDir: string;
}

export interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Status workflow validation
export const STATUS_WORKFLOW: Record<ApplicationStatus, ApplicationStatus[]> = {
  BOOKMARKED: ['PREPARING', 'APPLIED', 'APPLIED_EXTERNAL', 'WITHDRAWN'],
  PREPARING: ['APPLIED', 'APPLIED_EXTERNAL', 'BOOKMARKED', 'WITHDRAWN'],
  APPLIED: ['IN_REVIEW', 'ASSESSMENT', 'INTERVIEW_SCHEDULED', 'REJECTED', 'WITHDRAWN'],
  APPLIED_EXTERNAL: ['IN_REVIEW', 'ASSESSMENT', 'INTERVIEW_SCHEDULED', 'REJECTED', 'WITHDRAWN'],
  IN_REVIEW: ['ASSESSMENT', 'INTERVIEW_SCHEDULED', 'REJECTED', 'NOT_SELECTED'],
  ASSESSMENT: ['INTERVIEW_SCHEDULED', 'REJECTED', 'NOT_SELECTED'],
  INTERVIEW_SCHEDULED: ['INTERVIEW_COMPLETED', 'WITHDRAWN'],
  INTERVIEW_COMPLETED: ['INTERVIEW_SCHEDULED', 'REFERENCE_CHECK', 'OFFER_RECEIVED', 'REJECTED', 'NOT_SELECTED'],
  REFERENCE_CHECK: ['OFFER_RECEIVED', 'REJECTED', 'NOT_SELECTED'],
  OFFER_RECEIVED: ['NEGOTIATING', 'ACCEPTED', 'REJECTED'],
  NEGOTIATING: ['OFFER_RECEIVED', 'ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
  NOT_SELECTED: []
};

// Automated reminder configurations
export interface AutomatedReminderConfig {
  type: ReminderType;
  trigger: ApplicationStatus | 'INTERVIEW_SCHEDULED';
  daysOffset: number;
  title: string;
  description: string;
}

export const AUTOMATED_REMINDERS: AutomatedReminderConfig[] = [
  {
    type: ReminderType.FOLLOW_UP,
    trigger: ApplicationStatus.APPLIED,
    daysOffset: 7,
    title: 'Follow up on application',
    description: 'It has been a week since you applied. Consider sending a follow-up email.'
  },
  {
    type: ReminderType.INTERVIEW_PREP,
    trigger: 'INTERVIEW_SCHEDULED',
    daysOffset: -1,
    title: 'Prepare for interview',
    description: 'Your interview is tomorrow. Review your preparation notes and questions.'
  },
  {
    type: ReminderType.INTERVIEW_DAY,
    trigger: 'INTERVIEW_SCHEDULED',
    daysOffset: 0,
    title: 'Interview today',
    description: 'Good luck with your interview today!'
  },
  {
    type: ReminderType.THANK_YOU_NOTE,
    trigger: ApplicationStatus.INTERVIEW_COMPLETED,
    daysOffset: 1,
    title: 'Send thank you note',
    description: 'Send a thank you email to your interviewers.'
  },
  {
    type: ReminderType.DECISION_DEADLINE,
    trigger: ApplicationStatus.OFFER_RECEIVED,
    daysOffset: -2,
    title: 'Offer decision deadline approaching',
    description: 'Your offer deadline is in 2 days. Make your decision soon.'
  }
];