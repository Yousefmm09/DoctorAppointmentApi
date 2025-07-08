using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DoctorAppoitmentApi.Models;

namespace DoctorAppoitmentApi.Service
{
    public class AppointmentReminderService : BackgroundService
    {
        private readonly ILogger<AppointmentReminderService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(12); // Check twice a day

        public AppointmentReminderService(
            ILogger<AppointmentReminderService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Appointment Reminder Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("Appointment Reminder Service running at: {time}", DateTimeOffset.Now);

                try
                {
                    await SendAppointmentReminders();
                    _logger.LogInformation("Finished sending appointment reminders.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending appointment reminders.");
                }

                // Wait for the next check interval
                await Task.Delay(_checkInterval, stoppingToken);
            }
        }

        private async Task SendAppointmentReminders()
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            // Find all appointments that are tomorrow and confirmed
            var tomorrow = DateTime.Today.AddDays(1);
            var appointments = await dbContext.Appointments
                .Include(a => a.Patient)
                    .ThenInclude(p => p.ApplicationUser)
                .Include(a => a.Doctor)
                    .ThenInclude(d => d.ApplicationUser)
                .Where(a => a.AppointmentDate.Date == tomorrow.Date && 
                           a.IsConfirmed && 
                           a.Status != "Cancelled")
                .ToListAsync();

            _logger.LogInformation("Found {count} appointments for reminder", appointments.Count);

            foreach (var appointment in appointments)
            {
                try
                {
                    if (appointment.Patient?.ApplicationUser?.Email != null)
                    {
                        await emailService.SendAppointmentReminderAsync(
                            appointment.Patient.ApplicationUser.Email,
                            $"{appointment.Patient.FirstName} {appointment.Patient.LastName}",
                            $"{appointment.Doctor.FirstName} {appointment.Doctor.LastName}",
                            appointment.AppointmentDate,
                            appointment.StartTime
                        );

                        _logger.LogInformation("Sent reminder for appointment {id}", appointment.Id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send reminder for appointment {id}", appointment.Id);
                }
            }
        }
    }
}
 