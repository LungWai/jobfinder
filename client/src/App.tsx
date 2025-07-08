import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login, Register, ForgotPassword, ResetPassword, ProtectedRoute, EmailVerification } from './components/auth';
import { queryClient } from './lib/react-query';
import { LoadingProvider } from './utils/loadingState';
import Interviews from './pages/Interviews';
import { InterviewDetail, PreparationChecklist, ReminderSettings } from './components/interviews';

// Simple components for now
const JobListings = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/jobs`);
      const data = await response.json();
      setJobs(data.data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Job Listings</h1>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading jobs...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-600">No jobs found. Try running the scraper first!</p>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              jobs.map((job: any) => (
                <div key={job.id} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                  <p className="text-gray-600 mb-2">{job.company} • {job.location}</p>
                  {job.salaryMin && job.salaryMax && (
                    <p className="text-green-600 font-medium mb-2">
                      {job.salaryCurrency} {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}
                    </p>
                  )}
                  <p className="text-gray-700 mb-4">{job.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {job.sourcePortal}
                    </span>
                    <a
                      href={job.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Apply Now
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState('');
  const { logout, user } = useAuth();

  const triggerScraping = async () => {
    setScraping(true);
    setMessage('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/scraping/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal: 'jobsdb' })
      });
      const data = await response.json();
      setMessage(data.message || 'Scraping started successfully!');
    } catch (error) {
      setMessage('Error starting scraping: ' + error);
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {user?.name || user?.email}</span>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Scraping Controls</h2>
          <p className="text-gray-600 mb-4">
            Manually trigger job scraping from Hong Kong job portals.
          </p>

          <button
            onClick={triggerScraping}
            disabled={scraping}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scraping ? 'Scraping...' : 'Start JobsDB Scraping'}
          </button>

          {message && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{message}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Navigation</h2>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/'}
              className="block w-full text-left bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              View Job Listings
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="block w-full text-left bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors"
            >
              Dashboard (Current)
            </button>
            <button
              onClick={() => window.location.href = '/interviews'}
              className="block w-full text-left bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Interview Management
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Welcome = () => {
  const { isAuthenticated } = useAuth();
  
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
              onClick={() => window.location.href = '/jobs'}
              className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-800 mb-2">📋 Job Listings</h3>
              <p className="text-gray-600 text-sm">Browse and search through scraped job postings</p>
            </button>

            <button
              onClick={() => window.location.href = '/dashboard'}
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
                  onClick={() => window.location.href = '/jobs'}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Jobs
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Start Scraping
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => window.location.href = '/login'}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => window.location.href = '/register'}
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

function App() {
  // Listen for auth logout events
  useEffect(() => {
    const handleLogout = () => {
      // Clear query cache on logout
      queryClient.clear();
      // Redirect to login page
      window.location.href = '/login';
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <Router>
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/interviews" element={<Interviews />} />
                <Route path="/interviews/:id" element={<InterviewDetail />} />
                <Route path="/interviews/:id/preparation" element={<PreparationChecklist />} />
                <Route path="/interviews/:id/reminders" element={<ReminderSettings />} />
              </Route>
            </Routes>
          </AuthProvider>
        </Router>
      </LoadingProvider>
      
      {/* React Query Devtools - only in development */}
      {/* {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />} */}
    </QueryClientProvider>
  );
}

export default App;
