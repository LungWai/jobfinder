// Re-export shared types
export * from '../../../shared/types/api';
export * from '../../../shared/types/auth';
export * from '../../../shared/types/application';

// Frontend-specific types that extend shared types
import { User as SharedUser, AuthResponse as SharedAuthResponse, UserProfile } from '../../../shared/types/auth';

// Extend User for frontend with isEmailVerified alias
export interface User extends Omit<SharedUser, 'isVerified'> {
  isEmailVerified: boolean;
  profile?: UserProfile;
}

// Auth tokens for frontend
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

// Company types (not in shared yet)
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

// Import existing job types
export type { JobListing, JobFilters, PaginatedResponse, FilterOptions, ScrapingStats } from './job';

// Re-export JobListing for imports
import type { JobListing } from './job';
export { JobListing };