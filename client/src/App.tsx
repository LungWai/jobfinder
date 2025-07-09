import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login, Register, ForgotPassword, ResetPassword, ProtectedRoute, EmailVerification } from './components/auth';
import { queryClient } from './lib/react-query';
import { LoadingProvider } from './utils/loadingState';
import Interviews from './pages/Interviews';
import { InterviewDetail, PreparationChecklist, ReminderSettings } from './components/interviews';
import JobListings from './pages/JobListings';
import JobDetail from './pages/JobDetail';
import Dashboard from './pages/Dashboard';

// Simple Welcome component

const Welcome = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Hong Kong Job Scraper
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Welcome to the Job Portal
          </h2>
          <p className="text-gray-600 mb-6">
            This application scrapes job listings from multiple Hong Kong job portals including JobsDB, CT Good Jobs, Recruit.com.hk, and University job boards.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => navigate('/jobs')}
              className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-800 mb-2">📋 Job Listings</h3>
              <p className="text-gray-600 text-sm">Browse and search through scraped job postings</p>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="p-6 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-800 mb-2">⚙️ Dashboard</h3>
              <p className="text-gray-600 text-sm">Manage scraping operations and view statistics</p>
            </button>
          </div>

          <div className="flex space-x-4">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/jobs')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Jobs
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Start Scraping
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// App content wrapper to use hooks
const AppContent = () => {
  const navigate = useNavigate();
  
  // Listen for auth logout events
  useEffect(() => {
    const handleLogout = () => {
      // Clear query cache on logout
      queryClient.clear();
      // Redirect to login page
      navigate('/login');
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [navigate]);

  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<EmailVerification />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/jobs" element={<JobListings />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/interviews/:id" element={<InterviewDetail />} />
          <Route path="/interviews/:id/preparation" element={<PreparationChecklist />} />
          <Route path="/interviews/:id/reminders" element={<ReminderSettings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <Router>
          <AppContent />
        </Router>
      </LoadingProvider>
      
      {/* React Query Devtools - only in development */}
      {/* {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />} */}
    </QueryClientProvider>
  );
}

export default App;
