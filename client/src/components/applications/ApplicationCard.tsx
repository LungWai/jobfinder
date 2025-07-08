import React from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { 
  Briefcase, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock,
  ChevronRight,
  FileText,
  Video,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../../types/api';

interface ApplicationCardProps {
  application: JobApplication;
  onStatusUpdate?: (id: string, status: ApplicationStatus) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
}

const statusConfig: Record<ApplicationStatus, { 
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
}> = {
  DRAFT: { 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-300',
    icon: FileText,
    label: 'Draft'
  },
  APPLIED: { 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-300',
    icon: Check,
    label: 'Applied'
  },
  REVIEWING: { 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-300',
    icon: Clock,
    label: 'Under Review'
  },
  INTERVIEW_SCHEDULED: { 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-50', 
    borderColor: 'border-purple-300',
    icon: Video,
    label: 'Interview Scheduled'
  },
  INTERVIEWED: { 
    color: 'text-indigo-700', 
    bgColor: 'bg-indigo-50', 
    borderColor: 'border-indigo-300',
    icon: Check,
    label: 'Interviewed'
  },
  OFFER_RECEIVED: { 
    color: 'text-green-700', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-300',
    icon: AlertCircle,
    label: 'Offer Received'
  },
  ACCEPTED: { 
    color: 'text-emerald-700', 
    bgColor: 'bg-emerald-50', 
    borderColor: 'border-emerald-300',
    icon: Check,
    label: 'Accepted'
  },
  REJECTED: { 
    color: 'text-red-700', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-300',
    icon: X,
    label: 'Rejected'
  },
  WITHDRAWN: { 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-300',
    icon: X,
    label: 'Withdrawn'
  }
};

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onStatusUpdate,
  onSelect,
  isSelected = false,
  showCheckbox = false
}) => {
  const { jobListing } = application;
  const statusInfo = statusConfig[application.status];
  const StatusIcon = statusInfo.icon;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(application.id);
    }
  };

  const nextInterview = application.interviews
    ?.filter(interview => interview.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  return (
    <div className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
      isSelected ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1">
            {showCheckbox && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {jobListing?.title || 'Job Title Not Available'}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {jobListing?.company && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    <span>{jobListing.company.name}</span>
                  </div>
                )}
                {jobListing?.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{jobListing.location.district}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}>
            {StatusIcon && <StatusIcon className="w-4 h-4" />}
            <span>{statusInfo.label}</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Applied: {format(new Date(application.appliedAt), 'MMM d, yyyy')}</span>
            </div>
            {application.updatedAt !== application.appliedAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Updated: {format(new Date(application.updatedAt), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>

          {nextInterview && (
            <div className="flex items-center gap-2 text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded-md">
              <Video className="w-4 h-4" />
              <span>Interview: {format(new Date(nextInterview.scheduledAt), 'MMM d, h:mm a')}</span>
              {nextInterview.type && (
                <span className="text-purple-600">• {nextInterview.type.replace('_', ' ')}</span>
              )}
            </div>
          )}

          {jobListing?.salaryMin && (
            <div className="text-sm text-gray-600">
              <Briefcase className="w-4 h-4 inline mr-1" />
              HK${jobListing.salaryMin.toLocaleString()}
              {jobListing.salaryMax && ` - HK$${jobListing.salaryMax.toLocaleString()}`}
              {jobListing.salaryPeriod && ` per ${jobListing.salaryPeriod.toLowerCase()}`}
            </div>
          )}
        </div>

        {application.notes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700 line-clamp-2">{application.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {application.documents && application.documents.length > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{application.documents.length} documents</span>
              </div>
            )}
            {application.interviews && application.interviews.length > 0 && (
              <div className="flex items-center gap-1">
                <Video className="w-4 h-4" />
                <span>{application.interviews.length} interviews</span>
              </div>
            )}
          </div>
          
          <Link
            to={`/applications/${application.id}`}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};