using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DoctorAppoitmentApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text;

namespace DoctorAppoitmentApi.Service
{
    public interface INotificationService
    {
        Task<List<Notification>> GetUserNotificationsAsync(int userAccountId);
        Task<int> GetUnreadCountAsync(int userAccountId);
        Task<bool> MarkAsReadAsync(int notificationId);
        Task<bool> MarkAllAsReadAsync(int userAccountId);
        Task<bool> DeleteNotificationAsync(int notificationId);
        Task<Notification> CreateAppointmentNotificationAsync(int userAccountId, string message, string firstName, string lastName);
        Task NotifyAppointmentCreatedAsync(Appointment appointment);
        Task NotifyAppointmentConfirmedAsync(Appointment appointment);
        Task NotifyAppointmentCancelledAsync(Appointment appointment);
        Task SendAppointmentReminderAsync(Appointment appointment);
        Task NotifyNewMessageAsync(int userAccountId, string senderName, string messagePreview);
    }

    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<DoctorAppoitmentApi.NotificationHub> _notificationHub;
        private readonly IEmailService _emailService;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            AppDbContext context,
            IHubContext<DoctorAppoitmentApi.NotificationHub> notificationHub,
            IEmailService emailService,
            ILogger<NotificationService> logger)
        {
            _context = context;
            _notificationHub = notificationHub;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<List<Notification>> GetUserNotificationsAsync(int userAccountId)
        {
            return await _context.Notifications
                .Where(n => n.UserAccountId == userAccountId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }

        public async Task<int> GetUnreadCountAsync(int userAccountId)
        {
            return await _context.Notifications
                .Where(n => n.UserAccountId == userAccountId && !n.IsRead)
                .CountAsync();
        }

        public async Task<bool> MarkAsReadAsync(int notificationId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification == null) return false;

            notification.IsRead = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkAllAsReadAsync(int userAccountId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserAccountId == userAccountId && !n.IsRead)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteNotificationAsync(int notificationId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification == null) return false;

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Notification> CreateAppointmentNotificationAsync(int userAccountId, string message, string firstName, string lastName)
        {
            var notification = new Notification
            {
                UserAccountId = userAccountId,
                Message = message,
                CreatedAt = DateTime.Now,
                IsRead = false,
                FirstName = firstName,
                LastName = lastName
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Send real-time notification
            await _notificationHub.Clients.Group(userAccountId.ToString())
                .SendAsync("ReceiveNotification", new
                {
                    id = notification.Id,
                    message = notification.Message,
                    createdAt = notification.CreatedAt,
                    isRead = notification.IsRead
                });

            return notification;
        }

        // Helper to get UserAccount ID from ApplicationUser email
        private async Task<int> GetUserAccountIdFromEmailAsync(string email)
        {
            if (string.IsNullOrEmpty(email)) 
                return 0;

            var userAccount = await _context.UserAccounts
                .FirstOrDefaultAsync(u => u.Email == email);
                
            if (userAccount != null)
                return userAccount.Id;
                
            return 0;
        }

        public async Task NotifyAppointmentCreatedAsync(Appointment appointment)
        {
            try
            {
                // Get patient and doctor information
                var patient = await _context.Patients
                    .Include(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(p => p.Id == appointment.PatientID);

                var doctor = await _context.Doctors
                    .Include(d => d.ApplicationUser)
                    .FirstOrDefaultAsync(d => d.Id == appointment.DoctorID);

                if (patient == null || doctor == null) return;

                // Create notification for doctor
                if (doctor.ApplicationUser != null)
                {
                    // Find doctor's UserAccount
                    int doctorUserAccountId = await GetUserAccountIdFromEmailAsync(doctor.ApplicationUser.Email);
                    if (doctorUserAccountId > 0)
                    {
                        string message = $"New appointment scheduled by {patient.FirstName} {patient.LastName} on {appointment.AppointmentDate.ToString("MMM dd, yyyy")} at {appointment.StartTime.ToString(@"hh\:mm tt")}";
                        
                        await CreateAppointmentNotificationAsync(doctorUserAccountId, message, patient.FirstName, patient.LastName);
                    }
                    
                    // Send email notification to doctor
                    if (!string.IsNullOrEmpty(doctor.ApplicationUser.Email))
                    {
                        await _emailService.SendDoctorAppointmentNotificationAsync(
                            doctor.ApplicationUser.Email,
                            $"{patient.FirstName} {patient.LastName}",
                            appointment.AppointmentDate,
                            appointment.StartTime
                        );
                    }
                }

                // Create notification for patient
                if (patient.ApplicationUser != null)
                {
                    // Find patient's UserAccount
                    int patientUserAccountId = await GetUserAccountIdFromEmailAsync(patient.ApplicationUser.Email);
                    if (patientUserAccountId > 0)
                    {
                        string message = $"Appointment scheduled with Dr. {doctor.FirstName} {doctor.LastName} on {appointment.AppointmentDate.ToString("MMM dd, yyyy")} at {appointment.StartTime.ToString(@"hh\:mm tt")}";
                        
                        await CreateAppointmentNotificationAsync(patientUserAccountId, message, doctor.FirstName, doctor.LastName);
                    }
                    
                    // Send email notification to patient
                    if (!string.IsNullOrEmpty(patient.ApplicationUser.Email))
                    {
                        await _emailService.SendAppointmentConfirmationAsync(
                            patient.ApplicationUser.Email,
                            $"{patient.FirstName} {patient.LastName}",
                            $"{doctor.FirstName} {doctor.LastName}",
                            appointment.AppointmentDate,
                            appointment.StartTime
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating appointment notifications");
            }
        }

        public async Task NotifyAppointmentConfirmedAsync(Appointment appointment)
        {
            try
            {
                // Get patient and doctor information
                var patient = await _context.Patients
                    .Include(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(p => p.Id == appointment.PatientID);

                var doctor = await _context.Doctors
                    .Include(d => d.ApplicationUser)
                    .FirstOrDefaultAsync(d => d.Id == appointment.DoctorID);

                if (patient == null || doctor == null) return;

                // Create notification for patient
                if (patient.ApplicationUser != null)
                {
                    // Find patient's UserAccount
                    int patientUserAccountId = await GetUserAccountIdFromEmailAsync(patient.ApplicationUser.Email);
                    if (patientUserAccountId > 0)
                    {
                        string message = $"Appointment with Dr. {doctor.FirstName} {doctor.LastName} on {appointment.AppointmentDate.ToString("MMM dd, yyyy")} at {appointment.StartTime.ToString(@"hh\:mm tt")} has been confirmed";
                        
                        await CreateAppointmentNotificationAsync(patientUserAccountId, message, doctor.FirstName, doctor.LastName);
                    }
                    
                    // Send email notification to patient
                    if (!string.IsNullOrEmpty(patient.ApplicationUser.Email))
                    {
                        await _emailService.SendAppointmentConfirmationAsync(
                            patient.ApplicationUser.Email,
                            $"{patient.FirstName} {patient.LastName}",
                            $"{doctor.FirstName} {doctor.LastName}",
                            appointment.AppointmentDate,
                            appointment.StartTime
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating appointment confirmation notifications");
            }
        }

        public async Task NotifyAppointmentCancelledAsync(Appointment appointment)
        {
            try
            {
                // Get patient and doctor information
                var patient = await _context.Patients
                    .Include(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(p => p.Id == appointment.PatientID);

                var doctor = await _context.Doctors
                    .Include(d => d.ApplicationUser)
                    .FirstOrDefaultAsync(d => d.Id == appointment.DoctorID);

                if (patient == null || doctor == null) return;

                // Determine who cancelled the appointment (we don't have this info, so inform both parties)
                
                // Create notification for patient
                if (patient.ApplicationUser != null)
                {
                    // Find patient's UserAccount
                    int patientUserAccountId = await GetUserAccountIdFromEmailAsync(patient.ApplicationUser.Email);
                    if (patientUserAccountId > 0)
                    {
                        string message = $"Appointment with Dr. {doctor.FirstName} {doctor.LastName} on {appointment.AppointmentDate.ToString("MMM dd, yyyy")} at {appointment.StartTime.ToString(@"hh\:mm tt")} has been cancelled";
                        
                        await CreateAppointmentNotificationAsync(patientUserAccountId, message, doctor.FirstName, doctor.LastName);
                    }
                    
                    // Send email notification to patient
                    if (!string.IsNullOrEmpty(patient.ApplicationUser.Email))
                    {
                        await _emailService.SendAppointmentCancellationAsync(
                            patient.ApplicationUser.Email,
                            $"{patient.FirstName} {patient.LastName}",
                            $"{doctor.FirstName} {doctor.LastName}",
                            appointment.AppointmentDate,
                            appointment.StartTime
                        );
                    }
                }
                
                // Create notification for doctor
                if (doctor.ApplicationUser != null)
                {
                    // Find doctor's UserAccount
                    int doctorUserAccountId = await GetUserAccountIdFromEmailAsync(doctor.ApplicationUser.Email);
                    if (doctorUserAccountId > 0)
                    {
                        string message = $"Appointment with {patient.FirstName} {patient.LastName} on {appointment.AppointmentDate.ToString("MMM dd, yyyy")} at {appointment.StartTime.ToString(@"hh\:mm tt")} has been cancelled";
                        
                        await CreateAppointmentNotificationAsync(doctorUserAccountId, message, patient.FirstName, patient.LastName);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating appointment cancellation notifications");
            }
        }

        public async Task SendAppointmentReminderAsync(Appointment appointment)
        {
            try
            {
                // Get patient and doctor information
                var patient = await _context.Patients
                    .Include(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(p => p.Id == appointment.PatientID);

                var doctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.Id == appointment.DoctorID);

                if (patient == null || doctor == null) return;

                // Create notification for patient
                if (patient.ApplicationUser != null)
                {
                    // Find patient's UserAccount
                    int patientUserAccountId = await GetUserAccountIdFromEmailAsync(patient.ApplicationUser.Email);
                    if (patientUserAccountId > 0)
                    {
                        string message = $"Reminder: Appointment with Dr. {doctor.FirstName} {doctor.LastName} tomorrow at {appointment.StartTime.ToString(@"hh\:mm tt")}";
                        
                        await CreateAppointmentNotificationAsync(patientUserAccountId, message, doctor.FirstName, doctor.LastName);
                    }
                    
                    // Send email notification to patient
                    if (!string.IsNullOrEmpty(patient.ApplicationUser.Email))
                    {
                        await _emailService.SendAppointmentReminderAsync(
                            patient.ApplicationUser.Email,
                            $"{patient.FirstName} {patient.LastName}",
                            $"{doctor.FirstName} {doctor.LastName}",
                            appointment.AppointmentDate,
                            appointment.StartTime
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating appointment reminder notifications");
            }
        }

        public async Task NotifyNewMessageAsync(int userAccountId, string senderName, string messagePreview)
        {
            string message = $"New message from {senderName}: {messagePreview}";
            
            string firstName = senderName.Contains(" ") ? senderName.Split(' ')[0] : senderName;
            string lastName = senderName.Contains(" ") ? senderName.Split(' ')[1] : "";
            
            await CreateAppointmentNotificationAsync(userAccountId, message, firstName, lastName);
        }
    }
} 