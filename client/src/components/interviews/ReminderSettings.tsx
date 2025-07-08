import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { interviewsService } from '../../services/interviews.service';
import { CreateReminderRequest, ReminderType } from '../../types/api';
import { 
  BellIcon, 
  ClockIcon, 
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  BellAlertIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { format, subHours, subDays } from 'date-fns';

interface ReminderPreset {
  label: string;
  hoursBeforeInterview: number;
}

const reminderPresets: ReminderPreset[] = [
  { label: '1 week before', hoursBeforeInterview: 168 },
  { label: '3 days before', hoursBeforeInterview: 72 },
  { label: '1 day before', hoursBeforeInterview: 24 },
  { label: '2 hours before', hoursBeforeInterview: 2 },
  { label: '1 hour before', hoursBeforeInterview: 1 },
  { label: '30 minutes before', hoursBeforeInterview: 0.5 },
];

const ReminderSettings: React.FC = () => {
  const { id: interviewId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [reminderType, setReminderType] = useState<ReminderType>('EMAIL');
  const [customTime, setCustomTime] = useState('');
  const [message, setMessage] = useState('');

  // Fetch interview details to get scheduled time
  const { data: interview } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewsService.getInterview(interviewId!),
    enabled: !!interviewId,
  });

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: (data: CreateReminderRequest) => 
      fetch(`/api/interviews/${interviewId}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', interviewId] });
      setMessage('Reminder created successfully!');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  // Delete reminder mutation
  const deleteReminderMutation = useMutation({
    mutationFn: (reminderId: string) => 
      fetch(`/api/reminders/${reminderId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', interviewId] });
    },
  });

  const handleAddReminder = () => {
    if (!interview) return;

    let reminderTime: Date;
    
    if (selectedPreset !== null) {
      const preset = reminderPresets[selectedPreset];
      reminderTime = subHours(new Date(interview.scheduledAt), preset.hoursBeforeInterview);
    } else if (customTime) {
      reminderTime = new Date(customTime);
    } else {
      return;
    }

    createReminderMutation.mutate({
      interviewId: interviewId!,
      reminderTime: reminderTime.toISOString(),
      type: reminderType,
    });
  };

  const reminderTypeIcons = {
    EMAIL: <EnvelopeIcon className="w-5 h-5" />,
    PUSH: <BellAlertIcon className="w-5 h-5" />,
    SMS: <DevicePhoneMobileIcon className="w-5 h-5" />,
  };

  if (!interview) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        <BellIcon className="inline w-6 h-6 mr-2" />
        Interview Reminders
      </h2>

      {/* Interview Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">Interview scheduled for:</p>
        <p className="text-lg font-medium text-gray-900">
          {format(new Date(interview.scheduledAt), 'EEEE, MMMM d, yyyy at h:mm a')}
        </p>
      </div>

      {/* Existing Reminders */}
      {interview.reminders && interview.reminders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Active Reminders</h3>
          <div className="space-y-2">
            {interview.reminders.map(reminder => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {reminderTypeIcons[reminder.type]}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(reminder.reminderTime), 'MMM d, h:mm a')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {reminder.isSent ? 'Sent' : 'Scheduled'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteReminderMutation.mutate(reminder.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Reminder */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Add New Reminder</h3>

        {/* Reminder Type Selection */}
        <div>
          <label className="block text-sm text-gray-600 mb-2">Reminder Type</label>
          <div className="flex space-x-3">
            {(['EMAIL', 'PUSH', 'SMS'] as ReminderType[]).map(type => (
              <button
                key={type}
                onClick={() => setReminderType(type)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  reminderType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {reminderTypeIcons[type]}
                <span className="text-sm font-medium">{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div>
          <label className="block text-sm text-gray-600 mb-2">When to Remind</label>
          
          {/* Preset Options */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {reminderPresets.map((preset, index) => (
              <button
                key={preset.label}
                onClick={() => {
                  setSelectedPreset(index);
                  setCustomTime('');
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  selectedPreset === index
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ClockIcon className="inline w-4 h-4 mr-1" />
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Time */}
          <div className="relative">
            <input
              type="datetime-local"
              value={customTime}
              onChange={(e) => {
                setCustomTime(e.target.value);
                setSelectedPreset(null);
              }}
              max={interview.scheduledAt}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Or select custom time"
            />
            {customTime && (
              <p className="mt-1 text-sm text-gray-600">
                Custom reminder at: {format(new Date(customTime), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddReminder}
          disabled={!selectedPreset && !customTime}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PlusIcon className="inline w-5 h-5 mr-2" />
          Add Reminder
        </button>
      </div>

      {/* Success Message */}
      {message && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{message}</p>
        </div>
      )}

      {/* Reminder Settings Info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">Reminder Settings</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Email reminders will be sent to your registered email address</li>
          <li>• Push notifications require browser permissions to be enabled</li>
          <li>• SMS reminders require a verified phone number in your profile</li>
          <li>• Reminders cannot be set for past times</li>
        </ul>
      </div>
    </div>
  );
};

export default ReminderSettings;