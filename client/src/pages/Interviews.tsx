import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { interviewsService } from '../services/interviews.service';
import InterviewCalendar from '../components/interviews/InterviewCalendar';
import InterviewList from '../components/interviews/InterviewList';
import ScheduleInterview from '../components/interviews/ScheduleInterview';
import { 
  CalendarDaysIcon, 
  ListBulletIcon, 
  PlusIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

type TabType = 'calendar' | 'list';

const Interviews: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Fetch interview statistics
  const { data: stats } = useQuery({
    queryKey: ['interview-stats'],
    queryFn: () => interviewsService.getStats(),
  });

  // Fetch upcoming interviews
  const { data: upcomingInterviews } = useQuery({
    queryKey: ['upcoming-interviews'],
    queryFn: () => interviewsService.getUpcoming(7),
  });

  const tabs = [
    { id: 'calendar' as TabType, label: 'Calendar View', icon: CalendarDaysIcon },
    { id: 'list' as TabType, label: 'List View', icon: ListBulletIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Management</h1>
            <p className="mt-2 text-gray-600">
              Manage your interview schedule and track your progress
            </p>
          </div>
          <button
            onClick={() => setShowScheduleForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChartBarIcon className="w-10 h-10 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="w-10 h-10 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircleIcon className="w-10 h-10 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Interviews Alert */}
      {upcomingInterviews && upcomingInterviews.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Upcoming Interviews This Week
          </h3>
          <div className="space-y-2">
            {upcomingInterviews.slice(0, 3).map(interview => (
              <div 
                key={interview.id} 
                className="flex items-center justify-between text-sm cursor-pointer hover:bg-blue-100 p-2 rounded"
                onClick={() => navigate(`/interviews/${interview.id}`)}
              >
                <div>
                  <span className="font-medium text-blue-900">
                    {interview.application?.jobListing?.company}
                  </span>
                  {' - '}
                  <span className="text-blue-700">
                    {new Date(interview.scheduledAt).toLocaleDateString()} at{' '}
                    {new Date(interview.scheduledAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                  {interview.type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
          {upcomingInterviews.length > 3 && (
            <button
              onClick={() => setActiveTab('list')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              View all {upcomingInterviews.length} upcoming interviews →
            </button>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'calendar' && <InterviewCalendar />}
        {activeTab === 'list' && <InterviewList />}
      </div>

      {/* Schedule Interview Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <ScheduleInterview
              onSuccess={() => {
                setShowScheduleForm(false);
                // Refresh data will happen automatically through React Query
              }}
              onCancel={() => setShowScheduleForm(false)}
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/interviews/preparation-tips')}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <h4 className="font-medium text-gray-900 mb-1">Interview Preparation Tips</h4>
            <p className="text-sm text-gray-600">
              Access guides and tips for successful interviews
            </p>
          </button>
          
          <button
            onClick={() => navigate('/interviews/history')}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <h4 className="font-medium text-gray-900 mb-1">Interview History</h4>
            <p className="text-sm text-gray-600">
              Review past interviews and feedback
            </p>
          </button>
          
          <button
            onClick={() => navigate('/applications')}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <h4 className="font-medium text-gray-900 mb-1">Job Applications</h4>
            <p className="text-sm text-gray-600">
              View and manage your job applications
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Interviews;