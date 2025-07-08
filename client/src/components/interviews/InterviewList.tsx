import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { interviewsService } from '../../services/interviews.service';
import { Interview, InterviewStatus, InterviewType } from '../../types/api';
import {
  CalendarIcon,
  MapPinIcon,
  VideoCameraIcon,
  EyeIcon,
  ArrowPathIcon,
  XCircleIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const InterviewList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '' as InterviewStatus | '',
    type: '' as InterviewType | '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const { data, isLoading } = useQuery({
    queryKey: ['interviews', filters, currentPage],
    queryFn: () => interviewsService.getInterviews(
      {
        status: filters.status || undefined,
        type: filters.type || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
      currentPage,
      20
    ),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      interviewsService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });

  const exportToCalendar = async (id: string, format: 'ics' | 'google') => {
    try {
      const result = await interviewsService.exportToCalendar(id, format);
      if (format === 'ics' && result instanceof Blob) {
        const url = window.URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-${id}.ics`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const statusColors: Record<InterviewStatus, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    RESCHEDULED: 'bg-yellow-100 text-yellow-800',
    NO_SHOW: 'bg-gray-100 text-gray-800',
  };

  const typeLabels: Record<InterviewType, string> = {
    PHONE_SCREENING: 'Phone',
    TECHNICAL: 'Technical',
    BEHAVIORAL: 'Behavioral',
    ONSITE: 'On-site',
    PANEL: 'Panel',
    FINAL: 'Final',
  };

  const handleReschedule = (id: string) => {
    navigate(`/interviews/${id}/reschedule`);
  };

  const handleCancel = (id: string) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      cancelMutation.mutate({ id, reason });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const interviews = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">All Interviews</h2>
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cards
              </button>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FunnelIcon className="inline w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as InterviewStatus | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {Object.keys(statusColors).map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as InterviewType | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={() => setFilters({ status: '', type: '', dateFrom: '', dateTo: '' })}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company / Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {interviews.map((interview) => (
                <tr key={interview.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {interview.application?.jobListing?.company || 'Unknown Company'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {interview.application?.jobListing?.title || 'Position'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(interview.scheduledAt), 'MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(interview.scheduledAt), 'h:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{typeLabels[interview.type]}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {interview.meetingUrl ? (
                      <VideoCameraIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <MapPinIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[interview.status]}`}>
                      {interview.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/interviews/${interview.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      {interview.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => handleReschedule(interview.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Reschedule"
                          >
                            <ArrowPathIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleCancel(interview.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancel"
                          >
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => exportToCalendar(interview.id, 'ics')}
                        className="text-gray-600 hover:text-gray-900"
                        title="Export to Calendar"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/interviews/${interview.id}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {interview.application?.jobListing?.company || 'Unknown Company'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {interview.application?.jobListing?.title || 'Position'}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${statusColors[interview.status]}`}>
                  {interview.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(new Date(interview.scheduledAt), 'MMM d, h:mm a')}
                </div>
                <div className="flex items-center text-gray-600">
                  {interview.meetingUrl ? (
                    <>
                      <VideoCameraIcon className="w-4 h-4 mr-2" />
                      Virtual Interview
                    </>
                  ) : (
                    <>
                      <MapPinIcon className="w-4 h-4 mr-2" />
                      In-Person
                    </>
                  )}
                </div>
                <div className="text-gray-600">
                  <span className="font-medium">{typeLabels[interview.type]}</span> Interview
                </div>
              </div>

              {interview.status === 'SCHEDULED' && (
                <div className="mt-4 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleReschedule(interview.id)}
                    className="flex-1 px-3 py-1 border border-yellow-300 text-yellow-700 rounded hover:bg-yellow-50 text-sm"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => handleCancel(interview.id)}
                    className="flex-1 px-3 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewList;