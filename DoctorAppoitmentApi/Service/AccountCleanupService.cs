using DoctorAppoitmentApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace DoctorAppoitmentApi.Service
{
    public class AccountCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AccountCleanupService> _logger;
        private readonly TimeSpan _processingInterval = TimeSpan.FromHours(24); // Run once per day

        public AccountCleanupService(
            IServiceScopeFactory scopeFactory,
            ILogger<AccountCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Account Cleanup Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessDeletionRequests();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing account deletion requests");
                }

                // Wait for the next processing interval
                await Task.Delay(_processingInterval, stoppingToken);
            }

            _logger.LogInformation("Account Cleanup Service is stopping.");
        }

        private async Task ProcessDeletionRequests()
        {
            _logger.LogInformation("Processing account deletion requests...");

            using var scope = _scopeFactory.CreateScope();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            // Get users who requested deletion more than 30 days ago
            var deletionCutoff = DateTime.UtcNow.AddDays(-30);
            var usersToDelete = await userManager.Users
                .Where(u => u.DeletionRequestedAt.HasValue && u.DeletionRequestedAt.Value <= deletionCutoff)
                .ToListAsync();

            _logger.LogInformation($"Found {usersToDelete.Count} users to delete");

            foreach (var user in usersToDelete)
            {
                try
                {
                    _logger.LogInformation($"Processing deletion for user {user.Id} ({user.Email})");

                    // Get user roles to determine which related data to remove
                    var roles = await userManager.GetRolesAsync(user);
                    
                    using var transaction = await context.Database.BeginTransactionAsync();
                    try
                    {
                        // Handle patient data removal
                        if (roles.Contains("Patient"))
                        {
                            var patient = await context.Patients
                                .FirstOrDefaultAsync(p => p.ApplicationUserId == user.Id);
                            
                            if (patient != null)
                            {
                                // Remove appointments
                                var appointments = await context.Appointments
                                    .Where(a => a.PatientID == patient.Id)
                                    .ToListAsync();
                                
                                context.Appointments.RemoveRange(appointments);
                                
                                // Remove ratings if any
                                var ratings = await context.Ratings
                                    .Where(r => r.PatientId == patient.Id)
                                    .ToListAsync();
                                
                                context.Ratings.RemoveRange(ratings);
                                
                                // Remove patient record
                                context.Patients.Remove(patient);
                            }
                        }
                        // Handle doctor data removal
                        else if (roles.Contains("Doctor"))
                        {
                            var doctor = await context.Doctors
                                .FirstOrDefaultAsync(d => d.ApplicationUserId == user.Id);
                            
                            if (doctor != null)
                            {
                                // Remove appointments
                                var appointments = await context.Appointments
                                    .Where(a => a.DoctorID == doctor.Id)
                                    .ToListAsync();
                                
                                context.Appointments.RemoveRange(appointments);
                                
                                // Remove availability
                                var availabilities = await context.DoctorAvailabilities
                                    .Where(a => a.DoctorID == doctor.Id)
                                    .ToListAsync();
                                
                                context.DoctorAvailabilities.RemoveRange(availabilities);
                                
                                // Remove doctor record
                                context.Doctors.Remove(doctor);
                            }
                        }
                        
                        // Remove chat messages
                        var messages = await context.ChatMessages
                            .Where(m => (m.DoctorSenderId != null && m.DoctorSender.ApplicationUserId == user.Id) ||
                                       (m.PatientSenderId != null && m.PatientSender.ApplicationUserId == user.Id) ||
                                       (m.DoctorReceiverId != null && m.DoctorReceiver.ApplicationUserId == user.Id) ||
                                       (m.PatientReceiverId != null && m.PatientReceiver.ApplicationUserId == user.Id))
                            .ToListAsync();
                        
                        context.ChatMessages.RemoveRange(messages);
                        
                        // Remove notifications
                        var notifications = await context.Notifications
                            .Where(n => n.UserAccountId.ToString() == user.Id)
                            .ToListAsync();
                        
                        context.Notifications.RemoveRange(notifications);
                        
                        await context.SaveChangesAsync();
                        
                        // Remove profile picture file if it exists
                        if (!string.IsNullOrEmpty(user.ProfilePicture))
                        {
                            var filePath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", user.ProfilePicture.TrimStart('/'));
                            if (System.IO.File.Exists(filePath))
                            {
                                try
                                {
                                    System.IO.File.Delete(filePath);
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, $"Error deleting profile picture for user {user.Id}");
                                }
                            }
                        }
                        
                        // Remove user account
                        await userManager.DeleteAsync(user);
                        
                        await transaction.CommitAsync();
                        
                        // Send confirmation email
                        string subject = "Account Deletion Completed - Doctor Appointment System";
                        string message = $@"
                        <!DOCTYPE html>
                            <html>
                            <head>
                            <meta charset='UTF-8'>
                                <style>
                                .container {{
                                    font-family: Arial, sans-serif;
                                    max-width: 600px;
                                    margin: 0 auto;
                                    padding: 20px;
                                }}
                                .header {{
                                    background-color: #4F46E5;
                                    color: white;
                                    padding: 20px;
                                    text-align: center;
                                    border-radius: 5px 5px 0 0;
                                }}
                                .content {{
                                    background-color: #f9f9f9;
                                    padding: 20px;
                                    border-left: 1px solid #ddd;
                                    border-right: 1px solid #ddd;
                                }}
                                .footer {{
                                    background-color: #f3f4f6;
                                    padding: 10px 20px;
                                    border-radius: 0 0 5px 5px;
                                    border: 1px solid #ddd;
                                    font-size: 0.8em;
                                    color: #666;
                                    text-align: center;
                                }}
                                </style>
                            </head>
                            <body>
                                <div class='container'>
                                    <div class='header'>
                                    <h2>Account Deletion Completed</h2>
                                    </div>
                                    <div class='content'>
                                    <p>Hello,</p>
                                    <p>We are writing to confirm that your account and all associated data have been permanently deleted from our system as per your request.</p>
                                    <p>If you wish to use our services in the future, you will need to create a new account.</p>
                                    <p>Thank you for having been a part of our community.</p>
                                    </div>
                                    <div class='footer'>
                                        <p>This is an automated message. Please do not reply to this email.</p>
                                    </div>
                                </div>
                            </body>
                            </html>";
                        
                        await emailService.SendEmailAsync(user.Email, subject, message);
                        _logger.LogInformation($"Successfully deleted user {user.Id} ({user.Email})");
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        _logger.LogError(ex, $"Error removing data for user {user.Id}");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error processing deletion for user {user.Id}");
                }
            }

            _logger.LogInformation("Finished processing account deletion requests");
        }
    }
}
 