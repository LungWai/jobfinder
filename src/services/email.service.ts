import nodemailer, { Transporter } from 'nodemailer';
import Email from 'email-templates';
import path from 'path';
import logger from '../utils/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  locals?: Record<string, any>;
  attachments?: any[];
  cc?: string | string[];
  bcc?: string | string[];
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName: string;
}

export class EmailService {
  private transporter: Transporter;
  private email: Email;
  private config: EmailConfig;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.ENABLE_EMAIL === 'true' || process.env.NODE_ENV === 'production';
    
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jobfinder.com',
      fromName: process.env.EMAIL_FROM_NAME || 'JobFinder'
    };

    // Initialize transporter
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth
    });

    // Initialize email templates
    this.email = new Email({
      message: {
        from: `"${this.config.fromName}" <${this.config.from}>`
      },
      send: this.isEnabled,
      preview: process.env.NODE_ENV === 'development',
      transport: this.transporter,
      views: {
        root: path.join(__dirname, '..', 'templates', 'emails'),
        options: {
          extension: 'pug'
        }
      },
      juiceResources: {
        preserveImportant: true,
        webResources: {
          relativeTo: path.join(__dirname, '..', 'templates', 'emails')
        }
      }
    });

    // Verify transporter configuration
    this.verifyTransporter();
  }

  /**
   * Verify email transporter configuration
   */
  private async verifyTransporter(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('Email service is disabled');
      return;
    }

    try {
      await this.transporter.verify();
      logger.info('Email transporter configured successfully');
    } catch (error) {
      logger.error('Email transporter verification failed:', error);
      logger.warn('Email functionality may not work properly');
    }
  }

  /**
   * Send email using template
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // In development, log emails if not enabled
      if (process.env.NODE_ENV === 'development' && !this.isEnabled) {
        logger.info('Email (dev mode):', {
          to: options.to,
          subject: options.subject,
          template: options.template,
          locals: options.locals
        });
        return;
      }

      // Send email
      const result = await this.email.send({
        template: options.template || 'default',
        message: {
          to: options.to,
          subject: options.subject,
          cc: options.cc,
          bcc: options.bcc,
          attachments: options.attachments
        },
        locals: {
          ...options.locals,
          appName: this.config.fromName,
          year: new Date().getFullYear(),
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
        }
      });

      logger.info('Email sent successfully:', {
        to: options.to,
        subject: options.subject,
        template: options.template
      });
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string, name?: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Verify Your JobFinder Account',
      template: 'verification',
      locals: {
        name: name || 'User',
        verificationUrl,
        expiresIn: '24 hours'
      }
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    
    await this.sendEmail({
      to: email,
      subject: 'Welcome to JobFinder!',
      template: 'welcome',
      locals: {
        name,
        dashboardUrl,
        features: [
          {
            title: 'Search Jobs',
            description: 'Browse thousands of job opportunities from top companies'
          },
          {
            title: 'Save Searches',
            description: 'Get notified when new jobs match your criteria'
          },
          {
            title: 'Track Applications',
            description: 'Keep track of all your job applications in one place'
          },
          {
            title: 'Build Your Profile',
            description: 'Make yourself discoverable to employers'
          }
        ]
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, name?: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Reset Your JobFinder Password',
      template: 'password-reset',
      locals: {
        name: name || 'User',
        resetUrl,
        expiresIn: '1 hour'
      }
    });
  }

  /**
   * Send interview reminder email
   */
  async sendInterviewReminderEmail(
    email: string, 
    name: string,
    interviewDetails: {
      company: string;
      position: string;
      date: Date;
      time: string;
      location?: string;
      type: 'in_person' | 'phone' | 'video';
      notes?: string;
      meetingLink?: string;
    }
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Interview Reminder: ${interviewDetails.company} - ${interviewDetails.position}`,
      template: 'interview-reminder',
      locals: {
        name,
        interview: {
          ...interviewDetails,
          formattedDate: interviewDetails.date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        },
        dashboardUrl: `${process.env.FRONTEND_URL}/interviews`
      }
    });
  }

  /**
   * Send application status update email
   */
  async sendApplicationStatusEmail(
    email: string,
    name: string,
    applicationDetails: {
      jobTitle: string;
      company: string;
      previousStatus: string;
      newStatus: string;
      message?: string;
      applicationId: string;
    }
  ): Promise<void> {
    const statusMessages = {
      applied: 'Your application has been submitted successfully.',
      under_review: 'Your application is being reviewed by the employer.',
      shortlisted: 'Congratulations! You have been shortlisted for this position.',
      interview_scheduled: 'Great news! An interview has been scheduled.',
      rejected: 'Unfortunately, your application was not successful this time.',
      offered: 'Congratulations! You have received a job offer!',
      accepted: 'Your job offer acceptance has been confirmed.',
      withdrawn: 'Your application has been withdrawn.'
    };

    const statusColors = {
      applied: '#007bff',
      under_review: '#17a2b8',
      shortlisted: '#28a745',
      interview_scheduled: '#28a745',
      rejected: '#dc3545',
      offered: '#28a745',
      accepted: '#28a745',
      withdrawn: '#6c757d'
    };

    await this.sendEmail({
      to: email,
      subject: `Application Update: ${applicationDetails.jobTitle} at ${applicationDetails.company}`,
      template: 'application-status',
      locals: {
        name,
        application: {
          ...applicationDetails,
          statusMessage: statusMessages[applicationDetails.newStatus as keyof typeof statusMessages] || 'Your application status has been updated.',
          statusColor: statusColors[applicationDetails.newStatus as keyof typeof statusColors] || '#007bff'
        },
        applicationUrl: `${process.env.FRONTEND_URL}/applications/${applicationDetails.applicationId}`,
        dashboardUrl: `${process.env.FRONTEND_URL}/applications`
      }
    });
  }

  /**
   * Send reminder email (generic)
   */
  async sendReminderEmail(
    email: string,
    name: string,
    reminderTitle: string,
    reminderDescription: string,
    context?: string,
    actionUrl?: string
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Reminder: ${reminderTitle}`,
      template: 'reminder',
      locals: {
        name,
        title: reminderTitle,
        description: reminderDescription,
        context,
        actionUrl: actionUrl || `${process.env.FRONTEND_URL}/reminders`,
        actionText: actionUrl ? 'View Details' : 'View All Reminders'
      }
    });
  }

  /**
   * Send job alert email
   */
  async sendJobAlertEmail(
    email: string,
    name: string,
    jobs: Array<{
      id: string;
      title: string;
      company: string;
      location: string;
      salary?: string;
      postedDate: Date;
    }>,
    searchCriteria: string
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `New Jobs Matching: ${searchCriteria}`,
      template: 'job-alert',
      locals: {
        name,
        searchCriteria,
        jobCount: jobs.length,
        jobs: jobs.map(job => ({
          ...job,
          url: `${process.env.FRONTEND_URL}/jobs/${job.id}`,
          postedAgo: this.getTimeAgo(job.postedDate)
        })),
        manageAlertsUrl: `${process.env.FRONTEND_URL}/alerts`
      }
    });
  }

  /**
   * Send account security alert
   */
  async sendSecurityAlert(
    email: string, 
    name: string,
    alertType: 'login' | 'password_change' | 'suspicious_activity', 
    details: Record<string, any>
  ): Promise<void> {
    const alertTitles = {
      login: 'New Login Detected',
      password_change: 'Password Changed Successfully',
      suspicious_activity: 'Suspicious Activity Detected'
    };

    const alertDescriptions = {
      login: 'A new login to your account was detected.',
      password_change: 'Your password has been successfully changed.',
      suspicious_activity: 'We detected unusual activity on your account.'
    };

    await this.sendEmail({
      to: email,
      subject: `Security Alert: ${alertTitles[alertType]}`,
      template: 'security-alert',
      locals: {
        name,
        alertType,
        alertTitle: alertTitles[alertType],
        alertDescription: alertDescriptions[alertType],
        details: {
          time: new Date().toLocaleString(),
          ...details
        },
        securityUrl: `${process.env.FRONTEND_URL}/account/security`
      }
    });
  }

  /**
   * Send bulk email (for admin use)
   */
  async sendBulkEmail(
    recipients: Array<{ email: string; name: string }>,
    subject: string,
    template: string,
    commonLocals: Record<string, any>
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        await this.sendEmail({
          to: recipient.email,
          subject,
          template,
          locals: {
            ...commonLocals,
            name: recipient.name
          }
        });
        sent++;
      } catch (error) {
        logger.error(`Failed to send email to ${recipient.email}:`, error);
        failed++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { sent, failed };
  }

  /**
   * Helper function to get relative time
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
      }
    }

    return 'just now';
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(testEmail: string): Promise<boolean> {
    try {
      await this.sendEmail({
        to: testEmail,
        subject: 'JobFinder Email Configuration Test',
        template: 'test',
        locals: {
          message: 'If you received this email, your email configuration is working correctly!'
        }
      });
      return true;
    } catch (error) {
      logger.error('Email configuration test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();