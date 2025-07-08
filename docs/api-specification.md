# Job Application Management System API Specification

## Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Job Applications](#job-applications)
4. [Interview Management](#interview-management)
5. [Document Management](#document-management)
6. [Reminder System](#reminder-system)
7. [Dashboard & Analytics](#dashboard--analytics)

## Authentication

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "clx1234567",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "jwt-token-here"
}
```

### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /api/auth/logout
Logout current user (invalidate token).

### POST /api/auth/refresh
Refresh authentication token.

## User Management

### GET /api/users/me
Get current user's profile information.

### PUT /api/users/me
Update current user's information.

### GET /api/users/me/profile
Get detailed user profile.

### PUT /api/users/me/profile
Update user profile information.

**Request Body:**
```json
{
  "phoneNumber": "+852 1234 5678",
  "linkedinUrl": "https://linkedin.com/in/johndoe",
  "currentJobTitle": "Software Engineer",
  "currentCompany": "Tech Corp",
  "yearsOfExperience": 5,
  "preferredJobTypes": ["Full-time", "Contract"],
  "preferredLocations": ["Hong Kong", "Remote"],
  "expectedSalaryMin": 40000,
  "expectedSalaryMax": 60000,
  "skills": ["JavaScript", "React", "Node.js", "Python"]
}
```

## Job Applications

### GET /api/applications
Get all job applications for the current user.

**Query Parameters:**
- `status`: Filter by application status
- `sortBy`: Sort field (createdAt, appliedDate, company)
- `order`: Sort order (asc, desc)
- `page`: Page number
- `limit`: Items per page

### POST /api/applications
Create a new job application.

**Request Body:**
```json
{
  "jobListingId": "clx1234567",
  "status": "DRAFT",
  "coverLetterContent": "Dear Hiring Manager...",
  "notes": "Interesting role, matches my skills"
}
```

### GET /api/applications/:id
Get specific application details.

### PUT /api/applications/:id
Update application information.

### DELETE /api/applications/:id
Delete an application (soft delete).

### POST /api/applications/:id/status
Update application status.

**Request Body:**
```json
{
  "status": "APPLIED",
  "notes": "Submitted via company website"
}
```

### GET /api/applications/:id/timeline
Get application status history timeline.

## Interview Management

### GET /api/applications/:id/interviews
Get all interviews for an application.

### POST /api/applications/:id/interviews
Schedule a new interview.

**Request Body:**
```json
{
  "interviewType": "VIDEO_INTERVIEW",
  "interviewRound": 1,
  "scheduledDate": "2024-01-15T10:00:00Z",
  "duration": 60,
  "location": "Remote",
  "meetingLink": "https://zoom.us/j/123456789",
  "interviewers": [
    {
      "name": "Jane Smith",
      "title": "Engineering Manager",
      "email": "jane.smith@company.com"
    }
  ],
  "preparationNotes": "Review system design concepts"
}
```

### GET /api/interviews/:id
Get specific interview details.

### PUT /api/interviews/:id
Update interview information.

### POST /api/interviews/:id/complete
Mark interview as completed and add feedback.

**Request Body:**
```json
{
  "feedback": "Interview went well, discussed technical challenges...",
  "outcome": "PASSED",
  "questionsAsked": ["System design question about...", "Behavioral question about..."]
}
```

### GET /api/interviews/upcoming
Get all upcoming interviews across all applications.

**Query Parameters:**
- `days`: Number of days ahead to look (default: 30)

## Document Management

### GET /api/documents
Get all documents for the current user.

**Query Parameters:**
- `type`: Filter by document type
- `applicationId`: Filter by application

### POST /api/documents/upload
Upload a new document.

**Request (multipart/form-data):**
- `file`: The document file
- `documentType`: Type of document (RESUME, COVER_LETTER, etc.)
- `applicationId`: (Optional) Associated application ID
- `description`: (Optional) Document description
- `tags`: (Optional) Comma-separated tags

### GET /api/documents/:id
Get document metadata.

### GET /api/documents/:id/download
Download document file.

### PUT /api/documents/:id
Update document metadata.

### DELETE /api/documents/:id
Delete a document.

### POST /api/documents/:id/new-version
Upload a new version of an existing document.

## Reminder System

### GET /api/reminders
Get all reminders for the current user.

**Query Parameters:**
- `status`: Filter by completion status (pending, completed)
- `type`: Filter by reminder type
- `dueDate`: Filter by due date range

### POST /api/reminders
Create a new reminder.

**Request Body:**
```json
{
  "applicationId": "clx1234567",
  "reminderType": "FOLLOW_UP",
  "title": "Follow up on application",
  "description": "Send follow-up email if no response",
  "dueDate": "2024-01-20T09:00:00Z",
  "emailNotification": true
}
```

### PUT /api/reminders/:id
Update reminder information.

### POST /api/reminders/:id/complete
Mark reminder as completed.

### POST /api/reminders/:id/snooze
Snooze a reminder.

**Request Body:**
```json
{
  "snoozedUntil": "2024-01-22T09:00:00Z"
}
```

## Dashboard & Analytics

### GET /api/dashboard/stats
Get application statistics overview.

**Response:**
```json
{
  "totalApplications": 45,
  "applicationsByStatus": {
    "APPLIED": 20,
    "INTERVIEW_SCHEDULED": 5,
    "REJECTED": 15,
    "OFFER_RECEIVED": 2
  },
  "upcomingInterviews": 3,
  "pendingReminders": 7,
  "applicationRate": {
    "thisWeek": 5,
    "lastWeek": 3,
    "thisMonth": 12
  }
}
```

### GET /api/dashboard/activity
Get recent activity timeline.

### GET /api/dashboard/applications/funnel
Get application funnel analytics.

### GET /api/dashboard/calendar
Get calendar view of interviews and reminders.

**Query Parameters:**
- `startDate`: Start date for calendar view
- `endDate`: End date for calendar view

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Unprocessable Entity
- 500: Internal Server Error

## Rate Limiting
- 1000 requests per hour per user
- 100 requests per minute for document uploads
- Headers include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset