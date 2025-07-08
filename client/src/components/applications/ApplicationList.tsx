import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Archive, 
  Trash2, 
  Download, 
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationFilters } from './ApplicationFilters';
import { Pagination } from '../Pagination';
import { LoadingSpinner } from '../LoadingSpinner';
import { applicationsService } from '../../services/applications.service';
import { ApplicationStatus } from '../../types/api';

interface ApplicationListProps {
  initialFilters?: any;
}

export const ApplicationList: React.FC<ApplicationListProps> = ({ initialFilters = {} }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['applications', filters, page],
    queryFn: () => applicationsService.getApplications(filters, page, 20),
  });

  const { data: stats } = useQuery({
    queryKey: ['applicationStats'],
    queryFn: () => applicationsService.getStats(),
  });

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleSelectApplication = (id: string) => {
    const newSelected = new Set(selectedApplications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedApplications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedApplications.size === data?.data.length) {
      setSelectedApplications(new Set());
    } else {
      const allIds = data?.data.map(app => app.id) || [];
      setSelectedApplications(new Set(allIds));
    }
  };

  const handleBulkStatusUpdate = async (status: ApplicationStatus) => {
    try {
      await applicationsService.bulkUpdateStatus(Array.from(selectedApplications), status);
      setSelectedApplications(new Set());
      refetch();
    } catch (error) {
      console.error('Failed to update applications:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await applicationsService.exportToCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export applications:', error);
    }
  };

  // Extract unique companies and categories from applications
  const companies = Array.from(new Set(
    data?.data
      .map(app => app.jobListing?.company?.name)
      .filter(Boolean) as string[]
  ));

  const categories = Array.from(new Set(
    data?.data
      .map(app => app.jobListing?.category?.name)
      .filter(Boolean) as string[]
  ));

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-700 text-lg">Failed to load applications</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-gray-600 text-sm">Total Applications</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-gray-600 text-sm">In Progress</p>
            <p className="text-2xl font-semibold text-blue-600">
              {(stats.byStatus.APPLIED || 0) + (stats.byStatus.REVIEWING || 0) + (stats.byStatus.INTERVIEW_SCHEDULED || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-gray-600 text-sm">Offers Received</p>
            <p className="text-2xl font-semibold text-green-600">{stats.byStatus.OFFER_RECEIVED || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-gray-600 text-sm">Success Rate</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <ApplicationFilters
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
        categories={categories}
      />

      {/* Bulk Actions Bar */}
      {selectedApplications.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-blue-700 font-medium">
              {selectedApplications.size} application{selectedApplications.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedApplications(new Set())}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusUpdate('ARCHIVED' as ApplicationStatus)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete selected applications?')) {
                  // Implement bulk delete
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* List Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            {selectedApplications.size === data?.data.length && data.data.length > 0 ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span className="text-sm">Select All</span>
          </button>
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {showBulkActions ? 'Hide' : 'Show'} Bulk Actions
          </button>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {data?.data.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-500 text-lg mb-2">No applications found</p>
              <p className="text-gray-400">Try adjusting your filters or apply to some jobs!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.data.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onSelect={handleSelectApplication}
                  isSelected={selectedApplications.has(application.id)}
                  showCheckbox={showBulkActions}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};