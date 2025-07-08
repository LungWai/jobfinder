import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/email.service';
import { 
  LoginCredentials, 
  RegisterInput, 
  AuthTokenPayload, 
  PasswordResetRequest,
  AuthResponse,
  VerificationTokenData
} from '../types/auth';
import { validateEmail, validatePassword } from '../utils/validators';
import { authConfig } from '../config/auth.config';
import { logger } from '../utils/logger';

export class AuthService {
  private prisma: PrismaClient;
  private emailService: EmailService;

  constructor() {
    this.prisma = new PrismaClient();
    this.emailService = new EmailService();
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    try {
      // Validate input
      if (!validateEmail(input.email)) {
        throw new Error('Invalid email format');
      }

      const passwordValidation = validatePassword(input.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, authConfig.bcryptRounds);

      // Generate verification token
      const verificationToken = this.generateVerificationToken();

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          password: hashedPassword,
          name: input.name,
          verificationToken,
          verificationTokenExpiry: new Date(Date.now() + authConfig.verificationTokenExpiry),
          isVerified: false,
          role: 'USER'
        }
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(user.email, verificationToken);

      // Generate auth tokens
      const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

      // Store refresh token
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + authConfig.refreshTokenExpiry)
        }
      });

      logger.info(`User registered successfully: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Validate email
      if (!validateEmail(credentials.email)) {
        throw new Error('Invalid email format');
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Check if user is verified
      if (!user.isVerified && authConfig.requireEmailVerification) {
        throw new Error('Please verify your email before logging in');
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

      // Store refresh token
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + authConfig.refreshTokenExpiry)
        }
      });

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      logger.info(`User logged in successfully: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null
        }
      });

      logger.info(`Email verified for user: ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        // Don't reveal if user exists
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      // Generate reset token
      const resetToken = this.generateVerificationToken();

      // Update user with reset token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry: new Date(Date.now() + authConfig.passwordResetTokenExpiry)
        }
      });

      // Send reset email
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);

      logger.info(`Password reset requested for: ${user.email}`);
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      const user = await this.prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, authConfig.bcryptRounds);

      // Update user password and clear reset token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      // Invalidate all refresh tokens for security
      await this.prisma.refreshToken.deleteMany({
        where: { userId: user.id }
      });

      logger.info(`Password reset successfully for: ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, authConfig.refreshTokenSecret) as AuthTokenPayload;

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.userId,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiry }
      );

      return { accessToken };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Delete specific refresh token
        await this.prisma.refreshToken.delete({
          where: { token: refreshToken }
        });
      } else {
        // Delete all refresh tokens for user
        await this.prisma.refreshToken.deleteMany({
          where: { userId }
        });
      }

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, authConfig.jwtSecret) as AuthTokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(userId: string, email: string, role: string): { accessToken: string; refreshToken: string } {
    const payload: AuthTokenPayload = { userId, email, role };

    const accessToken = jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiry
    });

    const refreshToken = jwt.sign(payload, authConfig.refreshTokenSecret, {
      expiresIn: authConfig.refreshTokenExpiry / 1000 // Convert to seconds
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      // Delete expired refresh tokens
      const deletedRefreshTokens = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      // Clear expired verification tokens
      const clearedVerificationTokens = await this.prisma.user.updateMany({
        where: {
          verificationTokenExpiry: {
            lt: new Date()
          }
        },
        data: {
          verificationToken: null,
          verificationTokenExpiry: null
        }
      });

      // Clear expired reset tokens
      const clearedResetTokens = await this.prisma.user.updateMany({
        where: {
          resetTokenExpiry: {
            lt: new Date()
          }
        },
        data: {
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      logger.info(`Cleanup completed: ${deletedRefreshTokens.count} refresh tokens, ${clearedVerificationTokens.count} verification tokens, ${clearedResetTokens.count} reset tokens`);
    } catch (error) {
      logger.error('Token cleanup error:', error);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();