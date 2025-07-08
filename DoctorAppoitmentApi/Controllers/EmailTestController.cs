using DoctorAppoitmentApi.Service;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Net.Mail;
using System.Threading.Tasks;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmailTestController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly ILogger<EmailTestController> _logger;
        private readonly IConfiguration _configuration;

        public EmailTestController(IEmailService emailService, ILogger<EmailTestController> logger, IConfiguration configuration)
        {
            _emailService = emailService;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpGet("check-config")]
        public IActionResult CheckEmailConfiguration()
        {
            try
            {
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPort = _configuration["EmailSettings:SmtpPort"];
                var smtpUsername = _configuration["EmailSettings:SmtpUsername"];
                var senderEmail = _configuration["EmailSettings:SenderEmail"];
                var senderName = _configuration["EmailSettings:SenderName"];

                // Don't return the password
                return Ok(new
                {
                    SmtpServer = smtpServer,
                    SmtpPort = smtpPort,
                    SmtpUsername = smtpUsername,
                    SenderEmail = senderEmail,
                    SenderName = senderName,
                    ConfigurationValid = !string.IsNullOrEmpty(smtpServer) && 
                                        !string.IsNullOrEmpty(smtpPort) && 
                                        !string.IsNullOrEmpty(smtpUsername) && 
                                        !string.IsNullOrEmpty(senderEmail)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking email configuration");
                return StatusCode(500, new { error = $"Error checking configuration: {ex.Message}" });
            }
        }

        [HttpPost("send-test")]
        public async Task<IActionResult> SendTestEmail([FromBody] TestEmailDto model)
        {
            if (string.IsNullOrEmpty(model.Email))
            {
                return BadRequest("Email address is required");
            }

            _logger.LogInformation($"Starting test email sending to {model.Email}");

            try
            {
                string subject = "Test Email from Doctor Appointment System";
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
                                <h2>Test Email</h2>
                            </div>
                            <div class='content'>
                                <p>Dear User,</p>
                                <p>This is a test email from the Doctor Appointment System.</p>
                                <p>If you received this email, it means the email service is working correctly.</p>
                                <p>Best regards,</p>
                                <p>The Doctor Appointment System Team</p>
                            </div>
                            <div class='footer'>
                                <p>This is an automated message. Please do not reply to this email.</p>
                            </div>
                        </div>
                    </body>
                    </html>";

                await _emailService.SendEmailAsync(model.Email, subject, message);
                _logger.LogInformation($"Test email sent to {model.Email}");
                
                return Ok(new { message = $"Test email sent to {model.Email}" });
            }
            catch (SmtpException smtpEx)
            {
                _logger.LogError(smtpEx, $"SMTP error sending test email to {model.Email}: {smtpEx.StatusCode} - {smtpEx.Message}");
                
                if (smtpEx.InnerException != null)
                {
                    _logger.LogError($"Inner exception: {smtpEx.InnerException.Message}");
                }
                
                return StatusCode(500, new { 
                    error = $"SMTP error: {smtpEx.Message}",
                    statusCode = smtpEx.StatusCode.ToString(),
                    innerException = smtpEx.InnerException?.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending test email to {model.Email}: {ex.Message}");
                
                if (ex.InnerException != null)
                {
                    _logger.LogError($"Inner exception: {ex.InnerException.Message}");
                }
                
                return StatusCode(500, new { 
                    error = $"Failed to send email: {ex.Message}",
                    innerException = ex.InnerException?.Message
                });
            }
        }

        [HttpPost("send-direct")]
        public IActionResult SendDirectEmail([FromBody] TestEmailDto model)
        {
            if (string.IsNullOrEmpty(model.Email))
            {
                return BadRequest("Email address is required");
            }

            try
            {
                // Get email settings directly from configuration
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPort = int.Parse(_configuration["EmailSettings:SmtpPort"]);
                var smtpUsername = _configuration["EmailSettings:SmtpUsername"];
                var smtpPassword = _configuration["EmailSettings:SmtpPassword"];
                var senderEmail = _configuration["EmailSettings:SenderEmail"];
                var senderName = _configuration["EmailSettings:SenderName"];

                _logger.LogInformation($"Sending direct email using: Server={smtpServer}, Port={smtpPort}, Username={smtpUsername}");

                // Create SMTP client
                var client = new SmtpClient(smtpServer, smtpPort)
                {
                    Credentials = new System.Net.NetworkCredential(smtpUsername, smtpPassword),
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 30000 // 30 seconds timeout
                };

                // Create mail message
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName),
                    Subject = "Direct Test Email",
                    Body = "<h1>This is a direct test email</h1><p>If you received this email, the SMTP configuration is working correctly.</p>",
                    IsBodyHtml = true
                };

                mailMessage.To.Add(model.Email);

                // Send email synchronously for direct testing
                client.Send(mailMessage);
                _logger.LogInformation($"Direct test email sent to {model.Email}");

                return Ok(new { message = $"Direct test email sent to {model.Email}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending direct test email: {ex.Message}");
                
                if (ex.InnerException != null)
                {
                    _logger.LogError($"Inner exception: {ex.InnerException.Message}");
                }
                
                return StatusCode(500, new { 
                    error = $"Failed to send direct email: {ex.Message}",
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }
    }

    public class TestEmailDto
    {
        public string Email { get; set; }
    }
} 