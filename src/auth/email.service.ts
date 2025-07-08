import nodemailer, { Transporter } from 'nodemailer';
import { authConfig } from '../config/auth.config';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter;

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify transporter configuration
    this.verifyTransporter();
  }

  /**
   * Verify email transporter configuration
   */
  private async verifyTransporter(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email transporter configured successfully');
    } catch (error) {
      logger.error('Email transporter verification failed:', error);
      logger.warn('Email functionality will be disabled');
    }
  }

  /**
   * Send email
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // In development, log emails instead of sending
      if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_EMAIL) {
        logger.info('Email (dev mode):', {
          to: options.to,
          subject: options.subject,
          preview: options.text?.substring(0, 100)
        });
        return;
      }

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${authConfig.emailFromName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html
      });

      logger.info(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${authConfig.frontendUrl}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to JobFinder!</h1>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for signing up! Please click the button below to verify your email address:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} JobFinder. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your JobFinder Account',
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${authConfig.frontendUrl}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
              <div class="warning">
                <p><strong>Security Notice:</strong></p>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Your password won't change until you create a new one</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} JobFinder. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your JobFinder Password',
      html
    });
  }

  /**
   * Send application notification email
   */
  async sendApplicationNotification(email: string, jobTitle: string, companyName: string, applicationId: string): Promise<void> {
    const applicationUrl = `${authConfig.frontendUrl}/applications/${applicationId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .job-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #ddd; }
            .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Submitted Successfully!</h1>
            </div>
            <div class="content">
              <h2>Thank you for your application</h2>
              <p>Your application has been successfully submitted for the following position:</p>
              <div class="job-details">
                <h3>${jobTitle}</h3>
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Application ID:</strong> ${applicationId}</p>
                <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <div style="text-align: center;">
                <a href="${applicationUrl}" class="button">View Application</a>
              </div>
              <h3>What happens next?</h3>
              <ul>
                <li>The employer will review your application</li>
                <li>You'll be notified if they want to proceed</li>
                <li>Check your application status anytime in your dashboard</li>
              </ul>
              <p>Good luck with your application!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} JobFinder. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `Application Submitted: ${jobTitle} at ${companyName}`,
      html
    });
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const dashboardUrl = `${authConfig.frontendUrl}/dashboard`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .features { background-color: white; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to JobFinder, ${name}!</h1>
            </div>
            <div class="content">
              <h2>Your account is now verified</h2>
              <p>Congratulations! Your email has been verified and you now have full access to all JobFinder features.</p>
              <div class="features">
                <h3>Get started with JobFinder:</h3>
                <ul>
                  <li><strong>Search Jobs:</strong> Browse thousands of job opportunities</li>
                  <li><strong>Save Searches:</strong> Get notified when new jobs match your criteria</li>
                  <li><strong>Track Applications:</strong> Keep track of all your job applications</li>
                  <li><strong>Build Your Profile:</strong> Make yourself discoverable to employers</li>
                </ul>
              </div>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
              </div>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy job hunting!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} JobFinder. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to JobFinder!',
      html
    });
  }

  /**
   * Send account security alert
   */
  async sendSecurityAlert(email: string, alertType: 'login' | 'password_change' | 'suspicious_activity', details: Record<string, any>): Promise<void> {
    const alertTitles = {
      login: 'New Login Detected',
      password_change: 'Password Changed Successfully',
      suspicious_activity: 'Suspicious Activity Detected'
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ffc107; color: #333; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .alert-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #ddd; }
            .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Security Alert</h1>
            </div>
            <div class="content">
              <h2>${alertTitles[alertType]}</h2>
              <div class="alert-box">
                <p><strong>We detected activity on your account:</strong></p>
                <div class="details">
                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  ${details.ip ? `<p><strong>IP Address:</strong> ${details.ip}</p>` : ''}
                  ${details.location ? `<p><strong>Location:</strong> ${details.location}</p>` : ''}
                  ${details.device ? `<p><strong>Device:</strong> ${details.device}</p>` : ''}
                </div>
              </div>
              <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately:</p>
              <div style="text-align: center;">
                <a href="${authConfig.frontendUrl}/account/security" class="button">Secure My Account</a>
              </div>
              <p>For your security, we recommend:</p>
              <ul>
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication</li>
                <li>Reviewing your recent account activity</li>
              </ul>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} JobFinder. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `Security Alert: ${alertTitles[alertType]}`,
      html
    });
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();