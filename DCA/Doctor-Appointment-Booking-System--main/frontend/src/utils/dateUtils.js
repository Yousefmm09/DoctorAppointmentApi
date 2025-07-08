/**
 * Formats a date string or Date object into a user-friendly format
 * @param {string|Date} date - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return '';
  }
  
  return dateObj.toLocaleDateString('en-US', mergedOptions);
};

/**
 * Formats a time string (HH:MM) to a more readable format
 * @param {string} timeString - Time in HH:MM format
 * @param {boolean} use12Hour - Whether to use 12-hour format with AM/PM
 * @returns {string} Formatted time
 */
export const formatTime = (timeString, use12Hour = true) => {
  if (!timeString) return '';
  
  try {
    // Handle different time formats
    let hours, minutes;
    
    if (timeString.includes(':')) {
      [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
    } else if (timeString.length === 4) {
      // Handle military time without colon (e.g., "1430")
      hours = parseInt(timeString.substring(0, 2), 10);
      minutes = parseInt(timeString.substring(2, 4), 10);
    } else {
      console.error('Invalid time format:', timeString);
      return timeString;
    }
    
    if (isNaN(hours) || isNaN(minutes)) {
      return timeString;
    }
    
    if (use12Hour) {
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // Convert to 12-hour format
      return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
};

/**
 * Calculates the time difference between two dates in a human-readable format
 * @param {string|Date} startDate - The start date
 * @param {string|Date} endDate - The end date (defaults to now)
 * @returns {string} Human-readable time difference
 */
export const getTimeDifference = (startDate, endDate = new Date()) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diffMs = Math.abs(end - start);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  
  return 'Just now';
}; 