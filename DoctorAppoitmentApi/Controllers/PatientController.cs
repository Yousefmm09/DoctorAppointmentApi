using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PatientController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PatientController> _logger;
        public PatientController(AppDbContext context)
        {
            _context = context;
        }
        [HttpGet]
        public IActionResult GetAllPatients()
        {
            var patients = _context.Patients.ToList();
            return Ok(patients);
        }
        [HttpGet("{id}")]
        public IActionResult GetPatientById(int id)
        {
            var patient = _context.Patients.Find(id);
            if (patient == null)
            {
                return NotFound();
            }
            return Ok(patient);
        }
        [HttpPost]
        public IActionResult CreatePatient([FromBody] Patient patient)
        {
            if (patient == null)
            {
                return BadRequest();
            }
            _context.Patients.Add(patient);
            _context.SaveChanges();
            return CreatedAtAction(nameof(GetPatientById), new { id = patient.Id }, patient);
        }
        [HttpPut("{id}")]
        [Consumes("multipart/form-data")]
        public IActionResult UpdatePatient(int id, [FromBody] Patient patient)
        {
            if (id != patient.Id)
            {
                return BadRequest();
            }
            var existingPatient = _context.Patients.Find(id);
            if (existingPatient == null)
            {
                return NotFound();
            }
            existingPatient.FirstName = patient.FirstName;
            existingPatient.Email = patient.Email;
            existingPatient.PhoneNumber = patient.PhoneNumber;
            existingPatient.Address = patient.Address;
            existingPatient.City = patient.City;
            existingPatient.Address = patient.Address;
            existingPatient.ZipCode = patient.ZipCode;
            existingPatient.DateOfBirth = patient.DateOfBirth;
            _context.SaveChanges();
            return NoContent();
        }
        //patient Appointment
        [HttpGet("appointments/{id:int}")]
        public IActionResult PatientAppoient(int id)
        {
            var appointments = _context.Appointments
                .Where(a => a.PatientID == id)
                .Include(d => d.Doctor)
                .Select(a => new
                {
                    a.Id,
                    a.StartTime,
                    a.EndTime,
                    a.IsConfirmed,
                    DoctorName = _context.Doctors.FirstOrDefault(d => d.Id == a.DoctorID).FirstName + " " + _context.Doctors.FirstOrDefault(d => d.Id == a.DoctorID).LastName
                })
                .ToList();
            return Ok(appointments);
        }
        //patient Profile 
        [HttpGet("profile/{id:int}")]
        public async Task<IActionResult> Profile(int id)
        {
            var patient = await _context.Patients
                .Include(p => p.ApplicationUser)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (patient == null)
            {
                return NotFound("Patient not found");
            }

            var patientProfile = new PatientProfileDto
            {
                FirstName = patient.FirstName,
                LastName = patient.LastName,
                Email = patient.Email,
                PhoneNumber = patient.PhoneNumber,
                ProfilePicture = patient.ProfilePicture,
                Address = patient.Address,
                Gender = patient.Gender,
                DateOfBirth = patient.DateOfBirth,
                City = patient.City,
                ZipCode = patient.ZipCode,
            };

            return Ok(patientProfile);
        }

        // Add method to update profile with profile picture
        [HttpPut("update-profile/{id:int}")]
        public async Task<IActionResult> UpdateProfile(int id, [FromForm] PatientProfileDto profileDto)
        {
            var patient = await _context.Patients
                .Include(p => p.ApplicationUser)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (patient == null)
            {
                return NotFound("Patient not found");
            }

            // Handle profile picture upload
            if (profileDto.ProfilePictureFile != null)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "patients");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var uniqueFileName = $"{Guid.NewGuid()}_{profileDto.ProfilePictureFile.FileName}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await profileDto.ProfilePictureFile.CopyToAsync(fileStream);
                }

                patient.ProfilePicture = $"/uploads/patients/{uniqueFileName}";
            }
            else if (!string.IsNullOrEmpty(profileDto.ProfilePicture))
            {
                patient.ProfilePicture = profileDto.ProfilePicture;
            }

            // Update other properties
            patient.FirstName = profileDto.FirstName;
            patient.LastName = profileDto.LastName;
            patient.Email = profileDto.Email;
            patient.PhoneNumber = profileDto.PhoneNumber;
            patient.Address = profileDto.Address;
            patient.Gender = profileDto.Gender;
            patient.DateOfBirth = profileDto.DateOfBirth ?? DateTime.UtcNow;
            patient.City = profileDto.City;
            patient.ZipCode = profileDto.ZipCode;

            // Update related ApplicationUser
            if (patient.ApplicationUser != null)
            {
                patient.ApplicationUser.FirstName = profileDto.FirstName;
                patient.ApplicationUser.LastName = profileDto.LastName;
                patient.ApplicationUser.Email = profileDto.Email;
                patient.ApplicationUser.PhoneNumber = profileDto.PhoneNumber;
                patient.ApplicationUser.Address = profileDto.Address;
                patient.ApplicationUser.Gender = profileDto.Gender;
                patient.ApplicationUser.DateOfBirth = profileDto.DateOfBirth ?? DateTime.UtcNow;
            }

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Profile updated successfully", patient });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while updating the profile: {ex.Message}");
            }
        }


        // Add method to get profile picture
        [HttpGet("profile-picture/{id:int}")]
        public async Task<IActionResult> GetProfilePicture(int id)
        {
            var patient = await _context.Patients.FindAsync(id);
            if (patient == null)
            {
                return NotFound("Patient not found");
            }

            if (string.IsNullOrEmpty(patient.ProfilePicture))
            {
                return NotFound("No profile picture found");
            }

            var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", patient.ProfilePicture.TrimStart('/'));
            if (!System.IO.File.Exists(imagePath))
            {
                return NotFound("Profile picture file not found");
            }

            var imageFileStream = System.IO.File.OpenRead(imagePath);
            return File(imageFileStream, "image/jpeg"); // Adjust content type if needed
        }
        //forget password
        //[HttpPost("forget-password")]
        //public async Task<IActionResult> ForgetPassword([FromBody] ForgetPasswordDto forgetPasswordDto)
        //{
        //    var user = await _context.UserAccounts.FirstOrDefaultAsync(u => u.Email == forgetPasswordDto.Email);
        //    if (user == null)
        //    {
        //        return NotFound("User not found");
        //    }
        //    // Generate password reset token
        //    var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        //    // Send email with the token (implement your email sending logic here)
        //    // ...
        //    return Ok(new { message = "Password reset token sent to email" });
        //}
        [HttpGet("by-user-id/{userId}")]
        public async Task<IActionResult> GetPatientByUserId(string userId)
        {
            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.ApplicationUserId == userId);

            if (patient == null)
            {
                return NotFound(new { message = "Patient not found for this user ID" });
            }

            return Ok(new { id = patient.Id });
        }
        [HttpGet("Cancel_Appointment/{id:int}")]
        public async Task<IActionResult> CancelAppointment(int id)
        {
            var appointment = _context.Appointments.FirstOrDefault(x => x.Id == id);
            if (appointment == null)
            {
                try
                {
                    appointment.Status = "Cancelled";
                    appointment.IsConfirmed = false;
                    await _context.SaveChangesAsync();
                    return Ok(MapToResponseDto(appointment));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error cancelling appointment.");
                    return StatusCode(500, "An error occurred while cancelling the appointment.");
                }
            }
            return NotFound("Appointment not found");

        }
        [HttpPost("confirm/{id}")]
        public async Task<IActionResult> ConfirmAppointmentAsync(int id)
        {
            var appointment = await _context.Appointments.Include(a => a.Patient).FirstOrDefaultAsync(a => a.Id == id);
            if (appointment == null)
                return NotFound("Appointment not found.");

            try
            {
                appointment.IsConfirmed = true;
                appointment.Status = "Confirmed";

                await _context.SaveChangesAsync();
                return Ok(MapToResponseDto(appointment));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming appointment.");
                return StatusCode(500, "An error occurred while confirming the appointment.");
            }
        }
        private AppointmentResponseDto MapToResponseDto(Appointment appointment)
        {
            if (appointment == null) return null;

            return new AppointmentResponseDto
            {
                Id = appointment.Id,
                PatientName = $"{appointment.Patient?.FirstName ?? ""} {appointment.Patient?.LastName ?? ""}".Trim(),
                DoctorName = $"{appointment.Doctor?.FirstName ?? ""} {appointment.Doctor?.LastName ?? ""}".Trim(),
                Specialization = appointment.Doctor?.Specialization?.Name ?? "Unknown",
                AppointmentDate = appointment.AppointmentDate,
                StartTime = appointment.StartTime,
                EndTime = appointment.EndTime,
                Status = appointment.Status ?? "Pending", // ممكن تحط Default Status لو عايز
                IsConfirmed = appointment.IsConfirmed,
                AppointmentFee = appointment.AppointmentFee ?? "0",
                Reason = appointment.Reason ?? "",
                Notes = appointment.Notes ?? ""
            };
        }
    }
}

