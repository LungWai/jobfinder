import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  MapPinIcon, 
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { jobsApi } from '../services/api';
import { JobFilters } from '../types/job';
import SearchFilters from '../components/SearchFilters';
import JobCard from '../components/JobCard';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const JobListings: React.FC = () => {
  const [filters, setFilters] = useState<JobFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 20;

  // Fetch jobs
  const { 
    data: jobsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['jobs', filters, currentPage],
    queryFn: () => jobsApi.getJobs(filters, currentPage, pageSize),
    keepPreviousData: true,
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filterOptions'],
    queryFn: jobsApi.getFilterOptions,
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (newFilters: JobFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">
          Error loading jobs: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <button 
          onClick={() => refetch()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Hong Kong Job Listings
        </h1>
        <p className="text-gray-600">
          Find your next opportunity from top Hong Kong job portals
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, companies, or keywords..."
                className="input-field pl-10"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {Object.keys(filters).length > 1 && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                {Object.keys(filters).length - 1}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFilterChange}
              filterOptions={filterOptions}
            />
          </div>
        )}
      </div>

      {/* Results Summary */}
      {jobsData && (
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, jobsData.total)} of {jobsData.total} jobs
          </div>
          <div className="text-sm text-gray-500">
            Page {currentPage} of {jobsData.totalPages}
          </div>
        </div>
      )}

      {/* Job Listings */}
      {isLoading ? (
        <LoadingSpinner />
      ) : jobsData?.data.length === 0 ? (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search criteria or filters
          </p>
          <button
            onClick={() => {
              setFilters({});
              setCurrentPage(1);
            }}
            className="btn-primary"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobsData?.data.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {jobsData && jobsData.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={jobsData.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default JobListings;
