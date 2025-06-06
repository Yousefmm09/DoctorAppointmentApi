using DoctorAppoitmentApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _config;

        public AccountController(UserManager<ApplicationUser> userManager, IConfiguration config, AppDbContext context)
        {
            _userManager = userManager;
            _config = config;
            _context = context;
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
                    DateOfBirth = userRegistration.DateOfBirth
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

                return Ok(new
                {
                    message = $"Registration successful as {roleToAssign}",
                    userId = user.Id,
                    email = user.Email,
                    profilePicture = user.ProfilePicture,
                    roles = new[] { roleToAssign }
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

                return Ok(new
                {
                    message = $"Registration successful as {roleToAssign}",
                    userId = user.Id,
                    email = user.Email,
                    profilePicture = user.ProfilePicture,
                    roles = new[] { roleToAssign }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Registration error: {ex.Message} {(ex.InnerException != null ? " | " + ex.InnerException.Message : "")}");
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
                return Unauthorized("Invalid email or password.");
            }

            // Verify the password
            var isPasswordValid = await _userManager.CheckPasswordAsync(user, loginUser.Password);
            if (!isPasswordValid)
            {
                return Unauthorized("Invalid email or password.");
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


    }
}
