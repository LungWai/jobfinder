# Authentication System

This authentication system provides a comprehensive solution for user authentication and authorization in the JobFinder application.

## Features

### Core Authentication
- **User Registration**: Email-based registration with password strength validation
- **User Login**: Secure login with JWT tokens
- **Email Verification**: Email verification for new accounts
- **Password Reset**: Secure password reset flow via email
- **Token Management**: Access tokens and refresh tokens
- **Session Management**: Secure session handling

### Security Features
- **Password Hashing**: bcrypt with configurable rounds
- **JWT Tokens**: Secure token generation and verification
- **Rate Limiting**: Protection against brute force attacks
- **Login Attempt Tracking**: Monitor failed login attempts
- **Activity Logging**: Comprehensive audit trail
- **CORS Protection**: Configurable CORS settings

### Email Services
- **Verification Emails**: Account verification emails
- **Password Reset Emails**: Secure password reset links
- **Application Notifications**: Job application updates
- **Welcome Emails**: Post-verification welcome messages
- **Security Alerts**: Login and security notifications

## Architecture

### Services
1. **AuthService** (`auth.service.ts`)
   - User registration and login
   - Password reset functionality
   - Token generation and verification
   - Email verification

2. **EmailService** (`email.service.ts`)
   - Email template management
   - SMTP configuration
   - Email sending with fallback

### Middleware
1. **authenticate**: JWT token verification
2. **authorize**: Role-based access control
3. **authRateLimit**: Rate limiting for auth endpoints
4. **validateSession**: Session validation
5. **logAuthEvent**: Authentication event logging

### Configuration
- Environment-based configuration
- Secure defaults with override capability
- Validation on startup

## API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Protected Endpoints
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/resend-verification` - Resend verification email

## Usage Examples

### Register a New User
```typescript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    name: 'John Doe'
  })
});
```

### Login
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});

const { accessToken, refreshToken } = await response.json();
```

### Protected Route Access
```typescript
const response = await fetch('/api/jobs', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRY=604800000

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security Settings
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
REQUIRE_EMAIL_VERIFICATION=true
```

### Password Requirements
- Minimum length: 8 characters (configurable)
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character

## Database Schema

The authentication system uses the following Prisma models:
- `User`: Core user data
- `RefreshToken`: Refresh token storage
- `LoginAttempt`: Failed login tracking
- `ActivityLog`: User activity audit trail

## Security Best Practices

1. **Never commit secrets**: Keep JWT secrets and API keys in environment variables
2. **Use HTTPS**: Always use HTTPS in production
3. **Rotate secrets**: Regularly rotate JWT secrets
4. **Monitor logs**: Review authentication logs regularly
5. **Update dependencies**: Keep authentication libraries up to date

## Error Handling

The system provides detailed error messages in development and generic messages in production:

```typescript
// Development
{ error: 'Password must contain at least one uppercase letter' }

// Production
{ error: 'Invalid credentials' }
```

## Extending the System

### Adding OAuth Providers
1. Configure provider in `auth.config.ts`
2. Implement OAuth strategy
3. Add callback routes
4. Update user model for provider data

### Custom Validators
Add custom validators in `validators.ts`:

```typescript
export function validateCustomField(value: string): ValidationResult {
  // Custom validation logic
}
```

### Additional Email Templates
Add new email templates in `email.service.ts`:

```typescript
async sendCustomEmail(email: string, data: any): Promise<void> {
  // Custom email template
}
```

## Testing

### Unit Tests
```bash
npm test src/auth
```

### Integration Tests
```bash
npm run test:integration
```

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Check SMTP configuration
   - Verify email credentials
   - Check spam folder

2. **Token expired**
   - Implement token refresh flow
   - Adjust token expiry times

3. **Rate limit exceeded**
   - Wait for cooldown period
   - Adjust rate limit settings

## License

This authentication system is part of the JobFinder application and follows the same license terms.