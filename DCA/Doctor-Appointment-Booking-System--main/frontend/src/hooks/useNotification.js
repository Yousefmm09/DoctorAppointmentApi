import { useContext } from 'react';
import { ToastContext } from '../components/ToastNotifications';

/**
 * Custom hook for showing toast notifications
 * @returns {object} - Object with showToast and hideToast functions
 */
const useNotification = () => {
  const { showToast, hideToast } = useContext(ToastContext);

  const notify = {
    /**
     * Show a success toast notification
     * @param {string} message - The message to display
     * @returns {number} - The ID of the toast
     */
    success: (message) => showToast(message, 'success'),

    /**
     * Show an error toast notification
     * @param {string} message - The message to display
     * @returns {number} - The ID of the toast
     */
    error: (message) => showToast(message, 'error'),

    /**
     * Show an info toast notification
     * @param {string} message - The message to display
     * @returns {number} - The ID of the toast
     */
    info: (message) => showToast(message, 'info'),

    /**
     * Show a warning toast notification
     * @param {string} message - The message to display
     * @returns {number} - The ID of the toast
     */
    warning: (message) => showToast(message, 'warning'),

    /**
     * Hide a specific toast notification
     * @param {number} id - The ID of the toast to hide
     */
    hide: (id) => hideToast(id),

    /**
     * Show a notification for appointment confirmation
     * @param {object} appointment - The appointment data
     */
    appointmentConfirmed: (appointment) => {
      const doctorName = `Dr. ${appointment.doctorName}`;
      const date = new Date(appointment.appointmentDate).toLocaleDateString();
      const time = appointment.startTime;
      showToast(`Your appointment with ${doctorName} on ${date} at ${time} has been confirmed.`, 'success');
    },

    /**
     * Show a notification for appointment cancellation
     * @param {object} appointment - The appointment data
     */
    appointmentCancelled: (appointment) => {
      const doctorName = `Dr. ${appointment.doctorName}`;
      const date = new Date(appointment.appointmentDate).toLocaleDateString();
      const time = appointment.startTime;
      showToast(`Your appointment with ${doctorName} on ${date} at ${time} has been cancelled.`, 'error');
    },

    /**
     * Show a notification for appointment reminder
     * @param {object} appointment - The appointment data
     */
    appointmentReminder: (appointment) => {
      const doctorName = `Dr. ${appointment.doctorName}`;
      const date = new Date(appointment.appointmentDate).toLocaleDateString();
      const time = appointment.startTime;
      showToast(`Reminder: You have an appointment with ${doctorName} tomorrow at ${time}.`, 'info');
    },

    /**
     * Show a notification for a new appointment (for doctors)
     * @param {object} appointment - The appointment data
     */
    newAppointment: (appointment) => {
      const patientName = appointment.patientName;
      const date = new Date(appointment.appointmentDate).toLocaleDateString();
      const time = appointment.startTime;
      showToast(`New appointment with ${patientName} on ${date} at ${time}.`, 'info');
    }
  };

  return notify;
};

export default useNotification; 