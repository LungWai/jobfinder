// User roles
export enum UserRole {
  USER = 'USER',
  EMPLOYER = 'EMPLOYER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

// User and Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole | string;
  isVerified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLogin?: Date | string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isVerified: boolean;
  createdAt?: Date;
  lastLogin?: Date;
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Authentication request/response types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetInput {
  token: string;
  newPassword: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface VerificationTokenData {
  token: string;
  expiresAt: Date;
}

// Additional auth types for backend compatibility
export interface RefreshTokenData {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
}

export interface OAuthUserData {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: string;
}

export interface TwoFactorAuthData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;
  refreshTokenSecret: string;
  refreshTokenExpiry: number;
  bcryptRounds: number;
  emailFromName: string;
  frontendUrl: string;
  requireEmailVerification: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  rememberMeDuration: number;
  verificationTokenExpiry: number;
  passwordResetTokenExpiry: number;
}

export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR = 'SERVER_ERROR'
}

export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
  strength?: 'weak' | 'medium' | 'strong';
  suggestions?: string[];
}

export interface EmailValidationResult {
  isValid: boolean;
  message?: string;
  normalized?: string;
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  userAgent?: string;
}

export interface AccountActivity {
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  permissions: string[];
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
}