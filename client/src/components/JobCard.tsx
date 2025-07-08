import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPinIcon, 
  BuildingOfficeIcon, 
  CurrencyDollarIcon, 
  CalendarIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { JobListing } from '../types/job';

interface JobCardProps {
  job: JobListing;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
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
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const truncateDescription = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <Link 
                to={`/job/${job.id}`}
                className="text-xl font-semibold text-gray-900 hover:text-primary-600 transition-colors duration-200"
              >
                {job.title}
              </Link>
              <div className="flex items-center mt-1 text-gray-600">
                <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                <span className="font-medium">{job.company}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {job.sourcePortal}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center text-gray-600">
          <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">{job.location}</span>
        </div>
        
        {salary && (
          <div className="flex items-center text-gray-600">
            <CurrencyDollarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{salary}</span>
          </div>
        )}
        
        <div className="flex items-center text-gray-600">
          <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">{formatDate(job.createdAt)}</span>
        </div>
      </div>

      {/* Job Categories */}
      <div className="flex flex-wrap gap-2 mb-4">
        {job.jobCategory && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
            {job.jobCategory}
          </span>
        )}
        {job.employmentType && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
            {job.employmentType}
          </span>
        )}
        {job.experienceLevel && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
            {job.experienceLevel}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="text-gray-700 mb-4">
        <p className="leading-relaxed">
          {truncateDescription(job.description)}
        </p>
      </div>

      {/* Application Deadline */}
      {job.applicationDeadline && (
        <div className="flex items-center text-sm text-orange-600 mb-4">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>
            Apply by: {new Date(job.applicationDeadline).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <Link
          to={`/job/${job.id}`}
          className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors duration-200"
        >
          View Details
        </Link>
        
        <a
          href={job.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          Apply on {job.sourcePortal}
          <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
        </a>
      </div>
    </div>
  );
};

export default JobCard;
