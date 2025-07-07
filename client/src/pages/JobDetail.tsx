import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeftIcon,
  MapPinIcon, 
  BuildingOfficeIcon, 
  CurrencyDollarIcon, 
  CalendarIcon,
  ExternalLinkIcon,
  ClockIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { jobsApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.getJobById(id!),
    enabled: !!id,
  });

  const formatSalary = (min?: number, max?: number, currency: string = 'HKD') => {
    if (!min && !max) return null;
    
    const formatAmount = (amount: number) => {
      if (amount >= 1000) {
        return `${(amount / 1000).toFixed(0)}K`;
      }
      return amount.toLocaleString();
    };

    if (min && max && min !== max) {
      return `${currency} ${formatAmount(min)} - ${formatAmount(max)}`;
    }
    return `${currency} ${formatAmount(min || max || 0)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">
          Job not found or error loading job details
        </div>
        <Link to="/" className="btn-primary">
          Back to Job Listings
        </Link>
      </div>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Job Listings
        </Link>
      </div>

      {/* Job Header */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {job.title}
            </h1>
            <div className="flex items-center text-xl text-gray-600 mb-4">
              <BuildingOfficeIcon className="h-5 w-5 mr-2" />
              <span className="font-medium">{job.company}</span>
            </div>
          </div>
          <div className="ml-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {job.sourcePortal}
            </span>
          </div>
        </div>

        {/* Job Meta Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center text-gray-600">
            <MapPinIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{job.location}</span>
          </div>
          
          {salary && (
            <div className="flex items-center text-gray-600">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{salary}</span>
            </div>
          )}
          
          <div className="flex items-center text-gray-600">
            <ClockIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>Posted {formatDate(job.createdAt)}</span>
          </div>

          {job.applicationDeadline && (
            <div className="flex items-center text-orange-600">
              <CalendarIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>Apply by {formatDate(job.applicationDeadline)}</span>
            </div>
          )}
        </div>

        {/* Job Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {job.jobCategory && (
            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
              <TagIcon className="h-4 w-4 mr-1" />
              {job.jobCategory}
            </span>
          )}
          {job.employmentType && (
            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800">
              {job.employmentType}
            </span>
          )}
          {job.experienceLevel && (
            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800">
              {job.experienceLevel}
            </span>
          )}
        </div>

        {/* Apply Button */}
        <div className="pt-6 border-t border-gray-200">
          <a
            href={job.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center btn-primary text-lg px-8 py-3"
          >
            Apply on {job.sourcePortal}
            <ExternalLinkIcon className="h-5 w-5 ml-2" />
          </a>
        </div>
      </div>

      {/* Job Description */}
      <div className="card mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {job.description}
          </div>
        </div>
      </div>

      {/* Requirements */}
      {job.requirements && (
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {job.requirements}
            </div>
          </div>
        </div>
      )}

      {/* Benefits */}
      {job.benefits && (
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Benefits</h2>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {job.benefits}
            </div>
          </div>
        </div>
      )}

      {/* Job Metadata */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Job Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Job ID:</span>
            <span className="ml-2 text-gray-900">{job.id}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Source Portal:</span>
            <span className="ml-2 text-gray-900">{job.sourcePortal}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Posted Date:</span>
            <span className="ml-2 text-gray-900">{formatDate(job.createdAt)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Last Updated:</span>
            <span className="ml-2 text-gray-900">{formatDate(job.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
