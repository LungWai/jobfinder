import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, Event, View } from 'react-big-calendar';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { interviewsService } from '../../services/interviews.service';
import { Interview, InterviewStatus, InterviewType } from '../../types/api';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  id: string;
  interview: Interview;
  type: InterviewType;
  status: InterviewStatus;
}

const interviewTypeColors: Record<InterviewType, string> = {
  PHONE_SCREENING: '#3B82F6', // blue
  TECHNICAL: '#8B5CF6', // purple
  BEHAVIORAL: '#EC4899', // pink
  ONSITE: '#F59E0B', // amber
  PANEL: '#EF4444', // red
  FINAL: '#10B981', // green
};

const InterviewCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  // Calculate date range for fetching events
  const dateRange = useMemo(() => {
    const start = moment(date).startOf(view).subtract(1, 'month').toISOString();
    const end = moment(date).endOf(view).add(1, 'month').toISOString();
    return { start, end };
  }, [date, view]);

  const { data: events, isLoading } = useQuery({
    queryKey: ['interview-calendar', dateRange],
    queryFn: () => interviewsService.getCalendarEvents(dateRange.start, dateRange.end),
  });

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!events) return [];
    
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      type: event.type,
      interview: event as any, // This would normally be the full interview object
      status: 'SCHEDULED' as InterviewStatus,
    }));
  }, [events]);

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/interviews/${event.id}`);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = interviewTypeColors[event.type] || '#6B7280';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: event.status === 'CANCELLED' ? 0.5 : 1,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <div className="p-1">
      <div className="font-medium text-xs truncate">{event.title}</div>
      <div className="text-xs opacity-75 truncate">
        {moment(event.start).format('h:mm A')}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Interview Calendar</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(interviewTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-600">
                {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          view={view}
          onView={(newView) => setView(newView)}
          date={date}
          onNavigate={setDate}
          components={{
            event: CustomEvent,
          }}
          popup
          showMultiDayTimes
        />
      </div>
    </div>
  );
};

export default InterviewCalendar;