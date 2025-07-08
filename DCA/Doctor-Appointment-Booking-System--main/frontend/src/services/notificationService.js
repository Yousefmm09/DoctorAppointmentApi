import api from './api';

export const notificationService = {
  // Get all notifications for the current user
  getNotifications: () => 
    api.get('/notifications'),
  
  // Mark a notification as read
  markAsRead: (notificationId) => 
    api.put(`/notifications/${notificationId}/read`),
  
  // Mark all notifications as read
  markAllAsRead: () => 
    api.put('/notifications/read-all'),
  
  // Delete a notification
  deleteNotification: (notificationId) => 
    api.delete(`/notifications/${notificationId}`),
  
  // Get unread notification count
  getUnreadCount: () => 
    api.get('/notifications/unread-count')
};

// Helper functions for showing notifications
export const showNotification = (title, message, type = 'info') => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body: message });
      }
    });
  }
  
  // You can also integrate with toast notifications in your UI
  // This requires a toast library like react-toastify, react-hot-toast, or similar
  // For example with react-toastify:
  // toast[type](message, { title });
  
  // Or you can use your custom app notification system
  // dispatch({ type: 'ADD_NOTIFICATION', notification: { title, message, type } });
};

// Specific notification helpers for appointments
export const appointmentNotifications = {
  // Notify about appointment confirmation
  appointmentConfirmed: (appointment) => {
    const doctorName = `Dr. ${appointment.doctorName}`;
    const date = new Date(appointment.appointmentDate).toLocaleDateString();
    const time = appointment.startTime;
    
    showNotification(
      'Appointment Confirmed',
      `Your appointment with ${doctorName} on ${date} at ${time} has been confirmed.`,
      'success'
    );
  },
  
  // Notify about appointment cancellation
  appointmentCancelled: (appointment) => {
    const doctorName = `Dr. ${appointment.doctorName}`;
    const date = new Date(appointment.appointmentDate).toLocaleDateString();
    const time = appointment.startTime;
    
    showNotification(
      'Appointment Cancelled',
      `Your appointment with ${doctorName} on ${date} at ${time} has been cancelled.`,
      'error'
    );
  },
  
  // Notify about appointment reminder
  appointmentReminder: (appointment) => {
    const doctorName = `Dr. ${appointment.doctorName}`;
    const date = new Date(appointment.appointmentDate).toLocaleDateString();
    const time = appointment.startTime;
    
    showNotification(
      'Appointment Reminder',
      `Reminder: You have an appointment with ${doctorName} tomorrow at ${time}.`,
      'info'
    );
  },
  
  // Notify about new appointment (for doctors)
  newAppointment: (appointment) => {
    const patientName = appointment.patientName;
    const date = new Date(appointment.appointmentDate).toLocaleDateString();
    const time = appointment.startTime;
    
    showNotification(
      'New Appointment',
      `New appointment with ${patientName} on ${date} at ${time}.`,
      'info'
    );
  }
}; 