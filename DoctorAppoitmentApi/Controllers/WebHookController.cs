using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using DoctorAppoitmentApi.Data;
using DoctorAppoitmentApi.Models;
using System.Threading.Tasks;
using DoctorAppoitmentApi.Service;
using Microsoft.AspNetCore.Authorization;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WebHookController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<WebHookController> _logger;
        private readonly IEmailService _emailService;

        public WebHookController(AppDbContext context, ILogger<WebHookController> logger, IEmailService emailService)
        {
            _context = context;
            _logger = logger;
            _emailService = emailService;
        }

        [HttpPost("paymob")]
        [AllowAnonymous]
        public async Task<IActionResult> PaymobWebhook([FromBody] JsonElement body)
        {
            try
            {
                _logger.LogInformation("Received Paymob webhook: {PaymobWebhook}", body.ToString());

                // Extract data from the webhook
                if (!body.TryGetProperty("obj", out var obj))
                {
                    _logger.LogWarning("Missing 'obj' property in Paymob webhook");
                    return BadRequest("Invalid webhook format");
                }

                // Check transaction status
                var success = obj.TryGetProperty("success", out var successProp) && successProp.GetBoolean();
                var isPending = obj.TryGetProperty("pending", out var pendingProp) && pendingProp.GetBoolean();
                var isVoided = obj.TryGetProperty("is_voided", out var isVoidedProp) && isVoidedProp.GetBoolean();
                var isRefunded = obj.TryGetProperty("is_refunded", out var isRefundedProp) && isRefundedProp.GetBoolean();
                
                // Get the order ID which should be our appointment ID
                var orderId = 0;
                string merchantOrderId = "";

                if (obj.TryGetProperty("order", out var orderProp))
                {
                    // Try to get merchant_order_id (this is our appointmentId)
                    if (orderProp.TryGetProperty("merchant_order_id", out var merchantOrderIdProp))
                    {
                        if (merchantOrderIdProp.ValueKind == JsonValueKind.Number)
                        {
                            orderId = merchantOrderIdProp.GetInt32();
                        }
                        else if (merchantOrderIdProp.ValueKind == JsonValueKind.String)
                        {
                            merchantOrderId = merchantOrderIdProp.GetString();
                            if (int.TryParse(merchantOrderId, out int parsedId))
                            {
                                orderId = parsedId;
                            }
                        }
                    }
                    // Fallback to order id if merchant_order_id is not available
                    else if (orderId == 0 && orderProp.TryGetProperty("id", out var orderIdProp))
                    {
                        orderId = orderIdProp.GetInt32();
                    }
                }
                
                if (orderId == 0)
                {
                    _logger.LogWarning("Invalid order ID in Paymob webhook: {MerchantOrderId}", merchantOrderId);
                    return BadRequest("Invalid order ID");
                }

                // Get transaction ID
                string transactionId = "Unknown";
                if (obj.TryGetProperty("transaction_id", out var txnIdProp))
                {
                    if (txnIdProp.ValueKind == JsonValueKind.Number)
                    {
                        transactionId = txnIdProp.GetInt64().ToString();
                    }
                    else if (txnIdProp.ValueKind == JsonValueKind.String)
                    {
                        transactionId = txnIdProp.GetString();
                    }
                }
                else if (obj.TryGetProperty("id", out var idProp))
                {
                    if (idProp.ValueKind == JsonValueKind.Number)
                    {
                        transactionId = idProp.GetInt64().ToString();
                    }
                    else if (idProp.ValueKind == JsonValueKind.String)
                    {
                        transactionId = idProp.GetString();
                    }
                }

                // Get amount information
                double amount = 0;
                if (obj.TryGetProperty("amount_cents", out var amountProp))
                {
                    // Convert from cents to actual currency
                    amount = amountProp.GetInt64() / 100.0;
                }

                // Get payment method information if available
                string paymentMethod = "Paymob";
                if (obj.TryGetProperty("source_data", out var sourceDataProp))
                {
                    if (sourceDataProp.TryGetProperty("type", out var typeProp))
                    {
                        paymentMethod = typeProp.GetString() ?? "Paymob";
                    }
                }

                // Update appointment and payment
                var appointment = await _context.Appointments
                    .Include(a => a.Patient)
                    .ThenInclude(p => p.ApplicationUser)
                    .Include(a => a.Doctor)
                    .ThenInclude(d => d.ApplicationUser)
                    .FirstOrDefaultAsync(a => a.Id == orderId);
                    
                if (appointment == null)
                {
                    _logger.LogWarning("Appointment not found for order ID: {OrderId}", orderId);
                    return NotFound("Appointment not found");
                }

                // Update payment record
                var payment = await _context.Payments
                    .FirstOrDefaultAsync(p => p.AppointmentId == orderId);
                
                if (payment == null)
                {
                    // Create new payment record if none exists
                    _logger.LogInformation("Creating new payment record for appointment ID: {AppointmentId}", orderId);
                    
                    payment = new Payment
                    {
                        AppointmentId = orderId,
                        UserAccountId = appointment.PatientID > 0 ? appointment.PatientID : 1, // Use patient ID if available
                        Amount = amount > 0 ? amount : double.Parse(appointment.AppointmentFee ?? "100"), // Use received amount or appointment fee
                        PaymentMethod = paymentMethod,
                        TransactionId = transactionId,
                        PaymentDate = DateTime.Now,
                        FirstName = appointment.Patient?.ApplicationUser?.FirstName ?? "Patient",
                        LastName = appointment.Patient?.ApplicationUser?.LastName ?? "User",
                        Status = "Pending"
                    };
                    
                    _context.Payments.Add(payment);
                }
                else
                {
                    // Update existing payment
                    payment.TransactionId = transactionId;
                    if (amount > 0)
                    {
                        payment.Amount = amount;
                    }
                    payment.PaymentMethod = paymentMethod;
                }
                
                // Update payment status based on transaction status
                if (success)
                {
                    payment.Status = "Completed";
                    appointment.IsConfirmed = true;
                    appointment.Status = "Confirmed";
                    
                    _logger.LogInformation("Payment {TransactionId} completed successfully for appointment {AppointmentId}", 
                        transactionId, orderId);
                        
                    // Send confirmation email to patient
                    if (appointment.Patient?.ApplicationUser?.Email != null)
                    {
                        try
                        {
                            await _emailService.SendEmailAsync(
                                appointment.Patient.ApplicationUser.Email,
                                "Appointment Payment Confirmation",
                                $"Dear {appointment.Patient.ApplicationUser.FirstName},<br><br>" +
                                $"Your payment for appointment #{appointment.Id} with Dr. {appointment.Doctor?.ApplicationUser?.FirstName} {appointment.Doctor?.ApplicationUser?.LastName} " +
                                $"on {appointment.AppointmentDate.ToString("yyyy-MM-dd")} at {appointment.StartTime} has been confirmed.<br><br>" +
                                $"Payment Details:<br>" +
                                $"- Amount: ${payment.Amount}<br>" +
                                $"- Transaction ID: {payment.TransactionId}<br>" +
                                $"- Payment Method: {payment.PaymentMethod}<br><br>" +
                                $"Thank you for using our service.<br><br>" +
                                $"Best regards,<br>" +
                                $"Doctor Appointment System"
                            );
                        }
                        catch (Exception emailEx)
                        {
                            _logger.LogError(emailEx, "Failed to send payment confirmation email");
                        }
                    }
                }
                else if (isPending)
                {
                    payment.Status = "Pending";
                    _logger.LogInformation("Payment {TransactionId} is pending for appointment {AppointmentId}", 
                        transactionId, orderId);
                }
                else if (isVoided || isRefunded)
                {
                    payment.Status = isVoided ? "Voided" : "Refunded";
                    _logger.LogInformation("Payment {TransactionId} is {Status} for appointment {AppointmentId}", 
                        transactionId, payment.Status, orderId);
                }
                else
                {
                    payment.Status = "Failed";
                    _logger.LogWarning("Payment {TransactionId} failed for appointment {AppointmentId}", 
                        transactionId, orderId);
                }
                
                await _context.SaveChangesAsync();

                return Ok(new { status = "success", message = "Webhook processed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Paymob webhook");
                return StatusCode(500, new { error = "Error processing webhook", details = ex.Message });
            }
        }

        // Support endpoint for testing webhook handling
        [HttpPost("test-webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> TestWebhook([FromBody] JsonElement body)
        {
            try
            {
                _logger.LogInformation("Received test webhook: {TestWebhook}", body.ToString());
                
                // For testing, we'll simulate a successful payment
                int appointmentId = 0;
                
                // Try to extract appointment ID from the body
                if (body.TryGetProperty("appointment_id", out var appointmentIdProp))
                {
                    if (appointmentIdProp.ValueKind == JsonValueKind.Number)
                    {
                        appointmentId = appointmentIdProp.GetInt32();
                    }
                    else if (appointmentIdProp.ValueKind == JsonValueKind.String)
                    {
                        string idStr = appointmentIdProp.GetString();
                        if (int.TryParse(idStr, out int parsedId))
                        {
                            appointmentId = parsedId;
                        }
                    }
                }
                
                if (appointmentId == 0)
                {
                    return BadRequest(new { error = "Missing or invalid appointment_id" });
                }
                
                // Find the appointment
                var appointment = await _context.Appointments.FindAsync(appointmentId);
                if (appointment == null)
                {
                    return NotFound(new { error = "Appointment not found" });
                }
                
                // Update the payment (create if not exists)
                var payment = await _context.Payments.FirstOrDefaultAsync(p => p.AppointmentId == appointmentId);
                if (payment == null)
                {
                    payment = new Payment
                    {
                        AppointmentId = appointmentId,
                        UserAccountId = appointment.PatientID > 0 ? appointment.PatientID : 1,
                        Amount = double.Parse(appointment.AppointmentFee ?? "100"),
                        PaymentMethod = "Test",
                        TransactionId = $"TEST-{DateTime.Now.Ticks}",
                        PaymentDate = DateTime.Now,
                        FirstName = "Test",
                        LastName = "User",
                        Status = "Completed"
                    };
                    
                    _context.Payments.Add(payment);
                }
                else
                {
                    payment.Status = "Completed";
                    payment.TransactionId = $"TEST-{DateTime.Now.Ticks}";
                }
                
                // Update the appointment
                appointment.IsConfirmed = true;
                appointment.Status = "Confirmed";
                
                await _context.SaveChangesAsync();
                
                return Ok(new { status = "success", message = "Test webhook processed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing test webhook");
                return StatusCode(500, new { error = "Error processing webhook", details = ex.Message });
            }
        }
        
        // Mock payment endpoint for testing 
        [HttpPost("mock-payment/{appointmentId}")]
        [AllowAnonymous]
        public async Task<IActionResult> MockPayment(int appointmentId)
        {
            try
            {
                _logger.LogInformation("Processing mock payment for appointment ID: {AppointmentId}", appointmentId);
                
                var appointment = await _context.Appointments
                    .Include(a => a.Patient)
                    .ThenInclude(p => p.ApplicationUser)
                    .Include(a => a.Doctor)
                    .ThenInclude(d => d.ApplicationUser)
                    .FirstOrDefaultAsync(a => a.Id == appointmentId);
                
                if (appointment == null)
                {
                    return NotFound(new { error = "Appointment not found" });
                }
                
                // Update or create payment
                var payment = await _context.Payments.FirstOrDefaultAsync(p => p.AppointmentId == appointmentId);
                if (payment == null)
                {
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
                    payment.Status = "Completed";
                    payment.TransactionId = $"MOCK-{DateTime.Now.Ticks}";
                    payment.PaymentDate = DateTime.Now;
                }
                
                // Update appointment status
                appointment.IsConfirmed = true;
                appointment.Status = "Confirmed";
                
                await _context.SaveChangesAsync();
                
                // Send confirmation email
                if (appointment.Patient?.ApplicationUser?.Email != null)
                {
                    try
                    {
                        await _emailService.SendEmailAsync(
                            appointment.Patient.ApplicationUser.Email,
                            "Appointment Payment Confirmation (Mock)",
                            $"Dear {appointment.Patient.ApplicationUser.FirstName},<br><br>" +
                            $"Your mock payment for appointment #{appointment.Id} with Dr. {appointment.Doctor?.ApplicationUser?.FirstName} {appointment.Doctor?.ApplicationUser?.LastName} " +
                            $"on {appointment.AppointmentDate.ToString("yyyy-MM-dd")} at {appointment.StartTime} has been confirmed.<br><br>" +
                            $"Payment Details:<br>" +
                            $"- Amount: ${payment.Amount}<br>" +
                            $"- Transaction ID: {payment.TransactionId}<br>" +
                            $"- Payment Method: {payment.PaymentMethod}<br><br>" +
                            $"This is a mock payment for testing purposes.<br><br>" +
                            $"Thank you for using our service.<br><br>" +
                            $"Best regards,<br>" +
                            $"Doctor Appointment System"
                        );
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError(emailEx, "Failed to send mock payment confirmation email");
                    }
                }
                
                return Ok(new { status = "success", message = "Mock payment processed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing mock payment");
                return StatusCode(500, new { error = "Error processing mock payment", details = ex.Message });
            }
        }
    }
}
