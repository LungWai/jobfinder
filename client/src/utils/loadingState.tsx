import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface LoadingState {
  // Loading states for different operations
  operations: Map<string, boolean>;
  
  // Set loading state for an operation
  setLoading: (operation: string, isLoading: boolean) => void;
  
  // Check if an operation is loading
  isLoading: (operation: string) => boolean;
  
  // Clear all loading states
  clearAll: () => void;
  
  // Get count of active operations
  getActiveCount: () => number;
  
  // Check if any operation is loading
  isAnyLoading: () => boolean;
}

const LoadingContext = createContext<LoadingState | null>(null);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [operations, setOperations] = useState<Map<string, boolean>>(new Map());

  const setLoading = useCallback((operation: string, isLoading: boolean) => {
    setOperations((prev) => {
      const newOperations = new Map(prev);
      if (isLoading) {
        newOperations.set(operation, true);
      } else {
        newOperations.delete(operation);
      }
      return newOperations;
    });
  }, []);

  const isLoading = useCallback(
    (operation: string) => {
      return operations.has(operation);
    },
    [operations]
  );

  const clearAll = useCallback(() => {
    setOperations(new Map());
  }, []);

  const getActiveCount = useCallback(() => {
    return operations.size;
  }, [operations]);

  const isAnyLoading = useCallback(() => {
    return operations.size > 0;
  }, [operations]);

  const value: LoadingState = {
    operations,
    setLoading,
    isLoading,
    clearAll,
    getActiveCount,
    isAnyLoading,
  };

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoadingState = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingState must be used within a LoadingProvider');
  }
  return context;
};

// Helper hook for managing loading state with automatic cleanup

export const useOperationLoading = (operationName: string) => {
  const { setLoading, isLoading } = useLoadingState();
  
  const startLoading = useCallback(() => {
    setLoading(operationName, true);
  }, [operationName, setLoading]);
  
  const stopLoading = useCallback(() => {
    setLoading(operationName, false);
  }, [operationName, setLoading]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setLoading(operationName, false);
    };
  }, [operationName, setLoading]);
  
  return {
    isLoading: isLoading(operationName),
    startLoading,
    stopLoading,
  };
};

// Global loading indicator operations
export const LOADING_OPERATIONS = {
  // Auth operations
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  REGISTER: 'auth.register',
  
  // Job operations
  FETCH_JOBS: 'jobs.fetch',
  FETCH_JOB_DETAILS: 'jobs.fetchDetails',
  
  // Application operations
  CREATE_APPLICATION: 'applications.create',
  UPDATE_APPLICATION: 'applications.update',
  
  // Interview operations
  CREATE_INTERVIEW: 'interviews.create',
  UPDATE_INTERVIEW: 'interviews.update',
  
  // Document operations
  UPLOAD_DOCUMENT: 'documents.upload',
  
  // Profile operations
  UPDATE_PROFILE: 'profile.update',
  UPLOAD_RESUME: 'profile.uploadResume',
  
  // Scraping operations
  TRIGGER_SCRAPING: 'scraping.trigger',
} as const;

// Create a type-safe hook for specific operations
export const useTypedLoading = <T extends keyof typeof LOADING_OPERATIONS>(
  operation: T
) => {
  return useOperationLoading(LOADING_OPERATIONS[operation]);
};