import React from 'react';

const TimeSlots = ({ slots, selectedIndex, selectedTime, onSelectSlot, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center w-full py-6">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-gray-500">Loading available time slots...</p>
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="flex items-center justify-center w-full py-6">
        <p className="text-gray-500">No available time slots found</p>
      </div>
    );
  }

  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    try {
      // Handle different time formats (HH:MM or HH:MM:SS)
      let hours, minutes;
      if (timeString.includes(':')) {
        const parts = timeString.split(':');
        hours = parseInt(parts[0]);
        minutes = parseInt(parts[1]);
      } else {
        hours = parseInt(timeString);
        minutes = 0;
      }
      
      const date = new Date();
      date.setHours(hours, minutes, 0);
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return 'Select a date';
    }
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return 'Invalid date';
      }
      
      return d.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date format';
    }
  };

  // Guard: Make sure we have a valid selected day
  if (selectedIndex === null || !slots[selectedIndex]) {
    return (
      <div className="mt-4 text-center py-4">
        <p className="text-gray-500">Please select a day to view available times</p>
      </div>
    );
  }

  const selectedDay = slots[selectedIndex];
  const availableSlots = selectedDay.slots || [];

  if (!availableSlots.length) {
    return (
      <div className="mt-4 text-center py-6">
        <p className="text-gray-500">No available appointments for {formatDate(selectedDay.date)}</p>
      </div>
    );
  }

  // Group times by morning/afternoon/evening for better organization
  const groupedSlots = {
    morning: availableSlots.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      return hour >= 0 && hour < 12;
    }),
    afternoon: availableSlots.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      return hour >= 12 && hour < 17;
    }),
    evening: availableSlots.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      return hour >= 17 && hour < 24;
    })
  };

  const renderTimeGroup = (title, times) => {
    if (!times.length) return null;
    
    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {times.map((time, index) => {
            // Check if this time is during doctor's break (13:00-14:00)
            const hour = parseInt(time.split(':')[0]);
            const isBreakTime = hour === 13;
            
            return (
              <button
                key={index}
                onClick={() => !isBreakTime && onSelectSlot(selectedIndex, time)}
                className={`text-sm px-4 py-2 rounded-full transition-colors ${
                  time === selectedTime
                    ? 'bg-blue-600 text-white'
                    : isBreakTime
                      ? 'bg-red-50 text-red-300 border border-red-200 cursor-not-allowed line-through'
                      : 'text-gray-700 border border-gray-300 hover:border-blue-300 hover:text-blue-600'
                }`}
                disabled={isBreakTime}
                title={isBreakTime ? "Doctor is on break during this time" : ""}
              >
                {formatTime(time)}
                {isBreakTime && (
                  <span className="sr-only">(Break time)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4">
      <div className="bg-white rounded-lg p-4">
        {renderTimeGroup('Morning', groupedSlots.morning)}
        {renderTimeGroup('Afternoon', groupedSlots.afternoon)}
        {renderTimeGroup('Evening', groupedSlots.evening)}
        
        {/* Doctor break time notice */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700 flex items-center">
            <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Doctor break time: <strong>1:00 PM - 2:00 PM</strong></span>
          </p>
          <p className="text-xs text-yellow-600 mt-1 ml-6">Appointments are not available during break hours</p>
        </div>
      </div>
    </div>
  );
};

export default TimeSlots;