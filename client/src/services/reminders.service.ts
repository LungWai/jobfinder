import api from './api';
import { 
  InterviewReminder, 
  CreateReminderRequest,
  ReminderType,
  PaginatedResponse
} from '../types/api';

interface ReminderFilters {
  type?: ReminderType;
  isSent?: boolean;
  dateFrom?: string;
  dateTo?: string;
  interviewId?: string;
}

interface ReminderSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  defaultReminderTimes: number[]; // in minutes before interview
  emailAddress?: string;
  phoneNumber?: string;
}

export const remindersService = {
  // Get user's reminders
  getReminders: async (
    filters: ReminderFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<InterviewReminder>> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<PaginatedResponse<InterviewReminder>>(`/reminders?${params.toString()}`);
    return response.data;
  },

  // Get upcoming reminders
  getUpcoming: async (hours: number = 24): Promise<InterviewReminder[]> => {
    const response = await api.get<InterviewReminder[]>(`/reminders/upcoming?hours=${hours}`);
    return response.data;
  },

  // Get single reminder
  getReminder: async (id: string): Promise<InterviewReminder> => {
    const response = await api.get<InterviewReminder>(`/reminders/${id}`);
    return response.data;
  },

  // Create reminder
  createReminder: async (data: CreateReminderRequest): Promise<InterviewReminder> => {
    const response = await api.post<InterviewReminder>('/reminders', data);
    return response.data;
  },

  // Create multiple reminders for an interview
  createMultipleReminders: async (
    interviewId: string,
    reminderTimes: number[], // minutes before interview
    type: ReminderType = 'EMAIL'
  ): Promise<InterviewReminder[]> => {
    const response = await api.post<InterviewReminder[]>('/reminders/bulk', {
      interviewId,
      reminderTimes,
      type,
    });
    return response.data;
  },

  // Update reminder
  updateReminder: async (
    id: string,
    data: { reminderTime?: string; type?: ReminderType }
  ): Promise<InterviewReminder> => {
    const response = await api.patch<InterviewReminder>(`/reminders/${id}`, data);
    return response.data;
  },

  // Delete reminder
  deleteReminder: async (id: string): Promise<void> => {
    await api.delete(`/reminders/${id}`);
  },

  // Delete all reminders for an interview
  deleteInterviewReminders: async (interviewId: string): Promise<{ deleted: number }> => {
    const response = await api.delete(`/reminders/interview/${interviewId}`);
    return response.data;
  },

  // Test reminder
  testReminder: async (type: ReminderType): Promise<{ sent: boolean; message: string }> => {
    const response = await api.post('/reminders/test', { type });
    return response.data;
  },

  // Get reminder settings
  getReminderSettings: async (): Promise<ReminderSettings> => {
    const response = await api.get<ReminderSettings>('/reminders/settings');
    return response.data;
  },

  // Update reminder settings
  updateReminderSettings: async (settings: Partial<ReminderSettings>): Promise<ReminderSettings> => {
    const response = await api.patch<ReminderSettings>('/reminders/settings', settings);
    return response.data;
  },

  // Get reminder templates
  getTemplates: async (type: ReminderType): Promise<Array<{
    id: string;
    name: string;
    subject?: string;
    content: string;
    type: ReminderType;
  }>> => {
    const response = await api.get(`/reminders/templates?type=${type}`);
    return response.data;
  },

  // Mark reminder as sent (for manual tracking)
  markAsSent: async (id: string): Promise<InterviewReminder> => {
    const response = await api.post<InterviewReminder>(`/reminders/${id}/mark-sent`);
    return response.data;
  },

  // Get reminder history
  getHistory: async (
    days: number = 30
  ): Promise<Array<{
    date: string;
    count: number;
    byType: Record<ReminderType, number>;
    successRate: number;
  }>> => {
    const response = await api.get(`/reminders/history?days=${days}`);
    return response.data;
  },

  // Snooze reminder
  snoozeReminder: async (
    id: string,
    minutes: number
  ): Promise<InterviewReminder> => {
    const response = await api.post<InterviewReminder>(`/reminders/${id}/snooze`, { minutes });
    return response.data;
  },

  // Subscribe to push notifications
  subscribeToPush: async (subscription: PushSubscription): Promise<void> => {
    await api.post('/reminders/push/subscribe', subscription);
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async (): Promise<void> => {
    await api.post('/reminders/push/unsubscribe');
  },
};