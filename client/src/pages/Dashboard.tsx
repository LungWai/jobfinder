import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChartBarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { jobsApi, scrapingApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard: React.FC = () => {
  const [isTriggering, setIsTriggering] = useState(false);
  const queryClient = useQueryClient();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: jobsApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch scraping status
  const { data: scrapingStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['scrapingStatus'],
    queryFn: scrapingApi.getStatus,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Trigger scraping mutation
  const triggerScrapingMutation = useMutation({
    mutationFn: (portal?: string) => scrapingApi.triggerScraping(portal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrapingStatus'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsTriggering(false);
    },
    onError: (error) => {
      console.error('Failed to trigger scraping:', error);
      setIsTriggering(false);
    },
  });

  // Cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: (daysOld: number) => scrapingApi.cleanup(daysOld),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const handleTriggerScraping = (portal?: string) => {
    setIsTriggering(true);
    triggerScrapingMutation.mutate(portal);
  };

  const handleCleanup = () => {
    if (confirm('Are you sure you want to deactivate jobs older than 30 days?')) {
      cleanupMutation.mutate(30);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'partial':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (statsLoading || statusLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Scraping Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor and manage job scraping operations
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalJobs?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Update</p>
              <p className="text-sm font-bold text-gray-900">
                {formatDate(stats?.lastUpdate)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Portals</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.jobsByPortal?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Errors</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.recentLogs?.filter(log => log.status === 'ERROR').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs by Portal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Jobs by Portal</h2>
          <div className="space-y-3">
            {stats?.jobsByPortal?.map((portal) => (
              <div key={portal.sourcePortal} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">{portal.sourcePortal}</span>
                <span className="text-lg font-bold text-primary-600">
                  {portal._count.id.toLocaleString()}
                </span>
              </div>
            )) || (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Manual Controls */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Manual Controls</h2>
          <div className="space-y-4">
            <div>
              <button
                onClick={() => handleTriggerScraping()}
                disabled={isTriggering || triggerScrapingMutation.isPending}
                className="w-full btn-primary flex items-center justify-center"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                {isTriggering || triggerScrapingMutation.isPending ? 'Starting...' : 'Trigger All Scrapers'}
              </button>
            </div>
            
            <div>
              <button
                onClick={() => handleTriggerScraping('jobsdb')}
                disabled={isTriggering || triggerScrapingMutation.isPending}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Trigger JobsDB Only
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleCleanup}
                disabled={cleanupMutation.isPending}
                className="w-full btn-secondary flex items-center justify-center text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {cleanupMutation.isPending ? 'Cleaning...' : 'Cleanup Old Jobs (30+ days)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scraping Logs */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Scraping Activity</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Portal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jobs Scraped
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.recentLogs?.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.portal}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.jobsScraped}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.createdAt)}
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No recent activity
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
