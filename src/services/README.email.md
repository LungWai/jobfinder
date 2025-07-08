# Email Service Documentation

## Overview

The email service provides a robust, template-based email system for the JobFinder application. It uses Nodemailer for sending emails and email-templates with Pug for templating.

## Features

- **Template-based emails** with HTML and plain text versions
- **Development mode** with email preview instead of sending
- **Bulk email support** with rate limiting
- **Comprehensive email types** for all application needs
- **Responsive email designs** that work across all email clients
- **Easy configuration** through environment variables

## Configuration

Add these environment variables to your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@jobfinder.com
EMAIL_FROM_NAME=JobFinder

# Email Behavior
ENABLE_EMAIL=true                    # Set to true to send emails in production
EMAIL_PREVIEW=true                   # Preview emails in browser (development)
EMAIL_SEND_IN_DEVELOPMENT=false      # Actually send emails in development
```

### Gmail Configuration

1. Enable 2-factor authentication on your Gmail account
2. Generate an app-specific password:
   - Go to https://myaccount.google.com/security
   - Select "2-Step Verification" → "App passwords"
   - Generate a password for "Mail"
3. Use this app password as `SMTP_PASS`

## Usage

### Import the Service

```typescript
import { emailService } from '../services/email.service';
```

### Available Methods

#### 1. Verification Email
```typescript
await emailService.sendVerificationEmail(
  'user@example.com',
  'verification-token',
  'John Doe'
);
```

#### 2. Welcome Email
```typescript
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe'
);
```

#### 3. Password Reset
```typescript
await emailService.sendPasswordResetEmail(
  'user@example.com',
  'reset-token',
  'John Doe'
);
```

#### 4. Interview Reminder
```typescript
await emailService.sendInterviewReminderEmail(
  'user@example.com',
  'John Doe',
  {
    company: 'Tech Corp',
    position: 'Software Engineer',
    date: new Date('2024-01-20'),
    time: '2:00 PM',
    location: '123 Main St',
    type: 'in_person',
    notes: 'Bring your portfolio',
    meetingLink: 'https://zoom.us/...'
  }
);
```

#### 5. Application Status Update
```typescript
await emailService.sendApplicationStatusEmail(
  'user@example.com',
  'John Doe',
  {
    jobTitle: 'Software Engineer',
    company: 'Tech Corp',
    previousStatus: 'applied',
    newStatus: 'shortlisted',
    message: 'Congratulations!',
    applicationId: 'app-123'
  }
);
```

#### 6. Generic Reminder
```typescript
await emailService.sendReminderEmail(
  'user@example.com',
  'John Doe',
  'Follow up on application',
  'Remember to follow up with HR',
  'Applied 3 days ago',
  'https://jobfinder.com/applications/123'
);
```

#### 7. Job Alert
```typescript
await emailService.sendJobAlertEmail(
  'user@example.com',
  'John Doe',
  [
    {
      id: 'job-1',
      title: 'Frontend Developer',
      company: 'Web Co',
      location: 'Hong Kong',
      salary: 'HK$30k-40k',
      postedDate: new Date()
    }
  ],
  'Frontend Developer in Hong Kong'
);
```

#### 8. Security Alert
```typescript
await emailService.sendSecurityAlert(
  'user@example.com',
  'John Doe',
  'login', // or 'password_change' or 'suspicious_activity'
  {
    ip: '192.168.1.1',
    location: 'Hong Kong',
    device: 'Chrome on Windows',
    browser: 'Chrome 120.0'
  }
);
```

#### 9. Bulk Email
```typescript
const result = await emailService.sendBulkEmail(
  [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' }
  ],
  'Newsletter Subject',
  'newsletter', // template name
  {
    content: 'Newsletter content',
    month: 'January 2024'
  }
);
console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
```

## Testing

Run the email test script to verify your configuration:

```bash
npm run test:email your-email@example.com
```

This will send test emails of each type to the specified address.

## Creating New Email Templates

1. Create a new directory in `/src/templates/emails/[template-name]/`

2. Create `html.pug` for the HTML version:
```pug
extends ../html

block header
  h2 Your Email Title

block content
  p Hi #{name},
  p Your email content here...
```

3. Create `text.pug` for the plain text version:
```pug
extends ../text

block header
  | YOUR EMAIL TITLE
  | ================

block content
  | Hi #{name},
  | 
  | Your email content here...
```

4. Use the template in your code:
```typescript
await emailService.send({
  to: 'user@example.com',
  subject: 'Your Subject',
  template: 'template-name',
  locals: {
    name: 'John Doe',
    // other variables
  }
});
```

## Template Variables

All templates have access to these default variables:
- `appName` - Application name (from EMAIL_FROM_NAME)
- `year` - Current year
- `frontendUrl` - Frontend URL (from FRONTEND_URL)

## Development Tips

1. **Preview Mode**: In development, emails open in your browser instead of sending
2. **Console Logging**: When ENABLE_EMAIL=false, emails are logged to console
3. **Test Templates**: Use the test script to preview all email templates
4. **Responsive Design**: All templates are mobile-responsive
5. **Email Clients**: Templates are tested with major email clients

## Troubleshooting

### Emails not sending
1. Check SMTP credentials are correct
2. Ensure ENABLE_EMAIL=true for production
3. Verify SMTP host allows connections
4. Check spam folder

### Template not found
1. Ensure template directory exists
2. Check template name matches directory name
3. Verify html.pug exists in template directory

### Gmail specific issues
1. Enable "Less secure app access" or use App Password
2. Check if Gmail is blocking sign-in attempts
3. Verify 2-factor authentication is set up

## Email Best Practices

1. **Subject Lines**: Keep under 50 characters
2. **Preheader Text**: Use first paragraph wisely
3. **Call-to-Action**: One primary CTA per email
4. **Images**: Use sparingly, many clients block by default
5. **Links**: Always use full URLs
6. **Unsubscribe**: Include unsubscribe option for marketing emails