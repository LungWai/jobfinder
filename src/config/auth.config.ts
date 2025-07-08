import { AuthConfig } from '../types/auth';

/**
 * Authentication configuration
 */
export const authConfig: AuthConfig = {
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '15m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-this-in-production',
  refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY || '604800000'), // 7 days in milliseconds

  // Password Configuration
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
  passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
  passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
  passwordRequireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',

  // Email Configuration
  emailFromName: process.env.EMAIL_FROM_NAME || 'JobFinder',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false',

  // Security Configuration
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes in milliseconds
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour in milliseconds
  rememberMeDuration: parseInt(process.env.REMEMBER_ME_DURATION || '2592000000'), // 30 days in milliseconds

  // Token Expiry Configuration
  verificationTokenExpiry: parseInt(process.env.VERIFICATION_TOKEN_EXPIRY || '86400000'), // 24 hours in milliseconds
  passwordResetTokenExpiry: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY || '3600000'), // 1 hour in milliseconds
};

/**
 * OAuth Configuration
 */
export const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    scope: ['email', 'profile']
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
    scope: ['user:email']
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackUrl: process.env.LINKEDIN_CALLBACK_URL || '/auth/linkedin/callback',
    scope: ['r_emailaddress', 'r_liteprofile']
  }
};

/**
 * CORS Configuration for authentication routes
 */
export const corsConfig = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Auth-Token', 'X-Refresh-Token'],
  maxAge: 86400 // 24 hours
};

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later'
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later'
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many password reset attempts, please try again later'
  }
};

/**
 * Session configuration
 */
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600000'), // 1 hour
    sameSite: 'strict' as const
  }
};

/**
 * Two-factor authentication configuration
 */
export const twoFactorConfig = {
  issuer: process.env.TWO_FACTOR_ISSUER || 'JobFinder',
  window: parseInt(process.env.TWO_FACTOR_WINDOW || '1'),
  backupCodesCount: parseInt(process.env.BACKUP_CODES_COUNT || '10'),
  qrCodeSize: parseInt(process.env.QR_CODE_SIZE || '200')
};

/**
 * Security headers configuration
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

/**
 * Validation rules
 */
export const validationRules = {
  email: {
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  name: {
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  phone: {
    minLength: 10,
    maxLength: 15,
    pattern: /^\+?[\d\s()-]+$/
  }
};

/**
 * Get configuration value with type safety
 */
export function getConfig<K extends keyof AuthConfig>(key: K): AuthConfig[K] {
  return authConfig[key];
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const featureFlags: Record<string, boolean> = {
    emailVerification: authConfig.requireEmailVerification,
    oauth: !!(oauthConfig.google.clientId || oauthConfig.github.clientId),
    twoFactor: process.env.ENABLE_TWO_FACTOR === 'true',
    apiKeys: process.env.ENABLE_API_KEYS === 'true',
    passwordStrengthCheck: authConfig.passwordRequireUppercase || authConfig.passwordRequireLowercase || authConfig.passwordRequireNumbers || authConfig.passwordRequireSpecialChars
  };

  return featureFlags[feature] || false;
}

/**
 * Validate configuration on startup
 */
export function validateAuthConfig(): void {
  const errors: string[] = [];

  // Check required environment variables
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-this-in-production') {
    errors.push('JWT_SECRET must be set in production');
  }

  if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET === 'your-refresh-secret-change-this-in-production') {
    errors.push('REFRESH_TOKEN_SECRET must be set in production');
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-session-secret-change-this-in-production') {
    errors.push('SESSION_SECRET must be set in production');
  }

  // Check email configuration
  if (authConfig.requireEmailVerification && !process.env.SMTP_HOST) {
    errors.push('SMTP configuration is required when email verification is enabled');
  }

  // Log warnings in development, throw errors in production
  if (errors.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Authentication configuration errors:\n${errors.join('\n')}`);
    } else {
      console.warn('Authentication configuration warnings:', errors);
    }
  }
}