import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { interviewsService } from '../../services/interviews.service';
import { CreateInterviewRequest, InterviewType } from '../../types/api';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  VideoCameraIcon,
  UserIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

interface ScheduleInterviewProps {
  applicationId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const interviewTypes: { value: InterviewType; label: string; description: string }[] = [
  { 
    value: 'PHONE_SCREENING', 
    label: 'Phone Screening', 
    description: 'Initial screening call with HR or recruiter' 
  },
  { 
    value: 'TECHNICAL', 
    label: 'Technical Interview', 
    description: 'Technical skills assessment' 
  },
  { 
    value: 'BEHAVIORAL', 
    label: 'Behavioral Interview', 
    description: 'Soft skills and culture fit assessment' 
  },
  { 
    value: 'ONSITE', 
    label: 'On-site Interview', 
    description: 'In-person interview at company office' 
  },
  { 
    value: 'PANEL', 
    label: 'Panel Interview', 
    description: 'Interview with multiple team members' 
  },
  { 
    value: 'FINAL', 
    label: 'Final Interview', 
    description: 'Final round with senior management' 
  },
];

const ScheduleInterview: React.FC<ScheduleInterviewProps> = ({ 
  applicationId, 
  onSuccess, 
  onCancel 
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<CreateInterviewRequest>({
    applicationId: applicationId || '',
    type: 'PHONE_SCREENING',
    scheduledAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration: 60,
    location: '',
    meetingUrl: '',
    interviewerName: '',
    interviewerTitle: '',
    notes: '',
  });

  const [isVirtual, setIsVirtual] = useState(false);

  const scheduleMutation = useMutation({
    mutationFn: (data: CreateInterviewRequest) => interviewsService.createInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interview-calendar'] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/interviews');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scheduleMutation.mutate(formData);
  };

  const handleChange = (field: keyof CreateInterviewRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Schedule New Interview</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Interview Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interview Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {interviewTypes.map(type => (
              <label
                key={type.value}
                className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${
                  formData.type === type.value
                    ? 'border-blue-600 ring-2 ring-blue-600'
                    : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="interviewType"
                  value={type.value}
                  checked={formData.type === type.value}
                  onChange={(e) => handleChange('type', e.target.value as InterviewType)}
                  className="sr-only"
                />
                <div className="flex flex-1">
                  <div className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">
                      {type.label}
                    </span>
                    <span className="mt-1 flex items-center text-sm text-gray-500">
                      {type.description}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="inline-block w-4 h-4 mr-1" />
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => handleChange('scheduledAt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ClockIcon className="inline-block w-4 h-4 mr-1" />
              Duration (minutes)
            </label>
            <select
              value={formData.duration}
              onChange={(e) => handleChange('duration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>

        {/* Location Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interview Location
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setIsVirtual(false)}
              className={`flex-1 py-2 px-4 rounded-md border ${
                !isVirtual
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <MapPinIcon className="inline-block w-4 h-4 mr-2" />
              In-Person
            </button>
            <button
              type="button"
              onClick={() => setIsVirtual(true)}
              className={`flex-1 py-2 px-4 rounded-md border ${
                isVirtual
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <VideoCameraIcon className="inline-block w-4 h-4 mr-2" />
              Virtual
            </button>
          </div>
        </div>

        {/* Location or Meeting URL */}
        {isVirtual ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <VideoCameraIcon className="inline-block w-4 h-4 mr-1" />
              Meeting URL
            </label>
            <input
              type="url"
              value={formData.meetingUrl}
              onChange={(e) => handleChange('meetingUrl', e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPinIcon className="inline-block w-4 h-4 mr-1" />
              Address
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="123 Office Street, Central, Hong Kong"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Interviewer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="inline-block w-4 h-4 mr-1" />
              Interviewer Name
            </label>
            <input
              type="text"
              value={formData.interviewerName}
              onChange={(e) => handleChange('interviewerName', e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BriefcaseIcon className="inline-block w-4 h-4 mr-1" />
              Interviewer Title
            </label>
            <input
              type="text"
              value={formData.interviewerTitle}
              onChange={(e) => handleChange('interviewerTitle', e.target.value)}
              placeholder="Hiring Manager"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            placeholder="Any additional information or preparation notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onCancel || (() => navigate(-1))}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={scheduleMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule Interview'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleInterview;