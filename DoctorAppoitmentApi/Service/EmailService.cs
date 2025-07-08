using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DoctorAppoitmentApi.Service
{
    public interface IEmailService
    {
        Task SendEmailAsync(string email, string subject, string htmlMessage);
        Task SendAppointmentConfirmationAsync(string email, string patientName, string doctorName, DateTime appointmentDate, TimeSpan startTime);
        Task SendAppointmentReminderAsync(string email, string patientName, string doctorName, DateTime appointmentDate, TimeSpan startTime);
        Task SendAppointmentCancellationAsync(string email, string patientName, string doctorName, DateTime appointmentDate, TimeSpan startTime);
        Task SendDoctorAppointmentNotificationAsync(string email, string patientName, DateTime appointmentDate, TimeSpan startTime);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _senderEmail;
        private readonly string _senderName;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            
            _smtpServer = _configuration["EmailSettings:SmtpServer"];
            _smtpPort = int.Parse(_configuration["EmailSettings:SmtpPort"]);
            _smtpUsername = _configuration["EmailSettings:SmtpUsername"];
            _smtpPassword = _configuration["EmailSettings:SmtpPassword"];
            _senderEmail = _configuration["EmailSettings:SenderEmail"];
            _senderName = _configuration["EmailSettings:SenderName"];
            
            // Validate configuration
            if (string.IsNullOrEmpty(_smtpServer))
                _logger.LogError("SMTP server is not configured");
            if (_smtpPort <= 0)
                _logger.LogError("SMTP port is not configured correctly");
            if (string.IsNullOrEmpty(_smtpUsername))
                _logger.LogError("SMTP username is not configured");
            if (string.IsNullOrEmpty(_smtpPassword))
                _logger.LogError("SMTP password is not configured");
            if (string.IsNullOrEmpty(_senderEmail))
                _logger.LogError("Sender email is not configured");
            
            // Log email configuration (without password)
            _logger.LogInformation($"Email service initialized with: Server={_smtpServer}, Port={_smtpPort}, Username={_smtpUsername}, SenderEmail={_senderEmail}, SenderName={_senderName}");
        }

        public async Task SendEmailAsync(string email, string subject, string htmlMessage)
        {
            try
            {
                _logger.LogInformation($"Preparing to send email to {email} with subject '{subject}'");
                
                var client = new SmtpClient(_smtpServer, _smtpPort)
                {
                    Credentials = new NetworkCredential(_smtpUsername, _smtpPassword),
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 30000 // 30 seconds timeout
                };

                _logger.LogInformation($"SMTP client configured: Server={_smtpServer}, Port={_smtpPort}, SSL=Enabled");

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_senderEmail, _senderName),
                    Subject = subject,
                    Body = htmlMessage,
                    IsBodyHtml = true
                };

                mailMessage.To.Add(email);
                
                _logger.LogInformation($"Mail message prepared: From={_senderEmail}, To={email}, Subject='{subject}'");

                try
                {
                    _logger.LogInformation("Attempting to send email...");
                    await client.SendMailAsync(mailMessage);
                    _logger.LogInformation($"Email sent successfully to {email}");
                }
                catch (SmtpException smtpEx)
                {
                    _logger.LogError(smtpEx, $"SMTP error sending email to {email}: {smtpEx.StatusCode} - {smtpEx.Message}");
                    
                    if (smtpEx.InnerException != null)
                    {
                        _logger.LogError($"Inner exception: {smtpEx.InnerException.Message}");
                    }
                    
                    throw new Exception($"Failed to send email due to SMTP error: {smtpEx.Message}", smtpEx);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending email to {email}: {ex.Message}");
                
                if (ex.InnerException != null)
                {
                    _logger.LogError($"Inner exception: {ex.InnerException.Message}");
                }
                
                throw;
            }
        }

        public async Task SendAppointmentConfirmationAsync(string email, string patientName, string doctorName, DateTime appointmentDate, TimeSpan startTime)
        {
            string subject = "Appointment Confirmation";
            string formattedDate = appointmentDate.ToString("dddd, MMMM d, yyyy");
            string formattedTime = startTime.ToString(@"hh\:mm tt");
            
            string message = $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #4CAF50; color: white; padding: 10px; text-align: center; }}
                        .content {{ padding: 20px; border: 1px solid #ddd; }}
                        .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #777; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2>Appointment Confirmation</h2>
                        </div>
                        <div class='content'>
                            <p>Dear {patientName},</p>
                            <p>Your appointment with Dr. {doctorName} has been confirmed for {formattedDate} at {formattedTime}.</p>
                            <p>Please arrive 15 minutes before your scheduled appointment time.</p>
                            <p>If you need to reschedule or cancel your appointment, please do so at least 24 hours in advance.</p>
                            <p>Thank you for choosing our services!</p>
                        </div>
                        <div class='footer'>
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>";

            await SendEmailAsync(email, subject, message);
        }

        public async Task SendAppointmentReminderAsync(string email, string patientName, string doctorName, DateTime appointmentDate, TimeSpan startTime)
        {
            string subject = "Appointment Reminder";
            string formattedDate = appointmentDate.ToString("dddd, MMMM d, yyyy");
            string formattedTime = startTime.ToString(@"hh\:mm tt");
            
            string message = $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #2196F3; color: white; padding: 10px; text-align: center; }}
                        .content {{ padding: 20px; border: 1px solid #ddd; }}
                        .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #777; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2>Appointment Reminder</h2>
                        </div>
                        <div class='content'>
                            <p>Dear {patientName},</p>
                            <p>This is a reminder that you have an appointment with Dr. {doctorName} tomorrow on {formattedDate} at {formattedTime}.</p>
                            <p>Please arrive 15 minutes before your scheduled appointment time.</p>
                            <p>If you need to reschedule or cancel your appointment, please do so as soon as possible.</p>
                            <p>Thank you for choosing our services!</p>
                        </div>
                        <div class='footer'>
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>";

            await SendEmailAsync(email, subject, message);
        }

        public async Task SendAppointmentCancellationAsync(string email, string patientName, string doctorName, DateTime appointmentDate, TimeSpan startTime)
        {
            string subject = "Appointment Cancellation";
            string formattedDate = appointmentDate.ToString("dddd, MMMM d, yyyy");
            string formattedTime = startTime.ToString(@"hh\:mm tt");
            
            string message = $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #F44336; color: white; padding: 10px; text-align: center; }}
                        .content {{ padding: 20px; border: 1px solid #ddd; }}
                        .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #777; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2>Appointment Cancellation</h2>
                        </div>
                        <div class='content'>
                            <p>Dear {patientName},</p>
                            <p>Your appointment with Dr. {doctorName} scheduled for {formattedDate} at {formattedTime} has been cancelled.</p>
                            <p>If you wish to reschedule, please visit our website or contact our office.</p>
                            <p>Thank you for your understanding.</p>
                        </div>
                        <div class='footer'>
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>";

            await SendEmailAsync(email, subject, message);
        }

        public async Task SendDoctorAppointmentNotificationAsync(string email, string patientName, DateTime appointmentDate, TimeSpan startTime)
        {
            string subject = "New Appointment Scheduled";
            string formattedDate = appointmentDate.ToString("dddd, MMMM d, yyyy");
            string formattedTime = startTime.ToString(@"hh\:mm tt");
            
            string message = $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #673AB7; color: white; padding: 10px; text-align: center; }}
                        .content {{ padding: 20px; border: 1px solid #ddd; }}
                        .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #777; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2>New Appointment</h2>
                        </div>
                        <div class='content'>
                            <p>Dear Doctor,</p>
                            <p>A new appointment has been scheduled with patient {patientName} on {formattedDate} at {formattedTime}.</p>
                            <p>Please log in to your dashboard to confirm this appointment.</p>
                            <p>Thank you!</p>
                        </div>
                        <div class='footer'>
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>";

            await SendEmailAsync(email, subject, message);
        }
    }
} 