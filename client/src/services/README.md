# API Client Services

This directory contains a comprehensive API client layer for the Hong Kong Job Finder application.

## Overview

The API client services provide:
- Centralized axios configuration with auth token management
- Automatic token refresh on 401 responses
- Request/response interceptors for logging and error handling
- Retry logic with exponential backoff
- TypeScript interfaces for all API responses
- React Query integration for caching and state management
- Loading state management across the application

## Structure

```
services/
├── api.ts                 # Base axios instance and configuration
├── auth.service.ts        # Authentication-related API calls
├── jobs.service.ts        # Job listing API calls
├── applications.service.ts # Job application API calls
├── interviews.service.ts  # Interview management API calls
├── documents.service.ts   # Document upload/management API calls
├── reminders.service.ts   # Reminder management API calls
├── profile.service.ts     # User profile API calls
└── index.ts              # Central export file
```

## Usage

### Basic API Calls

```typescript
import { jobsApi, applicationsService } from '@/services';

// Get jobs with filters
const jobs = await jobsApi.getJobs(
  { location: 'Hong Kong', category: 'IT' },
  1, // page
  20 // limit
);

// Create an application
const application = await applicationsService.createApplication({
  jobListingId: 'job-123',
  coverLetter: 'I am interested...',
});
```

### Using React Query Hooks

```typescript
import { useJobs, useCreateApplication } from '@/hooks/useApi';

function JobList() {
  // Fetch jobs with automatic caching
  const { data, isLoading, error } = useJobs(
    { location: 'Hong Kong' },
    1,
    20
  );

  // Mutation for creating applications
  const createApplication = useCreateApplication({
    onSuccess: (data) => {
      console.log('Application created:', data);
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.data.map(job => (
        <div key={job.id}>
          <h3>{job.title}</h3>
          <button onClick={() => createApplication.mutate({
            jobListingId: job.id,
            coverLetter: 'Sample cover letter',
          })}>
            Apply
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Authentication

The API client automatically handles authentication:

1. Tokens are stored in localStorage
2. Access tokens are automatically added to requests
3. On 401 responses, the client attempts to refresh the token
4. If refresh fails, user is logged out and redirected to login

```typescript
import { authService } from '@/services';

// Login
const { accessToken, refreshToken, user } = await authService.login({
  email: 'user@example.com',
  password: 'password123',
});

// Logout
await authService.logout();

// Check authentication status
const isAuthenticated = authService.isAuthenticated();
```

### Error Handling

All API errors are standardized and can be handled consistently:

```typescript
import { getErrorMessage, formatErrorForDisplay } from '@/utils/errorHandling';

try {
  await someApiCall();
} catch (error) {
  // Get simple error message
  const message = getErrorMessage(error);
  
  // Get formatted error with actions
  const { title, description, actions } = formatErrorForDisplay(error);
  
  // Show error to user
  showNotification({
    title,
    description,
    actions,
  });
}
```

### Loading State Management

Track loading states across the application:

```typescript
import { useTypedLoading } from '@/utils/loadingState';

function MyComponent() {
  const { isLoading, startLoading, stopLoading } = useTypedLoading('FETCH_JOBS');

  const handleFetch = async () => {
    startLoading();
    try {
      await fetchSomeData();
    } finally {
      stopLoading();
    }
  };

  return (
    <div>
      {isLoading && <Spinner />}
      <button onClick={handleFetch}>Fetch Data</button>
    </div>
  );
}
```

## Configuration

### Environment Variables

```env
VITE_API_URL=http://localhost:3001/api  # API base URL
```

### React Query Configuration

The query client is configured in `/lib/react-query.ts` with:
- 5-minute stale time
- 10-minute cache time
- Automatic retry with exponential backoff
- Refetch on window focus (production only)

## Type Safety

All API responses have TypeScript interfaces defined in `/types/api.ts`:

```typescript
interface JobApplication {
  id: string;
  userId: string;
  jobListingId: string;
  status: ApplicationStatus;
  appliedAt: string;
  // ... more fields
}

type ApplicationStatus = 
  | 'DRAFT'
  | 'APPLIED'
  | 'REVIEWING'
  | 'INTERVIEW_SCHEDULED'
  // ... more statuses
```

## Best Practices

1. **Always use the service layer** - Don't make direct API calls
2. **Use React Query hooks** - For automatic caching and refetching
3. **Handle errors gracefully** - Use the error handling utilities
4. **Track loading states** - For better UX
5. **Invalidate queries** - After mutations that affect data

```typescript
import { invalidateQueries } from '@/lib/react-query';

// After creating an application
invalidateQueries.applications();

// After updating a specific job
invalidateQueries.job('job-123');
```

## Adding New Services

To add a new API service:

1. Create the service file in `/services/`
2. Define TypeScript interfaces in `/types/api.ts`
3. Add React Query hooks in `/hooks/useApi.ts`
4. Export from `/services/index.ts`
5. Add query keys to `/lib/react-query.ts`

Example:

```typescript
// services/newFeature.service.ts
import api from './api';
import { NewFeature } from '../types/api';

export const newFeatureService = {
  getAll: async (): Promise<NewFeature[]> => {
    const response = await api.get('/new-feature');
    return response.data;
  },
};

// hooks/useApi.ts
export const useNewFeatures = () => {
  return useQuery({
    queryKey: ['newFeatures'],
    queryFn: newFeatureService.getAll,
  });
};
```