import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { FiClock, FiUser, FiMapPin } from 'react-icons/fi';

const locales = {
  'en-US': require('date-fns/locale/en-US')
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const AppointmentCalendar = ({ appointments, onSelectEvent, onSelectSlot }) => {
  // Convert appointments to calendar events
  const events = appointments.map(appointment => ({
    id: appointment.id,
    title: appointment.patientName,
    start: new Date(`${appointment.date}T${appointment.time}`),
    end: new Date(`${appointment.date}T${appointment.time}`),
    resource: appointment,
  }));

  // Custom event component
  const EventComponent = ({ event }) => {
    const appointment = event.resource;
    const status = appointment.status;
    
    let statusColor = 'bg-blue-100 text-blue-800';
    if (status === 'completed') statusColor = 'bg-green-100 text-green-800';
    if (status === 'cancelled') statusColor = 'bg-red-100 text-red-800';
    if (status === 'noShow') statusColor = 'bg-gray-100 text-gray-800';

    return (
      <div className="p-1">
        <div className="flex items-center">
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
            status === 'completed' ? 'bg-green-500' :
            status === 'cancelled' ? 'bg-red-500' :
            status === 'noShow' ? 'bg-gray-500' :
            'bg-blue-500'
          }`} />
          <span className="font-medium truncate">{event.title}</span>
        </div>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <FiClock className="w-3 h-3 mr-1" />
          <span>{format(event.start, 'HH:mm')}</span>
        </div>
      </div>
    );
  };

  // Custom toolbar component
  const CustomToolbar = (toolbar) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={goToBack}
            className="p-2 rounded hover:bg-gray-100"
          >
            &lt;
          </button>
          <button
            onClick={goToCurrent}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="p-2 rounded hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(toolbar.date, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toolbar.onView('month')}
            className={`px-3 py-1 text-sm rounded ${
              toolbar.view === 'month' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => toolbar.onView('week')}
            className={`px-3 py-1 text-sm rounded ${
              toolbar.view === 'week' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => toolbar.onView('day')}
            className={`px-3 py-1 text-sm rounded ${
              toolbar.view === 'day' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            Day
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        components={{
          event: EventComponent,
          toolbar: CustomToolbar,
        }}
        views={['month', 'week', 'day']}
        className="bg-white rounded-lg shadow-sm p-4"
      />
    </div>
  );
};

export default AppointmentCalendar; 