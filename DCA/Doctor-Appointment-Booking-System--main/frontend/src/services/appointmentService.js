import api from './api';
import { appointmentNotifications } from './notificationService';

export const appointmentService = {
  // Get all appointments for the logged-in doctor
  getDoctorAppointments: () => 
    api.get('/Appointment/doctor'),
  
  // Get all appointments for a specific patient
  getPatientAppointments: () => 
    api.get('/Appointment/patient'),
  
  // Get appointments with payment information for a doctor
  getDoctorAppointmentsWithPayments: (doctorId) => 
    api.get(`/Appointment/doctor/${doctorId}/with-payments`),
  
  // Get a specific appointment by ID
  getAppointmentById: (id) => 
    api.get(`/Appointment/${id}`),
  
  // Create a new appointment
  createAppointment: async (appointmentData) => {
    const response = await api.post('/Appointment', appointmentData);
    // Show notification to patient that appointment was booked
    if (response.data) {
      appointmentNotifications.newAppointment(response.data);
    }
    return response;
  },
  
  // Update an appointment's status
  updateAppointmentStatus: async (appointmentId, status) => {
    const response = await api.put(`/Appointment/${appointmentId}/status`, { status });
    
    // Show appropriate notification based on status
    if (response.data) {
      if (status === 'Confirmed') {
        appointmentNotifications.appointmentConfirmed(response.data);
      } else if (status === 'Cancelled') {
        appointmentNotifications.appointmentCancelled(response.data);
      }
    }
    
    return response;
  },
  
  // Update an appointment's details
  updateAppointment: (appointmentId, appointmentData) => 
    api.put(`/Appointment/${appointmentId}`, appointmentData),
  
  // Delete an appointment
  deleteAppointment: async (appointmentId) => {
    const appointment = await api.get(`/Appointment/${appointmentId}`);
    const response = await api.delete(`/Appointment/${appointmentId}`);
    
    // Show notification that appointment was cancelled
    if (appointment.data) {
      appointmentNotifications.appointmentCancelled(appointment.data);
    }
    
    return response;
  },
  
  // Get available time slots for a doctor on a specific date
  getAvailableTimeSlots: (doctorId, date) => 
    api.get(`/Appointment/available-slots`, { params: { doctorId, date }}),
  
  // Check if a specific time slot is available
  checkSlotAvailability: (doctorId, date, time) => 
    api.get(`/Appointment/check-availability`, { params: { doctorId, date, time }}),
  
  // Get appointment statistics
  getStatistics: () => 
    api.get('/Appointment/statistics'),
  
  // Get upcoming appointments
  getUpcomingAppointments: () => 
    api.get('/Appointment/upcoming'),
  
  // Get past appointments
  getPastAppointments: () => 
    api.get('/Appointment/past'),
  
  // Send appointment reminder
  sendReminder: async (appointmentId) => {
    const response = await api.post(`/Appointment/${appointmentId}/send-reminder`);
    
    // Show notification that reminder was sent
    if (response.data) {
      appointmentNotifications.appointmentReminder(response.data);
    }
    
    return response;
  },
  
  // Reschedule an appointment
  rescheduleAppointment: (appointmentId, newDate, newTime) => 
    api.put(`/Appointment/${appointmentId}/reschedule`, { date: newDate, time: newTime })
}; 