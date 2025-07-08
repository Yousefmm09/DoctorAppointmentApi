using DoctorAppoitmentApi.Models;
using DoctorAppoitmentApi.Service;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Logging;
using System.Web;
using Microsoft.AspNetCore.Cors;
using DoctorAppoitmentApi.Dto;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using System.Text;
using System.Text.Json;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;
        private readonly ILogger<AccountController> _logger;

        public AccountController(UserManager<ApplicationUser> userManager, IConfiguration config, AppDbContext context, IEmailService emailService, ILogger<AccountController> logger)
        {
            _userManager = userManager;
            _config = config;
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        // Simple DTO for resending confirmation emails
        public class ResendConfirmationDto
        {
            public string Email { get; set; }
        }

        // Registration for patients
        // and doctors

        [HttpPost("registration/doctor")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> RegistrationDoctorAsync([FromForm] DoctorRegistrationDto userRegistration)
        {
            if (userRegistration == null)
                return BadRequest("User account is null");

            if (userRegistration.Password != userRegistration.ConfirmPassword)
                return BadRequest("Password and confirmation password do not match.");

            var existingUser = await _userManager.FindByEmailAsync(userRegistration.Email);
            if (existingUser != null)
                return Conflict("Email already exists");

            string roleToAssign = "Doctor"; // Only Doctor allowed

            string? profilePicturePath = null;

            // Handle image upload
            if (userRegistration.ProfilePictureFile != null)
            {
                try
                {
                    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
                    var fileExtension = Path.GetExtension(userRegistration.ProfilePictureFile.FileName).ToLower();

                    if (!allowedExtensions.Contains(fileExtension))
                        return BadRequest("Only image files (jpg, jpeg, png) are allowed.");

                    if (userRegistration.ProfilePictureFile.Length > 2 * 1024 * 1024)
                        return BadRequest("Image size must be less than 2MB.");

                    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "doctor");
                    if (!Directory.Exists(uploadsFolder))
                        Directory.CreateDirectory(uploadsFolder);

                    var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(userRegistration.ProfilePictureFile.FileName)}";
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                    using var stream = new FileStream(filePath, FileMode.Create);
                    await userRegistration.ProfilePictureFile.CopyToAsync(stream);

                    profilePicturePath = $"/uploads/doctor/{uniqueFileName}";
                }
                catch (Exception ex)
                {
                    return StatusCode(500, $"Error uploading profile picture: {ex.Message}");
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var user = new ApplicationUser
                {
                    UserName = userRegistration.Email,
                    Email = userRegistration.Email,
                    PhoneNumber = userRegistration.PhoneNumber,
                    Address = userRegistration.Address,
                    ProfilePicture = profilePicturePath,
                    FirstName = userRegistration.FirstName,
                    LastName = userRegistration.LastName,
                    Gender = userRegistration.Gender,
                    DateOfBirth = userRegistration.DateOfBirth,
                    EmailConfirmed = false // Ensure email is not confirmed yet
                };

                var result = await _userManager.CreateAsync(user, userRegistration.Password);
                if (!result.Succeeded)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(result.Errors);
                }

                var roleResult = await _userManager.AddToRoleAsync(user, roleToAssign);
                if (!roleResult.Succeeded)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(roleResult.Errors);
                }

                // Clinic handling
                int? clinicId = null;
                string clinicName = "Default Clinic";

                if (userRegistration.Clinic != null && !string.IsNullOrWhiteSpace(userRegistration.Clinic.Name))
                {
                    var existingClinic = await _context.Clinics
                        .FirstOrDefaultAsync(c =>
                            c.Name == userRegistration.Clinic.Name &&
                            c.Address == userRegistration.Clinic.Address);

                    if (existingClinic == null)
                    {
                        var newClinic = new Clinics
                        {
                            Name = userRegistration.Clinic.Name,
                            Address = userRegistration.Clinic.Address ?? "",
                            PhoneNumber = userRegistration.Clinic.PhoneNumber ?? "",
                            Description = userRegistration.Clinic.Description ?? "",
                            LicenseNumber = userRegistration.Clinic.LicenseNumber,
                            OpeningTime = userRegistration.Clinic.OpeningTime,
                            ClosingTime = userRegistration.Clinic.ClosingTime
                        };
                        _context.Clinics.Add(newClinic);
                        await _context.SaveChangesAsync();
                        clinicId = newClinic.Id;
                        clinicName = newClinic.Name;
                    }
                    else
                    {
                        clinicId = existingClinic.Id;
                        clinicName = existingClinic.Name;
                    }
                }

                var doctor = new Doctors
                {
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    Address = user.Address,
                    Gender = user.Gender,
                    DateofBitrh = user.DateOfBirth,
                    ProfilePicture = user.ProfilePicture,
                    ApplicationUserId = user.Id,
                    SpecializationID = userRegistration.SpecializationId ?? 0,
                    ClinicID = clinicId ?? 0,
                    CurrentFee=userRegistration.CurrentFee,
                    Description = userRegistration.Description,
                    Experience = userRegistration.Experience,
                    Qualification = userRegistration.Qualification,
                };

                _context.Doctors.Add(doctor);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Send email confirmation
                await SendEmailConfirmationAsync(user);

                return Ok(new
                {
                    message = $"Registration successful as {roleToAssign}. Please check your email to confirm your account.",
                    userId = user.Id,
                    email = user.Email,
                    profilePicture = user.ProfilePicture,
                    roles = new[] { roleToAssign },
                    confirmed = false
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"An error occurred during registration: {ex.Message} {(ex.InnerException != null ? " | " + ex.InnerException.Message : "")}");
            }
        }

        //registration for patients
        [HttpPost("Registration/patient")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> RegistrationPatientAsync([FromForm] UserRegistration userRegistration)
        {
            if (userRegistration == null)
                return BadRequest("User account is null");

            if (userRegistration.Password != userRegistration.ConfirmPassword)
                return BadRequest("Password and confirmation password do not match.");

            var existingUser = await _userManager.FindByEmailAsync(userRegistration.Email);
            if (existingUser != null)
                return Conflict("Email already exists");

            string roleToAssign = "Patient";
            string? profilePicturePath = null;

            // رفع الصورة
            if (userRegistration.ProfilePictureFile != null)
            {
                try
                {
                    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
                    var fileExtension = Path.GetExtension(userRegistration.ProfilePictureFile.FileName).ToLower();

                    if (!allowedExtensions.Contains(fileExtension))
                        return BadRequest("Only image files (jpg, jpeg, png) are allowed.");

                    if (userRegistration.ProfilePictureFile.Length > 2 * 1024 * 1024)
                        return BadRequest("Image size must be less than 2MB.");

                    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "patient");
                    if (!Directory.Exists(uploadsFolder))
                        Directory.CreateDirectory(uploadsFolder);

                    var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(userRegistration.ProfilePictureFile.FileName)}";
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                    using var stream = new FileStream(filePath, FileMode.Create);
                    await userRegistration.ProfilePictureFile.CopyToAsync(stream);

                    profilePicturePath = $"/uploads/patient/{uniqueFileName}";
                }
                catch (Exception ex)
                {
                    return StatusCode(500, $"Error uploading profile picture: {ex.Message}");
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var user = new ApplicationUser
                {
                    UserName = userRegistration.Email,
                    Email = userRegistration.Email,
                    PhoneNumber = userRegistration.PhoneNumber,
                    Address = userRegistration.Address,
                    ProfilePicture = profilePicturePath,
                    FirstName = userRegistration.FirstName,
                    LastName = userRegistration.LastName,
                    Gender = userRegistration.Gender,
                    DateOfBirth = userRegistration.DateOfBirth,
                    EmailConfirmed = false // Ensure email is not confirmed yet
                };

                var result = await _userManager.CreateAsync(user, userRegistration.Password);
                if (!result.Succeeded)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(result.Errors);
                }

                var roleResult = await _userManager.AddToRoleAsync(user, roleToAssign);
                if (!roleResult.Succeeded)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(roleResult.Errors);
                }

                var patient = new Patient
                {
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    Address = user.Address,
                    Gender = user.Gender,
                    DateOfBirth = user.DateOfBirth,
                    ProfilePicture = user.ProfilePicture,
                    ApplicationUserId = user.Id,
                    City = userRegistration.city,
                    ZipCode = userRegistration.ZipCode,
                };

                _context.Patients.Add(patient);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Send email confirmation
                await SendEmailConfirmationAsync(user);

                return Ok(new
                {
                    message = $"Registration successful as {roleToAssign}. Please check your email to confirm your account.",
                    userId = user.Id,
                    email = user.Email,
                    profilePicture = user.ProfilePicture,
                    roles = new[] { roleToAssign },
                    confirmed = false
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Registration error: {ex.Message} {(ex.InnerException != null ? " | " + ex.InnerException.Message : "")}");
            }
        }
    
        // New method to send email confirmation
        private async Task SendEmailConfirmationAsync(ApplicationUser user)
        {
            try
            {
                // Generate email confirmation token
                var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                
                // Encode the token for URL safety - use Base64 encoding for better reliability
                var tokenBytes = System.Text.Encoding.UTF8.GetBytes(token);
                var encodedToken = Convert.ToBase64String(tokenBytes);
                
                // Build confirmation link - direct to backend API
                var confirmationLink = $"{Request.Scheme}://{Request.Host}/api/Account/ConfirmEmail?userId={user.Id}&token={encodedToken}&encoding=base64";
                
                _logger.LogInformation($"Generated confirmation link for user {user.Email}: {confirmationLink}");
                
                string subject = "Confirm Your Email - Doctor Appointment System";
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
                            .button {{
                                display: inline-block;
                                background-color: #4F46E5;
                                color: white;
                                text-decoration: none;
                                padding: 10px 20px;
                                border-radius: 5px;
                                margin: 20px 0;
                            }}
                            .note {{
                                font-size: 0.9em;
                                color: #666;
                                margin-top: 10px;
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
                                <h2>Email Confirmation</h2>
                                </div>
                                <div class='content'>
                                <p>Dear {user.FirstName} {user.LastName},</p>
                                <p>Thank you for registering with our Doctor Appointment System. To complete your registration, please confirm your email address by clicking the button below:</p>
                                <p style='text-align: center;'>
                                    <a href='{confirmationLink}' class='button' style='color: white;'>Confirm Email</a>
                                </p>
                                <p class='note'>If you did not create an account with us, please disregard this email.</p>
                                <p class='note'>If the button doesn't work, copy and paste the following link into your browser:</p>
                                <p class='note'>{confirmationLink}</p>
                                </div>
                                <div class='footer'>
                                    <p>This is an automated message. Please do not reply to this email.</p>
                                </div>
                            </div>
                        </body>
                        </html>";

                    await _emailService.SendEmailAsync(user.Email, subject, message);
                _logger.LogInformation($"Email confirmation sent to {user.Email}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email confirmation to {user.Email}");
                // We don't throw here as we still want the registration to succeed
                // even if sending the confirmation email fails
            }
        }

        // Endpoint to confirm email
        [HttpGet("ConfirmEmail")]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> ConfirmEmail([FromQuery] string userId, [FromQuery] string token, [FromQuery] string encoding = null)
        {
            _logger.LogInformation($"Email confirmation request received for userId: {userId}");
            _logger.LogInformation($"Token received: {token}");
            _logger.LogInformation($"Encoding: {encoding ?? "none"}");
            
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("Email confirmation failed: User ID or token is missing");
                string redirectUrl = $"{_config["ClientApp:BaseUrl"]}/email-confirmed?success=false&error=missing";
                return Redirect(redirectUrl);
            }

            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning($"Email confirmation failed: User not found with ID {userId}");
                    string redirectUrl = $"{_config["ClientApp:BaseUrl"]}/email-confirmed?success=false&error=notfound";
                    return Redirect(redirectUrl);
                }

                // If the email is already confirmed, we can just return success
                if (user.EmailConfirmed)
                {
                    _logger.LogInformation($"Email for user {userId} was already confirmed");
                    string redirectUrl = $"{_config["ClientApp:BaseUrl"]}/email-confirmed?success=true&alreadyConfirmed=true";
                    return Redirect(redirectUrl);
                }

                // Decode the token based on encoding
                string decodedToken = token;
                
                try 
                {
                    if (encoding == "base64")
                    {
                        // Decode from Base64
                        var tokenBytes = Convert.FromBase64String(token);
                        decodedToken = System.Text.Encoding.UTF8.GetString(tokenBytes);
                        _logger.LogInformation($"Decoded Base64 token: {decodedToken}");
                    }
                    else
                    {
                        // Try URL decoding
                        decodedToken = HttpUtility.UrlDecode(token);
                        _logger.LogInformation($"URL decoded token: {decodedToken}");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error decoding token, using original token");
                }

                // Confirm the email
                _logger.LogInformation($"Attempting to confirm email with token for user {userId}");
                var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
                
                if (result.Succeeded)
                {
                    _logger.LogInformation($"Email confirmed successfully for user {userId}");
                    
                    // Update user record
                    user.EmailConfirmed = true;
                    await _userManager.UpdateAsync(user);
                    
                    string successRedirectUrl = $"{_config["ClientApp:BaseUrl"]}/email-confirmed?success=true";
                    return Redirect(successRedirectUrl);
                }
                else
                {
                    string errors = string.Join(", ", result.Errors.Select(e => e.Description));
                    _logger.LogWarning($"Failed to confirm email for user {userId}: {errors}");
                    
                    // Try again with the original token
                    if (decodedToken != token)
                    {
                        _logger.LogInformation("Trying again with original token");
                        result = await _userManager.ConfirmEmailAsync(user, token);
                        
                        if (result.Succeeded)
                        {
                            _logger.LogInformation($"Email confirmed successfully with original token for user {userId}");
                            
                            // Update user record
                            user.EmailConfirmed = true;
                            await _userManager.UpdateAsync(user);
                            
                            string successRedirectUrl = $"{_config["ClientApp:BaseUrl"]}/email-confirmed?success=true";
                            return Redirect(successRedirectUrl);
                        }
                    }
                    
                    string redirectUrl = $"{_config["ClientApp:BaseUrl"]}/email-confirmed?success=false&error=invalid";
                    return Redirect(redirectUrl);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error confirming email for user {userId}");
                string redirectUrl = $"{_config["ClientApp:BaseUrl"]}/email-confirmed?success=false&error=exception";
                return Redirect(redirectUrl);
            }
        }

        // Check email confirmation status
        [HttpGet("CheckEmailConfirmation/{userId}")]
        public async Task<IActionResult> CheckEmailConfirmation(string userId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound("User not found");
                }

                return Ok(new { confirmed = user.EmailConfirmed });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking email confirmation for user {userId}");
                return StatusCode(500, "An error occurred while checking email confirmation status.");
            }
        }

        // Resend email confirmation
        [HttpPost("ResendEmailConfirmation")]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> ResendEmailConfirmation([FromBody] ResendConfirmationDto model)
        {
            if (string.IsNullOrEmpty(model.Email))
            {
                return BadRequest(new { error = "Email is required" });
            }

            try
            {
                var user = await _userManager.FindByEmailAsync(model.Email);
                if (user == null)
                {
                    // Don't reveal that the user doesn't exist
                    return Ok(new { message = "If your email is registered, a confirmation link has been sent." });
                }

                if (user.EmailConfirmed)
                {
                    return BadRequest(new { error = "Email is already confirmed. You can login now." });
                }

                // Send confirmation email
                await SendEmailConfirmationAsync(user);
                
                return Ok(new { message = "A new confirmation email has been sent. Please check your inbox." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error resending confirmation email to {model.Email}");
                return StatusCode(500, new { error = "An error occurred while sending the confirmation email." });
            }
        }

     [HttpPost("login")]
        public async Task<IActionResult> Login(LoginUserDto loginUser)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check if the user exists
            var user = await _userManager.FindByEmailAsync(loginUser.Email);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password. If you don't have an account, please register." });
            }

            // Check if the user has requested deletion
            if (user.DeletionRequestedAt.HasValue)
            {
                return Unauthorized(new { 
                    message = "This account has been marked for deletion and cannot be used. If you need to access our services, please register a new account.",
                    accountDeleted = true 
                });
            }

            // Verify the password
            var isPasswordValid = await _userManager.CheckPasswordAsync(user, loginUser.Password);
            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            // Check if email is confirmed
            if (!user.EmailConfirmed)
            {
                return BadRequest(new { 
                    message = "Please confirm your email before logging in.",
                    requiresEmailConfirmation = true,
                    userId = user.Id,
                    email = user.Email
                });
            }

            // Create JWT token
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            // Add roles to claims
            var roles = await _userManager.GetRolesAsync(user);
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            // Create security key and signing credentials
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JWT:Secret"]));
            var signingCredentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            // Create JWT token
            var token = new JwtSecurityToken(
                issuer: _config["JWT:ValidIssuer"],
                audience: _config["JWT:ValidAudience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: signingCredentials
            );

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                expiration = token.ValidTo
            });
        }

        [HttpPost("forgot-password")]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> InitiateForgotPassword([FromBody] ForgotPasswordDto model)
        {
            if (string.IsNullOrEmpty(model.Email))
            {
                return BadRequest(new { message = "Email is required" });
            }

            try
            {
                var user = await _userManager.FindByEmailAsync(model.Email);
                if (user == null)
                {
                    // Don't reveal that the user does not exist
                    return Ok(new { message = "If your email is registered, you will receive a password reset link." });
                }

                // Generate password reset token
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                
                // Encode token for URL safety
                var tokenBytes = System.Text.Encoding.UTF8.GetBytes(token);
                var encodedToken = Convert.ToBase64String(tokenBytes);
                
                // Build password reset link - direct to frontend
                var resetLink = $"{_config["ClientApp:BaseUrl"]}/reset-password?userId={user.Id}&token={HttpUtility.UrlEncode(encodedToken)}&encoding=base64";
                
                _logger.LogInformation($"Generated password reset link for user {user.Email}: {resetLink}");
                
                // Send email with reset link
                string subject = "Reset Your Password - Doctor Appointment System";
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
                        .button {{
                            display: inline-block;
                            background-color: #4F46E5;
                            color: white;
                            text-decoration: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            margin: 20px 0;
                        }}
                        .note {{
                            font-size: 0.9em;
                            color: #666;
                            margin-top: 10px;
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
                            <h2>Password Reset Request</h2>
                            </div>
                            <div class='content'>
                            <p>Dear {user.FirstName} {user.LastName},</p>
                            <p>We received a request to reset your password for your Doctor Appointment System account. To reset your password, please click the button below:</p>
                            <p style='text-align: center;'>
                                <a href='{resetLink}' class='button' style='color: white;'>Reset Password</a>
                            </p>
                            <p class='note'>This link will expire in 24 hours.</p>
                            <p class='note'>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                            <p class='note'>If the button doesn't work, copy and paste the following link into your browser:</p>
                            <p class='note'>{resetLink}</p>
                            </div>
                            <div class='footer'>
                                <p>This is an automated message. Please do not reply to this email.</p>
                            </div>
                        </div>
                    </body>
                    </html>";
                
                await _emailService.SendEmailAsync(user.Email, subject, message);
                _logger.LogInformation($"Password reset email sent to {user.Email}");
                
                return Ok(new { message = "If your email is registered, you will receive a password reset link." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error initiating password reset for {model.Email}");
                // Don't reveal detailed errors to the client
                return StatusCode(500, new { message = "An error occurred while processing your request. Please try again later." });
            }
        }
        
        [HttpPost("reset-password")]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            if (string.IsNullOrEmpty(model.UserId) || string.IsNullOrEmpty(model.Token) || string.IsNullOrEmpty(model.NewPassword))
            {
                return BadRequest(new { message = "User ID, token, and new password are required" });
            }
            
            if (model.NewPassword != model.ConfirmPassword)
            {
                return BadRequest(new { message = "Passwords do not match" });
            }
            
            try
            {
                var user = await _userManager.FindByIdAsync(model.UserId);
                if (user == null)
                {
                    // Don't reveal that the user doesn't exist
                    return BadRequest(new { message = "Invalid request" });
                }
                
                // Decode token if it's base64 encoded
                string token = model.Token;
                if (model.Encoding == "base64")
                {
                    try
                    {
                        var tokenBytes = Convert.FromBase64String(model.Token);
                        token = System.Text.Encoding.UTF8.GetString(tokenBytes);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error decoding token, using original token");
                        // Continue with the original token
                    }
                }
                
                var result = await _userManager.ResetPasswordAsync(user, token, model.NewPassword);
                if (result.Succeeded)
                {
                    _logger.LogInformation($"Password successfully reset for user {user.Email}");
                    return Ok(new { message = "Your password has been successfully reset. You can now log in with your new password." });
                }
                else
                {
                    string errors = string.Join(", ", result.Errors.Select(e => e.Description));
                    _logger.LogWarning($"Failed to reset password for user {user.Email}: {errors}");
                    return BadRequest(new { message = "Unable to reset password. The link may have expired or is invalid." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password");
                return StatusCode(500, new { message = "An error occurred while resetting your password. Please try again later." });
            }
        }

        [HttpPost("gdpr/data-export")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> RequestDataExport([FromBody] GdprRequestDto model)
        {
            if (model == null || string.IsNullOrEmpty(model.UserId))
            {
                return BadRequest(new { message = "User ID is required" });
            }

            try
            {
                // Get the current user ID from token
                var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return Unauthorized(new { message = "Authentication required" });
                }

                // Validate that the request is for the current user
                if (model.UserId != currentUserId)
                {
                    return Forbid();
                }

                var user = await _userManager.FindByIdAsync(currentUserId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Create a request ID for tracking
                var requestId = Guid.NewGuid().ToString();
                _logger.LogInformation($"Data export request received for user {model.UserId} (Request ID: {requestId})");

                // Generate and send the export immediately
                var userData = await GenerateUserDataExport(user);

                // Send email with the data export
                string subject = "Your Data Export - Doctor Appointment System";
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
                        .data-section {{
                            background-color: #ffffff;
                            border: 1px solid #eee;
                            padding: 15px;
                            margin-bottom: 15px;
                            border-radius: 4px;
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
                            <h2>Your Data Export</h2>
                            </div>
                            <div class='content'>
                            <p>Dear {user.FirstName} {user.LastName},</p>
                            <p>Please find below the data we currently have stored for your account:</p>
                            
                            <div class='data-section'>
                                <h3>Account Information</h3>
                                <p><strong>User ID:</strong> {userData.UserId}</p>
                                <p><strong>Email:</strong> {userData.Email}</p>
                                <p><strong>Name:</strong> {userData.FirstName} {userData.LastName}</p>
                                <p><strong>Phone:</strong> {userData.PhoneNumber}</p>
                                <p><strong>Address:</strong> {userData.Address}</p>
                                <p><strong>Gender:</strong> {userData.Gender}</p>
                                <p><strong>Date of Birth:</strong> {userData.DateOfBirth?.ToString("yyyy-MM-dd") ?? "Not provided"}</p>
                                <p><strong>Account Created:</strong> {user.CreatedAt.ToString("yyyy-MM-dd")}</p>
                            </div>
                            
                            {userData.AppointmentsHtml}
                            
                            <p>If you have any questions about your data or would like to request changes, 
                            please contact our support team.</p>
                            </div>
                            <div class='footer'>
                                <p>This export was generated on {DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")} UTC</p>
                                <p>This is an automated message. Please do not reply to this email.</p>
                            </div>
                        </div>
                    </body>
                    </html>";

                await _emailService.SendEmailAsync(user.Email, subject, message);
                _logger.LogInformation($"Data export email sent to {user.Email} (Request ID: {requestId})");

                return Ok(new { message = "Data export request processed successfully. You will receive an email with your data.", requestId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing data export request");
                return StatusCode(500, new { message = "An error occurred while processing your request." });
            }
        }

        private async Task<UserDataExportDto> GenerateUserDataExport(ApplicationUser user)
        {
            var userData = new UserDataExportDto
            {
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                PhoneNumber = user.PhoneNumber,
                Address = user.Address,
                Gender = user.Gender,
                DateOfBirth = user.DateOfBirth
            };

            // Get role-specific data
            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Contains("Patient"))
            {
                var patient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.ApplicationUserId == user.Id);

                if (patient != null)
                {
                    // Get patient appointments
                    var appointments = await _context.Appointments
                        .Include(a => a.Doctor)
                        .Where(a => a.PatientID == patient.Id)
                        .ToListAsync();

                    if (appointments.Any())
                    {
                        var appointmentsHtml = new StringBuilder();
                        appointmentsHtml.Append("<div class='data-section'>");
                        appointmentsHtml.Append("<h3>Your Appointments</h3>");
                        
                        foreach (var appointment in appointments)
                        {
                            var doctorName = $"Dr. {appointment.Doctor?.FirstName} {appointment.Doctor?.LastName}";
                            appointmentsHtml.Append($"<div style='border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;'>");
                            appointmentsHtml.Append($"<p><strong>Date:</strong> {appointment.AppointmentDate.ToString("yyyy-MM-dd")}</p>");
                            appointmentsHtml.Append($"<p><strong>Time:</strong> {appointment.StartTime}</p>");
                            appointmentsHtml.Append($"<p><strong>Doctor:</strong> {doctorName}</p>");
                            appointmentsHtml.Append($"<p><strong>Status:</strong> {appointment.Status}</p>");
                            appointmentsHtml.Append($"</div>");
                        }
                        
                        appointmentsHtml.Append("</div>");
                        userData.AppointmentsHtml = appointmentsHtml.ToString();
                    }
                    else
                    {
                        userData.AppointmentsHtml = "<div class='data-section'><h3>Your Appointments</h3><p>You don't have any appointments.</p></div>";
                    }
                }
            }
            else if (roles.Contains("Doctor"))
            {
                var doctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.ApplicationUserId == user.Id);

                if (doctor != null)
                {
                    // Get doctor appointments
                    var appointments = await _context.Appointments
                        .Include(a => a.Patient)
                        .Where(a => a.DoctorID == doctor.Id)
                        .ToListAsync();

                    if (appointments.Any())
                    {
                        var appointmentsHtml = new StringBuilder();
                        appointmentsHtml.Append("<div class='data-section'>");
                        appointmentsHtml.Append("<h3>Your Appointments</h3>");
                        
                        foreach (var appointment in appointments)
                        {
                            var patientName = $"{appointment.Patient?.FirstName} {appointment.Patient?.LastName}";
                            appointmentsHtml.Append($"<div style='border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;'>");
                            appointmentsHtml.Append($"<p><strong>Date:</strong> {appointment.AppointmentDate.ToString("yyyy-MM-dd")}</p>");
                            appointmentsHtml.Append($"<p><strong>Time:</strong> {appointment.StartTime}</p>");
                            appointmentsHtml.Append($"<p><strong>Patient:</strong> {patientName}</p>");
                            appointmentsHtml.Append($"<p><strong>Status:</strong> {appointment.Status}</p>");
                            appointmentsHtml.Append($"</div>");
                        }
                        
                        appointmentsHtml.Append("</div>");
                        userData.AppointmentsHtml = appointmentsHtml.ToString();
                    }
                    else
                    {
                        userData.AppointmentsHtml = "<div class='data-section'><h3>Your Appointments</h3><p>You don't have any appointments.</p></div>";
                    }
                }
            }

            return userData;
        }

        [HttpPost("gdpr/data-removal")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> RequestDataRemoval([FromBody] GdprRequestDto model)
        {
            _logger.LogInformation("GDPR data removal request received");
            _logger.LogInformation($"Request body: {JsonSerializer.Serialize(model)}");
            
            if (model == null)
            {
                _logger.LogWarning("GDPR data removal request rejected: Model is null");
                return BadRequest(new { message = "Request data is required" });
            }
            
            if (string.IsNullOrEmpty(model.UserId))
            {
                _logger.LogWarning("GDPR data removal request rejected: User ID is missing");
                return BadRequest(new { message = "User ID is required" });
            }

            try
            {
                // Get the current user ID from token
                var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                _logger.LogInformation($"GDPR data removal: Token user ID: {currentUserId}, Requested user ID: {model.UserId}");
                
                // Log all claims for debugging
                _logger.LogInformation("All claims in token:");
                foreach (var claim in User.Claims)
                {
                    _logger.LogInformation($"Claim: {claim.Type} = {claim.Value}");
                }
                
                if (string.IsNullOrEmpty(currentUserId))
                {
                    _logger.LogWarning("GDPR data removal request rejected: No user ID in token");
                    return Unauthorized(new { message = "Authentication required" });
                }

                // Validate that the request is for the current user
                if (model.UserId != currentUserId)
                {
                    _logger.LogWarning($"GDPR data removal request rejected: User ID mismatch. Token: {currentUserId}, Request: {model.UserId}");
                    return Forbid();
                }

                var user = await _userManager.FindByIdAsync(currentUserId);
                if (user == null)
                {
                    _logger.LogWarning($"GDPR data removal request rejected: User not found with ID {currentUserId}");
                    return NotFound(new { message = "User not found" });
                }

                _logger.LogInformation($"User found: {user.Email}, ID: {user.Id}");

                // Create a request ID for tracking
                var requestId = Guid.NewGuid().ToString();
                _logger.LogInformation($"Data removal request received for user {model.UserId} (Request ID: {requestId})");

                // Immediately process the deletion
                try 
                {
                    _logger.LogInformation($"Attempting immediate deletion for user {currentUserId}");
                    await RemoveUserData(user);
                    
                    _logger.LogInformation($"Immediate deletion successful for user {currentUserId}");
                    return Ok(new { message = "Your account has been deleted successfully." });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error deleting user account immediately for user {currentUserId}");
                    
                    // Fall back to marking the user for deletion if immediate deletion fails
                    _logger.LogInformation($"Falling back to scheduled deletion for user {currentUserId}");
                    user.DeletionRequestedAt = DateTime.UtcNow;
                    await _userManager.UpdateAsync(user);

                    // Send confirmation email
                    string subject = "Data Removal Request Confirmation - Doctor Appointment System";
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
                                <h2>Data Removal Request Received</h2>
                                </div>
                                <div class='content'>
                                <p>Dear {user.FirstName} {user.LastName},</p>
                                <p>We have received your request to remove your account and personal data from our system.</p>
                                <p>Your request will be processed within the next 30 days, as required by GDPR guidelines.</p>
                                <p>Request details:</p>
                                <ul>
                                    <li><strong>Request ID:</strong> {requestId}</li>
                                    <li><strong>Request Date:</strong> {DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")} UTC</li>
                                    <li><strong>User ID:</strong> {user.Id}</li>
                                    <li><strong>Email:</strong> {user.Email}</li>
                                </ul>
                                <p>Once your data has been removed, you will receive a confirmation email.</p>
                                <p>If you did not request this action or have changed your mind, please contact our support team immediately.</p>
                                </div>
                                <div class='footer'>
                                    <p>This is an automated message. Please do not reply to this email.</p>
                                </div>
                            </div>
                        </body>
                        </html>";

                    await _emailService.SendEmailAsync(user.Email, subject, message);
                    _logger.LogInformation($"Data removal confirmation email sent to {user.Email} (Request ID: {requestId})");

                    return Ok(new { message = "Data removal request submitted successfully. You will receive a confirmation email.", requestId });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing data removal request");
                return StatusCode(500, new { message = "An error occurred while processing your request." });
            }
        }

        [HttpGet("gdpr/data-removal/{requestId}")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> GetDataRemovalStatus(string requestId)
        {
            try
            {
                // Get the current user ID from token
                var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return Unauthorized(new { message = "Authentication required" });
                }

                var user = await _userManager.FindByIdAsync(currentUserId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // In a real system, you would look up the request by ID in a database
                // For now, we'll just check if the user has a deletion request timestamp
                if (user.DeletionRequestedAt.HasValue)
                {
                    return Ok(new { 
                        status = "pending",
                        message = "Your data removal request is being processed.",
                        requestedAt = user.DeletionRequestedAt.Value.ToString("yyyy-MM-dd HH:mm:ss")
                    });
                }
                else
                {
                    return NotFound(new { message = "No active data removal request found." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking data removal status");
                return StatusCode(500, new { message = "An error occurred while checking your request status." });
            }
        }

        [HttpDelete("gdpr/data-removal/{requestId}")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> CancelDataRemovalRequest(string requestId)
        {
            try
            {
                // Get the current user ID from token
                var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return Unauthorized(new { message = "Authentication required" });
                }

                var user = await _userManager.FindByIdAsync(currentUserId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Cancel the deletion request
                if (user.DeletionRequestedAt.HasValue)
                {
                    user.DeletionRequestedAt = null;
                    await _userManager.UpdateAsync(user);
                    
                    _logger.LogInformation($"Data removal request canceled for user {currentUserId}");
                    return Ok(new { message = "Data removal request has been canceled successfully." });
                }
                else
                {
                    return NotFound(new { message = "No active data removal request found." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling data removal request");
                return StatusCode(500, new { message = "An error occurred while canceling your request." });
            }
        }

        [HttpPost("gdpr/force-removal")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        [EnableCors("AllowReactApp")]
        public async Task<IActionResult> ForceDataRemoval([FromBody] GdprForceRemovalDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Only admins should be able to force-remove data
                if (!User.IsInRole("Admin"))
                {
                    return Forbid();
                }

                var user = await _userManager.FindByIdAsync(model.UserId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Perform immediate data removal
                await RemoveUserData(user);

                _logger.LogInformation($"Force data removal completed for user {model.UserId} by admin {User.FindFirstValue(ClaimTypes.NameIdentifier)}");
                return Ok(new { message = "Data removal completed successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing force data removal request");
                return StatusCode(500, new { message = "An error occurred while processing your request." });
            }
        }

        private async Task RemoveUserData(ApplicationUser user)
        {
            // In a real system, you would implement a thorough data removal process
            // This is a simplified implementation
            
            // Get user roles to determine which related data to remove
            var roles = await _userManager.GetRolesAsync(user);
            
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Handle patient data removal
                if (roles.Contains("Patient"))
                {
                    var patient = await _context.Patients
                        .FirstOrDefaultAsync(p => p.ApplicationUserId == user.Id);
                    
                    if (patient != null)
                    {
                        // Remove appointments
                        var appointments = await _context.Appointments
                            .Where(a => a.PatientID == patient.Id)
                            .ToListAsync();
                        
                        _context.Appointments.RemoveRange(appointments);
                        
                        // Remove ratings if any
                        var ratings = await _context.Ratings
                            .Where(r => r.PatientId == patient.Id)
                            .ToListAsync();
                        
                        _context.Ratings.RemoveRange(ratings);
                        
                        // Remove patient record
                        _context.Patients.Remove(patient);
                    }
                }
                // Handle doctor data removal
                else if (roles.Contains("Doctor"))
                {
                    var doctor = await _context.Doctors
                        .FirstOrDefaultAsync(d => d.ApplicationUserId == user.Id);
                    
                    if (doctor != null)
                    {
                        // Remove appointments
                        var appointments = await _context.Appointments
                            .Where(a => a.DoctorID == doctor.Id)
                            .ToListAsync();
                        
                        _context.Appointments.RemoveRange(appointments);
                        
                        // Remove availability
                        var availabilities = await _context.DoctorAvailabilities
                            .Where(a => a.DoctorID == doctor.Id)
                            .ToListAsync();
                        
                        _context.DoctorAvailabilities.RemoveRange(availabilities);
                        
                        // Remove doctor record
                        _context.Doctors.Remove(doctor);
                    }
                }
                
                // Remove chat messages
                var messages = await _context.ChatMessages
                    .Where(m => (m.DoctorSenderId != null && m.DoctorSender.ApplicationUserId == user.Id) ||
                               (m.PatientSenderId != null && m.PatientSender.ApplicationUserId == user.Id) ||
                               (m.DoctorReceiverId != null && m.DoctorReceiver.ApplicationUserId == user.Id) ||
                               (m.PatientReceiverId != null && m.PatientReceiver.ApplicationUserId == user.Id))
                    .ToListAsync();
                
                _context.ChatMessages.RemoveRange(messages);
                
                // Remove notifications
                var notifications = await _context.Notifications
                    .Where(n => n.UserAccountId.ToString() == user.Id)
                    .ToListAsync();
                
                _context.Notifications.RemoveRange(notifications);
                
                await _context.SaveChangesAsync();
                
                // Remove profile picture file if it exists
                if (!string.IsNullOrEmpty(user.ProfilePicture))
                {
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", user.ProfilePicture.TrimStart('/'));
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
                await _userManager.DeleteAsync(user);
                
                await transaction.CommitAsync();
                
                // Send confirmation email
                string subject = "Account Deletion Confirmation - Doctor Appointment System";
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
                
                await _emailService.SendEmailAsync(user.Email, subject, message);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, $"Error removing data for user {user.Id}");
                throw;
            }
        }

    // DTOs for GDPR functionality
    public class GdprRequestDto
    {
        public string UserId { get; set; }
        public string UserEmail { get; set; }
        public string Reason { get; set; }
        public bool RemovalFlag { get; set; }
    }

    public class GdprForceRemovalDto
    {
        public string UserId { get; set; }
        public string UserEmail { get; set; }
        public bool AdminConfirmation { get; set; }
        public string RemovalReason { get; set; }
    }

    public class UserDataExportDto
    {
        public string UserId { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string AppointmentsHtml { get; set; }
    }
}
}
