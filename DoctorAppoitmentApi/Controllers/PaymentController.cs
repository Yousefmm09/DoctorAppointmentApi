using DoctorAppoitmentApi.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DoctorAppoitmentApi.Data;
using DoctorAppoitmentApi.Models;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly PaymobService _paymobService;
        private readonly AppDbContext _context;
        private readonly ILogger<PaymentController> _logger;
        private readonly IConfiguration _configuration;
        
        public PaymentController(
            PaymobService paymobService, 
            AppDbContext context, 
            ILogger<PaymentController> logger,
            IConfiguration configuration)
        {
            _paymobService = paymobService;
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpPost("pay-for-appointment/{appointmentId}")]
        [AllowAnonymous] // Allow anonymous access for payment
        public async Task<IActionResult> PayForAppointment(int appointmentId)
        {
            try
            {
                _logger.LogInformation($"Processing payment for appointment ID: {appointmentId}");
                
                var appointment = await _context.Appointments
                    .Include(a => a.Patient)
                    .ThenInclude(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(a => a.Id == appointmentId);
                    
                if (appointment == null)
                {
                    _logger.LogWarning($"Appointment not found: {appointmentId}");
                    return NotFound("Appointment not found");
                }

                // Convert amount to cents (Paymob requires amount in cents)
                double fee = 0;
                if (!string.IsNullOrEmpty(appointment.AppointmentFee))
                {
                    if (!double.TryParse(appointment.AppointmentFee, out fee))
                    {
                        fee = 100; // Default to 100 if parsing fails
                    }
                }
                else
                {
                    fee = 100; // Default fee
                }
                
                var amount = (int)(fee * 100);
                _logger.LogInformation($"Payment amount: {fee} EGP ({amount} cents)");
                
                // Get patient's first and last name
                string firstName = "Patient";
                string lastName = "User";
                int userAccountId = 1; // Default value as fallback
                
                try
                {
                    if (appointment.Patient?.ApplicationUser != null)
                    {
                        firstName = appointment.Patient.ApplicationUser.FirstName ?? "Patient";
                        lastName = appointment.Patient.ApplicationUser.LastName ?? "User";
                        
                        _logger.LogInformation($"Processing payment for patient: {firstName} {lastName}, Email: {appointment.Patient.ApplicationUser.Email}");
                        
                        // Try to get a valid UserAccountId
                        // First check if there's a UserAccount with matching email
                        var userAccount = await _context.UserAccounts
                            .FirstOrDefaultAsync(u => u.Email == appointment.Patient.ApplicationUser.Email);
                        
                        if (userAccount != null)
                        {
                            userAccountId = userAccount.Id;
                            _logger.LogInformation($"Found UserAccount with ID: {userAccountId}");
                        }
                        else
                        {
                            // Try to find by patient ID
                            userAccount = await _context.UserAccounts
                                .FirstOrDefaultAsync(u => u.Id == appointment.Patient.Id);
                                
                            if (userAccount != null)
                            {
                                userAccountId = userAccount.Id;
                                _logger.LogInformation($"Found UserAccount by Patient.Id with ID: {userAccountId}");
                            }
                            else
                            {
                                // If no matching UserAccount, create one
                                userAccount = new UserAccount
                                {
                                    Email = appointment.Patient.ApplicationUser.Email ?? $"patient{appointment.Patient.Id}@example.com",
                                    PhoneNumber = appointment.Patient.PhoneNumber ?? "0000000000",
                                    IsActive = true,
                                    Role = "Patient",
                                    DateOfBirth = appointment.Patient.ApplicationUser.DateOfBirth,
                                    Password = "DefaultPassword" // This is just a placeholder, not actually used
                                };
                                
                                _context.UserAccounts.Add(userAccount);
                                await _context.SaveChangesAsync();
                                
                                userAccountId = userAccount.Id;
                                _logger.LogInformation($"Created new UserAccount with ID: {userAccountId}");
                            }
                        }
                        
                        _logger.LogInformation($"Patient name: {firstName} {lastName}, UserAccountId: {userAccountId}");
                    }
                    else
                    {
                        _logger.LogWarning($"Patient or ApplicationUser not found for appointment {appointmentId}, using default values");
                        
                        // Create a default UserAccount if none exists
                        var defaultUserAccount = await _context.UserAccounts.FirstOrDefaultAsync(u => u.Id == 1);
                        if (defaultUserAccount == null)
                        {
                            defaultUserAccount = new UserAccount
                            {
                                Email = "default@example.com",
                                PhoneNumber = "0000000000",
                                IsActive = true,
                                Role = "Patient",
                                DateOfBirth = DateTime.Now,
                                Password = "DefaultPassword"
                            };
                            
                            _context.UserAccounts.Add(defaultUserAccount);
                            await _context.SaveChangesAsync();
                            userAccountId = defaultUserAccount.Id;
                            _logger.LogInformation("Created default UserAccount with ID: 1");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error processing user account for appointment {appointmentId}");
                    // Continue with default values
                }
                
                // Check if a payment record already exists
                var existingPayment = await _context.Payments
                    .FirstOrDefaultAsync(p => p.AppointmentId == appointmentId);
                
                if (existingPayment != null)
                {
                    // Update existing payment
                    existingPayment.Status = "Pending";
                    existingPayment.FirstName = firstName;
                    existingPayment.LastName = lastName;
                    existingPayment.UserAccountId = userAccountId;
                    await _context.SaveChangesAsync();
                }
                else
                {
                    // Create new payment record
                    var payment = new Payment
                    {
                        AppointmentId = appointmentId,
                        UserAccountId = userAccountId,
                        Amount = fee,
                        PaymentMethod = "Paymob",
                        Status = "Pending",
                        TransactionId = $"TXN-{appointmentId}-{DateTime.Now.Ticks}",
                        PaymentDate = DateTime.Now,
                        FirstName = firstName,
                        LastName = lastName
                    };
                    
                    _context.Payments.Add(payment);
                    await _context.SaveChangesAsync();
                }

                try
                {
                    // Generate payment URL using Paymob service
                    string paymentUrl = await _paymobService.GeneratePaymentUrl(amount, appointmentId, firstName, lastName);
                    
                    // Check if we have a relative URL (like mock-payment.html) or an absolute URL
                    if (paymentUrl.StartsWith("/"))
                    {
                        // Convert relative URL to absolute
                        string baseUrl = $"{Request.Scheme}://{Request.Host}";
                        paymentUrl = $"{baseUrl}{paymentUrl}";
                    }
                    
                    _logger.LogInformation($"Generated payment URL for appointment {appointmentId}: {paymentUrl}");
                    
                    return Ok(new { payment_url = paymentUrl });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to generate payment URL with Paymob service for appointment {appointmentId}");
                    
                    // Generate a fallback mock payment URL
                    string baseUrl = $"{Request.Scheme}://{Request.Host}";
                    var mockUrl = $"{baseUrl}/mock-payment.html?appointmentId={appointmentId}&amount={fee}&firstName={firstName}&lastName={lastName}";
                    _logger.LogInformation($"Generated fallback mock payment URL for appointment {appointmentId}: {mockUrl}");
                    
                    return Ok(new { 
                        payment_url = mockUrl,
                        fallback = true,
                        error_message = "Payment provider currently unavailable. Using mock payment for testing."
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing payment for appointment {appointmentId}");
                return StatusCode(500, new { error = "Payment processing failed", details = ex.Message });
            }
        }

        [HttpGet("payment-status/{appointmentId}")]
        [AllowAnonymous] // Allow anonymous access for payment status check
        public async Task<IActionResult> GetPaymentStatus(int appointmentId)
        {
            try
            {
                _logger.LogInformation($"Checking payment status for appointment ID: {appointmentId}");
                
                var payment = await _context.Payments
                    .FirstOrDefaultAsync(p => p.AppointmentId == appointmentId);
                    
                if (payment == null)
                {
                    // If no payment record exists, create a pending one
                    var appointment = await _context.Appointments
                        .Include(a => a.Patient)
                        .ThenInclude(p => p.ApplicationUser)
                        .FirstOrDefaultAsync(a => a.Id == appointmentId);
                        
                    if (appointment == null)
                    {
                        _logger.LogWarning($"Appointment not found: {appointmentId}");
                        return NotFound("Appointment not found");
                    }
                    
                    double fee = 0;
                    if (!string.IsNullOrEmpty(appointment.AppointmentFee))
                    {
                        if (!double.TryParse(appointment.AppointmentFee, out fee))
                        {
                            fee = 100; // Default to 100 if parsing fails
                        }
                    }
                    else
                    {
                        fee = 100; // Default fee
                    }
                    
                    // Get patient's first and last name
                    string firstName = "Patient";
                    string lastName = "User";
                    int userAccountId = 1; // Default value as fallback
                    
                    try
                    {
                        if (appointment.Patient?.ApplicationUser != null)
                        {
                            firstName = appointment.Patient.ApplicationUser.FirstName ?? "Patient";
                            lastName = appointment.Patient.ApplicationUser.LastName ?? "User";
                            
                            _logger.LogInformation($"Processing payment status for patient: {firstName} {lastName}");
                            
                            // Try to get a valid UserAccountId
                            var userAccount = await _context.UserAccounts
                                .FirstOrDefaultAsync(u => u.Email == appointment.Patient.ApplicationUser.Email);
                            
                            if (userAccount != null)
                            {
                                userAccountId = userAccount.Id;
                                _logger.LogInformation($"Found UserAccount with ID: {userAccountId}");
                            }
                            else
                            {
                                // Try to find by patient ID
                                userAccount = await _context.UserAccounts
                                    .FirstOrDefaultAsync(u => u.Id == appointment.Patient.Id);
                                    
                                if (userAccount != null)
                                {
                                    userAccountId = userAccount.Id;
                                    _logger.LogInformation($"Found UserAccount by Patient.Id with ID: {userAccountId}");
                                }
                                else
                                {
                                    // If no matching UserAccount, create one
                                    userAccount = new UserAccount
                                    {
                                        Email = appointment.Patient.ApplicationUser.Email ?? $"patient{appointment.Patient.Id}@example.com",
                                        PhoneNumber = appointment.Patient.PhoneNumber ?? "0000000000",
                                        IsActive = true,
                                        Role = "Patient",
                                        DateOfBirth = appointment.Patient.ApplicationUser.DateOfBirth,
                                        Password = "DefaultPassword" // This is just a placeholder, not actually used
                                    };
                                    
                                    _context.UserAccounts.Add(userAccount);
                                    await _context.SaveChangesAsync();
                                    
                                    userAccountId = userAccount.Id;
                                    _logger.LogInformation($"Created new UserAccount with ID: {userAccountId}");
                                }
                            }
                        }
                        else
                        {
                            _logger.LogWarning($"Patient or ApplicationUser not found for appointment {appointmentId}, using default values");
                            
                            // Create a default UserAccount if none exists
                            var defaultUserAccount = await _context.UserAccounts.FirstOrDefaultAsync(u => u.Id == 1);
                            if (defaultUserAccount == null)
                            {
                                defaultUserAccount = new UserAccount
                                {
                                    Email = "default@example.com",
                                    PhoneNumber = "0000000000",
                                    IsActive = true,
                                    Role = "Patient",
                                    DateOfBirth = DateTime.Now,
                                    Password = "DefaultPassword"
                                };
                                
                                _context.UserAccounts.Add(defaultUserAccount);
                                await _context.SaveChangesAsync();
                                userAccountId = defaultUserAccount.Id;
                                _logger.LogInformation("Created default UserAccount with ID: 1");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing user account for payment status check on appointment {appointmentId}");
                        // Continue with default values
                    }
                    
                    payment = new Payment
                    {
                        AppointmentId = appointmentId,
                        UserAccountId = userAccountId,
                        Amount = fee,
                        PaymentMethod = "Paymob",
                        Status = "Pending",
                        TransactionId = $"TXN-{appointmentId}-{DateTime.Now.Ticks}",
                        PaymentDate = DateTime.Now,
                        FirstName = firstName,
                        LastName = lastName
                    };
                    
                    _context.Payments.Add(payment);
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation($"Created new payment record for appointment {appointmentId}");
                }
                
                return Ok(new { 
                    status = payment.Status,
                    amount = payment.Amount,
                    paymentMethod = payment.PaymentMethod,
                    transactionId = payment.TransactionId,
                    paymentDate = payment.PaymentDate,
                    firstName = payment.FirstName,
                    lastName = payment.LastName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking payment status for appointment {appointmentId}");
                return StatusCode(500, new { error = "Failed to check payment status", details = ex.Message });
            }
        }
        
        [HttpPost("mock-payment-complete/{appointmentId}")]
        [AllowAnonymous]
        public async Task<IActionResult> MockPaymentComplete(int appointmentId)
        {
            try
            {
                _logger.LogInformation($"Processing mock payment completion for appointment {appointmentId}");
                
                // Try to call the WebHook controller first
                var httpClient = new HttpClient();
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var webhookUrl = $"{baseUrl}/api/WebHook/mock-payment/{appointmentId}";
                
                try
                {
                    _logger.LogInformation($"Forwarding mock payment request to {webhookUrl}");
                    var response = await httpClient.PostAsync(
                        webhookUrl,
                        new StringContent("{}", System.Text.Encoding.UTF8, "application/json")
                    );
                    
                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation($"Mock payment for appointment {appointmentId} successfully processed by webhook");
                        return Ok(new { status = "completed" });
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        _logger.LogError($"Mock payment webhook call failed: {errorContent}");
                        // Fall through to direct DB update
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error calling mock payment webhook for appointment {appointmentId}");
                    // Fall through to direct DB update
                }
                
                // Fallback: Direct DB update
                _logger.LogWarning($"Falling back to direct DB update for mock payment on appointment {appointmentId}");
                
                // Get the appointment
                var appointment = await _context.Appointments
                    .Include(a => a.Patient)
                    .ThenInclude(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(a => a.Id == appointmentId);
                    
                if (appointment == null)
                {
                    return NotFound("Appointment not found");
                }
                
                // Update or create payment
                var payment = await _context.Payments
                    .FirstOrDefaultAsync(p => p.AppointmentId == appointmentId);
                    
                if (payment == null)
                {
                    // Create new payment
                    payment = new Payment
                    {
                        AppointmentId = appointmentId,
                        UserAccountId = appointment.PatientID > 0 ? appointment.PatientID : 1,
                        Amount = double.Parse(appointment.AppointmentFee ?? "100"),
                        PaymentMethod = "Mock Payment",
                        TransactionId = $"MOCK-{DateTime.Now.Ticks}",
                        PaymentDate = DateTime.Now,
                        FirstName = appointment.Patient?.ApplicationUser?.FirstName ?? "Patient",
                        LastName = appointment.Patient?.ApplicationUser?.LastName ?? "User",
                        Status = "Completed"
                    };
                    
                    _context.Payments.Add(payment);
                }
                else
                {
                    // Update existing payment
                    payment.Status = "Completed";
                    payment.TransactionId = payment.TransactionId + "-MOCK";
                    payment.PaymentMethod = "Mock Payment";
                    payment.PaymentDate = DateTime.Now;
                }
                
                // Update appointment status
                appointment.IsConfirmed = true;
                appointment.Status = "Confirmed";
                
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Mock payment for appointment {appointmentId} completed via direct DB update");
                
                return Ok(new { status = "completed" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in mock payment completion for appointment {appointmentId}");
                return StatusCode(500, new { error = "Failed to complete mock payment", details = ex.Message });
            }
        }

        [HttpGet("test-paymob-integration")]
        [AllowAnonymous]
        public IActionResult TestPaymobIntegration()
        {
            try
            {
                _logger.LogInformation("Testing Paymob integration configuration");
                
                var apiKey = _configuration["Paymob:ApiKey"] ?? "";
                var integrationId = _configuration.GetValue<int>("Paymob:IntegrationId", 0);
                var iframeId = _configuration["Paymob:IframeId"] ?? "";
                var useMockPayment = _configuration.GetValue<bool>("Paymob:UseMockPayment", false);
                var webhookEndpoint = _configuration["Paymob:WebhookEndpoint"] ?? "";
                
                var errors = new List<string>();
                
                if (string.IsNullOrEmpty(apiKey))
                {
                    errors.Add("Paymob API key is not configured");
                }
                else if (apiKey.Length < 20)
                {
                    errors.Add("Paymob API key appears invalid (too short)");
                }
                
                if (integrationId <= 0)
                {
                    errors.Add("Paymob Integration ID is invalid or not configured");
                }
                
                if (string.IsNullOrEmpty(iframeId))
                {
                    errors.Add("Paymob IFrame ID is not configured");
                }
                
                if (useMockPayment)
                {
                    errors.Add("Paymob is configured to use mock payments (UseMockPayment=true)");
                }
                
                if (string.IsNullOrEmpty(webhookEndpoint))
                {
                    errors.Add("Paymob Webhook endpoint is not configured");
                }
                
                return Ok(new
                {
                    status = errors.Count == 0 ? "ready" : "not_ready",
                    useMockPayment = useMockPayment,
                    errors = errors,
                    configuration = new
                    {
                        hasApiKey = !string.IsNullOrEmpty(apiKey),
                        integrationId = integrationId,
                        hasIframeId = !string.IsNullOrEmpty(iframeId),
                        webhookEndpoint = webhookEndpoint
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing Paymob integration");
                return StatusCode(500, new { error = "Failed to test Paymob integration", details = ex.Message });
            }
        }
    }
}
