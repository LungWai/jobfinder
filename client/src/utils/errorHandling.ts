import { AxiosError } from 'axios';
import { ApiError } from '../types/api';

// Type guard to check if error is an AxiosError
export const isAxiosError = (error: unknown): error is AxiosError => {
  return (error as AxiosError).isAxiosError === true;
};

// Type guard to check if error has API error structure
export const isApiError = (error: unknown): error is { message: string; code?: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
};

// Extract error message from various error types
export const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    // Check for API error response
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.message) {
      return apiError.message;
    }

    // Check for network errors
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please check your internet connection and try again.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection.';
    }

    // HTTP status code messages
    switch (error.response?.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 422:
        return 'Invalid data provided. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred.';
};

// Get detailed error information
export const getErrorDetails = (error: unknown): {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
} => {
  const message = getErrorMessage(error);

  if (isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return {
      message,
      code: apiError?.code || error.code,
      statusCode: error.response?.status,
      details: apiError?.details,
    };
  }

  if (isApiError(error)) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  return { message };
};

// Format error for user display
export const formatErrorForDisplay = (error: unknown): {
  title: string;
  description: string;
  actions?: Array<{ label: string; action: () => void }>;
} => {
  const errorDetails = getErrorDetails(error);

  // Determine title based on error type
  let title = 'Error';
  if (errorDetails.statusCode) {
    switch (Math.floor(errorDetails.statusCode / 100)) {
      case 4:
        title = 'Request Error';
        break;
      case 5:
        title = 'Server Error';
        break;
    }
  }

  // Determine actions based on error
  const actions: Array<{ label: string; action: () => void }> = [];

  if (errorDetails.statusCode === 401) {
    actions.push({
      label: 'Go to Login',
      action: () => {
        window.location.href = '/login';
      },
    });
  }

  if (errorDetails.code === 'ECONNABORTED' || errorDetails.code === 'ERR_NETWORK') {
    actions.push({
      label: 'Retry',
      action: () => {
        window.location.reload();
      },
    });
  }

  return {
    title,
    description: errorDetails.message,
    actions: actions.length > 0 ? actions : undefined,
  };
};

// Error logging utility
export const logError = (error: unknown, context?: string): void => {
  const errorDetails = getErrorDetails(error);
  
  console.error(`[Error${context ? ` - ${context}` : ''}]`, {
    message: errorDetails.message,
    code: errorDetails.code,
    statusCode: errorDetails.statusCode,
    details: errorDetails.details,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  });

  // In production, you might want to send this to an error tracking service
  if (import.meta.env.PROD) {
    // Example: sendToErrorTracking(errorDetails);
  }
};

// React error boundary error handler
export const handleErrorBoundary = (error: Error, errorInfo: React.ErrorInfo): void => {
  logError(error, 'React Error Boundary');
  
  // In production, you might want to send this to an error tracking service
  if (import.meta.env.PROD) {
    // Example: sendToErrorTracking({ error, errorInfo });
  }
};

// Validation error formatter
export const formatValidationErrors = (
  errors: Record<string, string | string[]>
): string[] => {
  const messages: string[] = [];
  
  Object.entries(errors).forEach(([field, error]) => {
    if (Array.isArray(error)) {
      messages.push(...error.map((e) => `${field}: ${e}`));
    } else {
      messages.push(`${field}: ${error}`);
    }
  });
  
  return messages;
};