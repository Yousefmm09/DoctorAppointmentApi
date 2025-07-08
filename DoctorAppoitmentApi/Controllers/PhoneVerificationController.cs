using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;
using System.Linq;
using DoctorAppoitmentApi.Models;
using DoctorAppoitmentApi.Dto;
using DoctorAppoitmentApi.Service;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PhoneVerificationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ISmsService _smsService;
        private readonly ILogger<PhoneVerificationController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;

        public PhoneVerificationController(
            AppDbContext context,
            ISmsService smsService,
            ILogger<PhoneVerificationController> logger,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _smsService = smsService;
            _logger = logger;
            _userManager = userManager;
        }

        [HttpPost("request-code")]
        [Authorize]
        public async Task<IActionResult> RequestVerificationCode([FromBody] PhoneVerificationDto request)
        {
            try
            {
                // Validate request
                if (string.IsNullOrEmpty(request.UserId) || string.IsNullOrEmpty(request.NewPhoneNumber))
                {
                    return BadRequest(new { success = false, message = "User ID and phone number are required" });
                }

                // Validate phone number format
                if (!IsValidPhoneNumber(request.NewPhoneNumber))
                {
                    return BadRequest(new { success = false, message = "Invalid phone number format. Please use the format +201234567890" });
                }

                // Check if phone number is already in use by another user
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.PhoneNumber == request.NewPhoneNumber && u.Id != request.UserId);

                if (existingUser != null)
                {
                    return BadRequest(new { success = false, message = "This phone number is already in use by another user" });
                }

                // Generate verification code
                string verificationCode = _smsService.GenerateVerificationCode();

                // Send verification code via SMS
                bool smsSent = await _smsService.SendVerificationCodeAsync(request.NewPhoneNumber, verificationCode);

                if (!smsSent)
                {
                    return StatusCode(500, new { success = false, message = "Failed to send verification code. Please try again later." });
                }

                return Ok(new { success = true, message = "Verification code sent successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RequestVerificationCode");
                return StatusCode(500, new { success = false, message = "An error occurred while processing your request" });
            }
        }

        [HttpPost("verify-code")]
        [Authorize]
        public async Task<IActionResult> VerifyCode([FromBody] VerifyPhoneCodeDto request)
        {
            try
            {
                // Validate request
                if (string.IsNullOrEmpty(request.UserId) || 
                    string.IsNullOrEmpty(request.NewPhoneNumber) || 
                    string.IsNullOrEmpty(request.VerificationCode))
                {
                    return BadRequest(new { success = false, message = "User ID, phone number, and verification code are required" });
                }

                // Validate the verification code
                bool isCodeValid = SmsService.ValidateVerificationCode(request.NewPhoneNumber, request.VerificationCode);

                if (!isCodeValid)
                {
                    return BadRequest(new { success = false, message = "Invalid or expired verification code" });
                }

                // Update the user's phone number
                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Update phone number in ApplicationUser table
                user.PhoneNumber = request.NewPhoneNumber;
                var updateResult = await _userManager.UpdateAsync(user);

                if (!updateResult.Succeeded)
                {
                    return StatusCode(500, new { success = false, message = "Failed to update user phone number" });
                }

                // Update phone number in the specific user type table (Patient or Doctor)
                if (request.UserType.Equals("Patient", StringComparison.OrdinalIgnoreCase))
                {
                    var patient = await _context.Patients.FirstOrDefaultAsync(p => p.ApplicationUserId == request.UserId);
                    if (patient != null)
                    {
                        patient.PhoneNumber = request.NewPhoneNumber;
                    }
                }
                else if (request.UserType.Equals("Doctor", StringComparison.OrdinalIgnoreCase))
                {
                    var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.ApplicationUserId == request.UserId);
                    if (doctor != null)
                    {
                        doctor.PhoneNumber = request.NewPhoneNumber;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Phone number updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in VerifyCode");
                return StatusCode(500, new { success = false, message = "An error occurred while processing your request" });
            }
        }

        private bool IsValidPhoneNumber(string phoneNumber)
        {
            // Basic validation for phone numbers starting with + followed by digits
            // Can be enhanced with more specific country code validation
            return !string.IsNullOrEmpty(phoneNumber) && 
                   phoneNumber.StartsWith("+") && 
                   phoneNumber.Length >= 8 && 
                   phoneNumber.Substring(1).All(char.IsDigit);
        }
    }
} 