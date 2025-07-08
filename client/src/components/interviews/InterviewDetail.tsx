import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { interviewsService } from '../../services/interviews.service';
import { UpdateInterviewRequest, InterviewStatus } from '../../types/api';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  VideoCameraIcon,
  UserIcon,
  DocumentTextIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const InterviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateInterviewRequest>({});
  const [postInterviewNotes, setPostInterviewNotes] = useState('');
  const [showPostInterview, setShowPostInterview] = useState(false);

  const { data: interview, isLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => interviewsService.getInterview(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInterviewRequest) => 
      interviewsService.updateInterview(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      setIsEditing(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (notes: string) => 
      interviewsService.complete(id!, notes, 'pending'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      setShowPostInterview(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => 
      interviewsService.cancel(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
    },
  });

  const exportToCalendar = async (format: 'ics' | 'google') => {
    try {
      const result = await interviewsService.exportToCalendar(id!, format);
      
      if (format === 'ics' && result instanceof Blob) {
        const url = window.URL.createObjectURL(result);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `interview-${id}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'google' && typeof result === 'string') {
        window.open(result, '_blank');
      }
    } catch (error) {
      console.error('Failed to export calendar event:', error);
    }
  };

  if (isLoading || !interview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusColors: Record<InterviewStatus, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    RESCHEDULED: 'bg-yellow-100 text-yellow-800',
    NO_SHOW: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {interview.application?.jobListing?.title || 'Interview Details'}
            </h1>
            <p className="text-gray-600">
              {interview.application?.jobListing?.company || 'Company Name'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[interview.status]}`}>
            {interview.status.replace('_', ' ')}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Details'}
          </button>
          
          {interview.status === 'SCHEDULED' && (
            <>
              <button
                onClick={() => setShowPostInterview(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                <CheckCircleIcon className="inline w-4 h-4 mr-1" />
                Mark Complete
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this interview?')) {
                    cancelMutation.mutate('Cancelled by user');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                <XCircleIcon className="inline w-4 h-4 mr-1" />
                Cancel Interview
              </button>
              <button
                onClick={() => navigate(`/interviews/${id}/reschedule`)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700"
              >
                <ArrowPathIcon className="inline w-4 h-4 mr-1" />
                Reschedule
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interview Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Interview Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center text-gray-600 mb-2">
              <CalendarIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Date & Time:</span>
            </div>
            <p className="ml-7 text-gray-900">
              {format(new Date(interview.scheduledAt), 'EEEE, MMMM d, yyyy')}
              <br />
              {format(new Date(interview.scheduledAt), 'h:mm a')}
            </p>
          </div>

          <div>
            <div className="flex items-center text-gray-600 mb-2">
              <ClockIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Duration:</span>
            </div>
            <p className="ml-7 text-gray-900">{interview.duration || 60} minutes</p>
          </div>

          <div>
            <div className="flex items-center text-gray-600 mb-2">
              {interview.meetingUrl ? (
                <VideoCameraIcon className="w-5 h-5 mr-2" />
              ) : (
                <MapPinIcon className="w-5 h-5 mr-2" />
              )}
              <span className="font-medium">Location:</span>
            </div>
            <p className="ml-7 text-gray-900">
              {interview.meetingUrl ? (
                <a 
                  href={interview.meetingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Virtual Meeting Link
                </a>
              ) : (
                interview.location || 'Not specified'
              )}
            </p>
          </div>

          <div>
            <div className="flex items-center text-gray-600 mb-2">
              <UserIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Interviewer:</span>
            </div>
            <p className="ml-7 text-gray-900">
              {interview.interviewerName || 'Not specified'}
              {interview.interviewerTitle && (
                <span className="text-gray-600"> - {interview.interviewerTitle}</span>
              )}
            </p>
          </div>
        </div>

        {interview.notes && (
          <div className="mt-6">
            <div className="flex items-center text-gray-600 mb-2">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Notes:</span>
            </div>
            <p className="ml-7 text-gray-900 whitespace-pre-wrap">{interview.notes}</p>
          </div>
        )}
      </div>

      {/* Calendar Export */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export to Calendar</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => exportToCalendar('ics')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download .ics file
          </button>
          <button
            onClick={() => exportToCalendar('google')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add to Google Calendar
          </button>
        </div>
      </div>

      {/* Reminders */}
      {interview.reminders && interview.reminders.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <BellIcon className="inline w-5 h-5 mr-2" />
            Reminders
          </h2>
          <div className="space-y-2">
            {interview.reminders.map(reminder => (
              <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">
                  {format(new Date(reminder.reminderTime), 'MMM d, h:mm a')}
                </span>
                <span className="text-sm text-gray-600">{reminder.type}</span>
                {reminder.isSent && (
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post-Interview Modal */}
      {showPostInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Post-Interview Notes</h3>
            <textarea
              value={postInterviewNotes}
              onChange={(e) => setPostInterviewNotes(e.target.value)}
              rows={6}
              placeholder="How did the interview go? Any feedback or observations?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowPostInterview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => completeMutation.mutate(postInterviewNotes)}
                disabled={completeMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {completeMutation.isPending ? 'Saving...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewDetail;