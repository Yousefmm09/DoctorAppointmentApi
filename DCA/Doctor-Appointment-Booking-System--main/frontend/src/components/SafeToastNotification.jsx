import React from 'react';
import { toast } from 'react-toastify';

/**
 * SafeToastNotification - A safer way to display notifications that prevents accidental logout
 * This centralizes toast notifications with better click handling
 */
export const showNotification = (message, options = {}) => {
  const defaultOptions = {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: false, // Important: prevent accidental logout when clicking
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    onClick: (e) => {
      // Always stop propagation on toast clicks
      if (e) e.stopPropagation();
      
      // If there's a custom click handler, call it with the stopped event
      if (options.onClick) options.onClick(e);
    }
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  // Wrap the message in a div with stopPropagation if it's a string
  const wrappedMessage = typeof message === 'string' ? 
    <div onClick={(e) => e.stopPropagation()}>{message}</div> : 
    message;
  
  switch (options.type) {
    case 'success':
      return toast.success(wrappedMessage, mergedOptions);
    case 'error':
      return toast.error(wrappedMessage, mergedOptions);
    case 'warning':
      return toast.warning(wrappedMessage, mergedOptions);
    case 'info':
    default:
      return toast.info(wrappedMessage, mergedOptions);
  }
};

// Use this to create a toast with a link to the appointment
export const showAppointmentNotification = (message, appointmentId, options = {}) => {
  const ToastWithLink = () => (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      style={{ pointerEvents: 'auto' }}
    >
      <div>{message}</div>
      {appointmentId && (
        <a 
          href={`/appointment/details/${appointmentId}`}
          className="text-blue-600 hover:underline block mt-1"
          onClick={(e) => {
            e.stopPropagation(); // Prevent the toast click handler
            
            // Use window.location instead of React Router for more direct navigation
            // This avoids potential issues with router context being lost
            const detailsUrl = `/appointment/details/${appointmentId}`;
            window.location.href = detailsUrl;
            
            // Prevent default link behavior since we're handling navigation manually
            e.preventDefault();
          }}
        >
          View Appointment Details
        </a>
      )}
    </div>
  );

  return showNotification(<ToastWithLink />, options);
};

export default {
  showNotification,
  showAppointmentNotification
}; 