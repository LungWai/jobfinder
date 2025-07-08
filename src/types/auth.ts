/**
 * Authentication and authorization type definitions
 */

// User roles
export enum UserRole {
  USER = 'USER',
  EMPLOYER = 'EMPLOYER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

// User registration input
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// JWT token payload
export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// User data returned from auth operations
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isVerified: boolean;
  createdAt?: Date;
  lastLogin?: Date;
}

// Authentication response
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// Password reset request
export interface PasswordResetRequest {
  email: string;
}

// Password reset input
export interface PasswordResetInput {
  token: string;
  newPassword: string;
}

// Email verification data
export interface VerificationTokenData {
  token: string;
  expiresAt: Date;
}

// Refresh token data
export interface RefreshTokenData {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Session data
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

// OAuth provider data
export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
}

// OAuth user data
export interface OAuthUserData {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: string;
}

// Two-factor authentication data
export interface TwoFactorAuthData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

// Authentication configuration
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

// Authentication error types
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

// Authentication error
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

// Password validation result
export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
  strength?: 'weak' | 'medium' | 'strong';
  suggestions?: string[];
}

// Email validation result
export interface EmailValidationResult {
  isValid: boolean;
  message?: string;
  normalized?: string;
}

// Login attempt tracking
export interface LoginAttempt {
  email: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  userAgent?: string;
}

// Account activity log
export interface AccountActivity {
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// API key for service authentication
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