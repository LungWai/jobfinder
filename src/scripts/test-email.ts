import { config } from 'dotenv';
import { emailService } from '../services/email.service';
import logger from '../utils/logger';

// Load environment variables
config();

async function testEmailService() {
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.error('Please provide a test email address as an argument');
    console.error('Usage: npm run test:email your-email@example.com');
    process.exit(1);
  }

  console.log('Testing email service configuration...\n');

  try {
    // Test 1: Send test email
    console.log('1. Testing basic email configuration...');
    const configTest = await emailService.testEmailConfiguration(testEmail);
    if (configTest) {
      console.log('✅ Basic email configuration test passed');
    } else {
      console.log('❌ Basic email configuration test failed');
    }

    // Test 2: Send verification email
    console.log('\n2. Testing verification email...');
    await emailService.sendVerificationEmail(
      testEmail,
      'test-verification-token-123',
      'Test User'
    );
    console.log('✅ Verification email sent');

    // Test 3: Send welcome email
    console.log('\n3. Testing welcome email...');
    await emailService.sendWelcomeEmail(testEmail, 'Test User');
    console.log('✅ Welcome email sent');

    // Test 4: Send password reset email
    console.log('\n4. Testing password reset email...');
    await emailService.sendPasswordResetEmail(
      testEmail,
      'test-reset-token-456',
      'Test User'
    );
    console.log('✅ Password reset email sent');

    // Test 5: Send interview reminder
    console.log('\n5. Testing interview reminder email...');
    await emailService.sendInterviewReminderEmail(
      testEmail,
      'Test User',
      {
        company: 'Test Company Ltd',
        position: 'Senior Software Engineer',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        time: '2:00 PM',
        location: '123 Test Street, Hong Kong',
        type: 'in_person',
        notes: 'Please bring your portfolio and references.'
      }
    );
    console.log('✅ Interview reminder email sent');

    // Test 6: Send application status update
    console.log('\n6. Testing application status email...');
    await emailService.sendApplicationStatusEmail(
      testEmail,
      'Test User',
      {
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        previousStatus: 'applied',
        newStatus: 'shortlisted',
        message: 'Congratulations! Your application has been shortlisted.',
        applicationId: 'test-app-123'
      }
    );
    console.log('✅ Application status email sent');

    // Test 7: Send generic reminder
    console.log('\n7. Testing generic reminder email...');
    await emailService.sendReminderEmail(
      testEmail,
      'Test User',
      'Follow up on your application',
      'Don\'t forget to follow up on your application to Tech Corp.',
      'Applied 3 days ago'
    );
    console.log('✅ Generic reminder email sent');

    // Test 8: Send job alert
    console.log('\n8. Testing job alert email...');
    await emailService.sendJobAlertEmail(
      testEmail,
      'Test User',
      [
        {
          id: 'job-1',
          title: 'Frontend Developer',
          company: 'Web Solutions Inc',
          location: 'Central, Hong Kong',
          salary: 'HK$30,000 - HK$40,000',
          postedDate: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: 'job-2',
          title: 'Full Stack Developer',
          company: 'Digital Agency',
          location: 'Causeway Bay, Hong Kong',
          salary: 'HK$35,000 - HK$45,000',
          postedDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      ],
      'Software Developer in Hong Kong'
    );
    console.log('✅ Job alert email sent');

    // Test 9: Send security alert
    console.log('\n9. Testing security alert email...');
    await emailService.sendSecurityAlert(
      testEmail,
      'Test User',
      'login',
      {
        ip: '192.168.1.1',
        location: 'Hong Kong',
        device: 'Chrome on Windows',
        browser: 'Chrome 120.0'
      }
    );
    console.log('✅ Security alert email sent');

    console.log('\n✅ All email tests completed successfully!');
    console.log(`\nCheck your inbox at ${testEmail} for the test emails.`);
    
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_EMAIL !== 'true') {
      console.log('\n⚠️  Note: Emails were logged to console in development mode.');
      console.log('Set ENABLE_EMAIL=true in .env to actually send emails.');
    }

  } catch (error) {
    console.error('\n❌ Email test failed:', error);
    logger.error('Email test error:', error);
  }

  process.exit(0);
}

// Run the test
testEmailService();