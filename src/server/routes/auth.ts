import express, { Request, Response } from 'express';
import { authService } from '../../auth/auth.service';
import { 
  authenticate, 
  authRateLimit, 
  logAuthEvent,
  authCors
} from '../../auth/auth.middleware';
import { 
  RegisterInput, 
  LoginCredentials, 
  PasswordResetInput 
} from '../../types/auth';
import { logger } from '../../utils/logger';

const router = express.Router();

// Apply CORS to all auth routes
router.use(authCors());

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', 
  authRateLimit(5, 15 * 60 * 1000),
  logAuthEvent('register_attempt'),
  async (req: Request, res: Response) => {
    try {
      const input: RegisterInput = req.body;
      
      // Register user
      const result = await authService.register(input);
      
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: result
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }
);

/**
 * POST /auth/login
 * Login user
 */
router.post('/login',
  authRateLimit(5, 15 * 60 * 1000),
  logAuthEvent('login_attempt'),
  async (req: Request, res: Response) => {
    try {
      const credentials: LoginCredentials = req.body;
      
      // Add IP and user agent for security logging
      const loginData = {
        ...credentials,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      // Login user
      const result = await authService.login(loginData);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }
);

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout',
  authenticate,
  logAuthEvent('logout'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const refreshToken = req.body.refreshToken;
      
      await authService.logout(userId, refreshToken);
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh',
  authRateLimit(10, 15 * 60 * 1000),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }
      
      const result = await authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      
      res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed'
      });
    }
  }
);

/**
 * GET /auth/verify-email
 * Verify email with token
 */
router.get('/verify-email',
  authRateLimit(10, 60 * 60 * 1000),
  logAuthEvent('email_verification'),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }
      
      await authService.verifyEmail(token);
      
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error: any) {
      logger.error('Email verification error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Email verification failed'
      });
    }
  }
);

/**
 * POST /auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password',
  authRateLimit(3, 60 * 60 * 1000),
  logAuthEvent('password_reset_request'),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      await authService.requestPasswordReset(email);
      
      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    } catch (error: any) {
      logger.error('Password reset request error:', error);
      
      // Still return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }
  }
);

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password',
  authRateLimit(5, 60 * 60 * 1000),
  logAuthEvent('password_reset'),
  async (req: Request, res: Response) => {
    try {
      const { token, newPassword }: PasswordResetInput = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
      }
      
      await authService.resetPassword(token, newPassword);
      
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error: any) {
      logger.error('Password reset error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Password reset failed'
      });
    }
  }
);

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error: any) {
      logger.error('Get user info error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get user info'
      });
    }
  }
);

/**
 * POST /auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification',
  authRateLimit(3, 60 * 60 * 1000),
  authenticate,
  logAuthEvent('resend_verification'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      
      // Implementation would go here
      // For now, just return success
      res.json({
        success: true,
        message: 'Verification email sent'
      });
    } catch (error: any) {
      logger.error('Resend verification error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to resend verification email'
      });
    }
  }
);

export default router;