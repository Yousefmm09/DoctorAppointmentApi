using DoctorAppoitmentApi.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Runtime.Intrinsics.Arm;
using Microsoft.Extensions.Logging;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DoctorController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DoctorController> _logger;

        public DoctorController(AppDbContext appContext, ILogger<DoctorController> logger)
        {
            _context = appContext;
            _logger = logger;
        }
        [HttpGet]
        public async Task<IActionResult> GetAllDoctors()
        {
            try
            {
                var doctors = await _context.Doctors
                    .Include(sp => sp.Specialization)
                    .Include(cl => cl.Clinic)
                    .Select(d => new
                    {
                        d.Id,
                        d.FirstName,
                        d.LastName,
                        d.SpecializationID,
                        d.ClinicID,
                        d.Address,
                        d.PhoneNumber,
                        d.ProfilePicture,
                        d.Description,
                        d.Qualification,
                        ClinicName = d.Clinic != null ? d.Clinic.Name : null,
                        SpecializationName = d.Specialization != null ? d.Specialization.Name : null,
                        d.Experience,
                        d.CurrentFee,
                        d.Email
                    })
                    .ToListAsync();

                if (!doctors.Any())
                {
                    _logger.LogWarning("No doctors found in the database");
                    return Ok(new { message = "No doctors found", data = new List<object>() });
                }

                return Ok(new { message = "Doctors retrieved successfully", data = doctors });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching doctors");
                return StatusCode(500, new { message = "An error occurred while fetching doctors", error = ex.Message });
            }
        }
        //public IActionResult AllDoctor()
        //{

        //    return Ok(doctors); 
        //}
        [HttpPost("add-doctor")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> AddDoctorAsync([FromForm] AddDoctorDto addDoctor)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Check if the email already exists
            var existingUser = await _context.UserAccounts.FirstOrDefaultAsync(u => u.Email == addDoctor.Email);
            if (existingUser != null)
                return BadRequest("Email already exists");

            string? profilePicturePath = null;

            // Handle profile picture upload
            if (addDoctor.ProfilePictureFile != null)
            {
                try
                {
                    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "doctors");

                    if (!Directory.Exists(uploadsFolder))
                        Directory.CreateDirectory(uploadsFolder);

                    var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(addDoctor.ProfilePictureFile.FileName)}";
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                    using var stream = new FileStream(filePath, FileMode.Create);
                    await addDoctor.ProfilePictureFile.CopyToAsync(stream);

                    profilePicturePath = $"/uploads/doctors/{uniqueFileName}";
                }
                catch (Exception ex)
                {
                    return StatusCode(500, $"Error uploading profile picture: {ex.Message}");
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Create user account
                var userAccount = new UserAccount
                {
                    Email = addDoctor.Email,
                    Password = addDoctor.Password,
                    PhoneNumber = addDoctor.PhoneNumber,
                    IsActive = true,
                    Role = "Doctor",
                    ProfilePicture = profilePicturePath
                };

                _context.UserAccounts.Add(userAccount);
                await _context.SaveChangesAsync();

                // Create doctor profile
                var doctor = new Doctors
                {
                    FirstName = addDoctor.FirstName,
                    LastName = addDoctor.LastName,
                    PhoneNumber = addDoctor.PhoneNumber,
                    Address = addDoctor.Address,
                    Description = addDoctor.Description,
                    Qualification = addDoctor.Qualification,
                    SpecializationID = addDoctor.SpecializationID,
                    Experience = addDoctor.Experience,
                    CurrentFee = addDoctor.CurrentFee,
                    ProfilePicture = profilePicturePath


                };

                _context.Doctors.Add(doctor);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Doctor added successfully",
                    doctor = new
                    {
                        doctor.Id,
                        doctor.FirstName,
                        doctor.LastName,
                        doctor.ProfilePicture
                    }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                // Clean up uploaded file if transaction failed
                if (!string.IsNullOrEmpty(profilePicturePath))
                {
                    var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", profilePicturePath.TrimStart('/'));
                    if (System.IO.File.Exists(fullPath))
                        System.IO.File.Delete(fullPath);
                }

                return StatusCode(500, $"An error occurred while adding the doctor: {ex.Message}");
            }
        }
        [HttpGet("{id}")]
        public IActionResult GetDoctor(int id)
        {
            var doctor = _context.Doctors
                .Include(s => s.Specialization).Include(c => c.Clinic)
                .Select(d => new
                {
                    d.Id,
                    d.FirstName,
                    d.LastName,
                    d.SpecializationID,
                    d.ClinicID,
                    d.Address,
                    d.PhoneNumber,
                    d.ProfilePicture,
                    d.Description,
                    d.Qualification,
                    ClinicName = _context.Clinics.FirstOrDefault(c => c.Id == d.ClinicID).Name,
                    SpecializationName = _context.Specializations.FirstOrDefault(s => s.Id == d.SpecializationID).Name,
                    d.Experience,
                    d.CurrentFee,
                }).FirstOrDefault(d => d.Id == id);
            if (doctor == null)
            {
                return NotFound();
            }
            return Ok(doctor);
        }
        [HttpGet("GetDoctorBySpecializationName/{name:alpha}")]
        public IActionResult GetDoctorBySpecializationName(string name)
        {
            var doctors = _context.Doctors
                .Where(d => d.Specialization != null && d.Specialization.Name == name)
                .Select(d => new GetDoctorBySpecializationName
                {
                    Id = d.Id,
                    Name = $"{d.FirstName} {d.LastName}", // Added space between first and last name
                    SpecializationName = d.Specialization.Name
                })
                .ToList();

            if (doctors == null || doctors.Count == 0)
            {
                return NotFound("No doctors found for this specialization.");
            }

            return Ok(doctors);
        }
        [HttpGet("by-user-id/{userId}")]
        public async Task <IActionResult> GetDocotrByUserId(string userId)
        {
            var doc =  await _context.Doctors.FirstOrDefaultAsync(d => d.ApplicationUserId == userId);
            if (doc == null) 
            {
                
                return NotFound(); 
            }
            if (doc == null)
            {
                return NotFound(new { message = "Patient not found for this user ID" });
            }

            return Ok(new { id = doc.Id });
        }
        //    [HttpPost("add-clinic")]
        //    public async Task<IActionResult> AddClinicAsync([FromForm] DoctorAddClinic addClinic)
        //    {
        //        if (!ModelState.IsValid)
        //        {
        //            return BadRequest(ModelState);
        //        }

        //        var clinic = new Clinics
        //        {
        //            Name = addClinic.ClinicName,
        //            PhoneNumber = addClinic.PhoneNumber,
        //            Address = addClinic.Address,
        //            Description = addClinic.Description,
        //            LicenseNumber = addClinic.LicenseNumber,
        //            OpeningTime = addClinic.OpeningTime,
        //            ClosingTime = addClinic.ClosingTime,
        //        };
        //        _context.Clinics.Add(clinic);
        //        await _context.SaveChangesAsync();
        //        return Ok(new { message = "Clinic added successfully", clinic });
        //    //}

        //}
        [HttpGet("Profile/{id:int}")]
        public async Task<IActionResult>Profile(int id)
        {
            var doctor = await _context.Doctors
                .Include(d => d.ApplicationUser)
                .Include(d => d.Clinic) // تأكد أنك عامل علاقة بين Doctor و Clinic
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }

            var doctorProfile = new DoctorProfileDto
            {
                Id = doctor.Id,
                FirstName = doctor.FirstName,
                LastName = doctor.LastName,
                Email = doctor.Email,
                PhoneNumber = doctor.PhoneNumber,
                ProfilePicture = doctor.ProfilePicture,
                Address = doctor.Address,
                DateofBitrh = doctor.DateofBitrh,
                Qualification = doctor.Qualification,
                ClinicName = doctor.Clinic?.Name,
                currentFee = doctor.CurrentFee,
                Experience = doctor.Experience,
                ClinicAddress = doctor.Clinic?.Address,
                ClinicPhoneNumber = doctor.Clinic?.PhoneNumber,
                Description = doctor.Clinic?.Description,
                LicenseNumber = doctor.Clinic?.LicenseNumber,
                OpeningTime = doctor.Clinic?.OpeningTime,
                ClosingTime = doctor.Clinic?.ClosingTime

            };

            return Ok(doctorProfile);
        }
        [HttpPut("update-doctor-profile/{id:int}")]
        public async Task<IActionResult> UpdateDoctorProfile(int id, [FromForm] DoctorProfileDto profileDto)
        {
            var doctor = await _context.Doctors
                .Include(d => d.ApplicationUser)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }

            if (profileDto.ProfilePictureFile != null)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "doctors");
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

                doctor.ProfilePicture = $"/uploads/doctors/{uniqueFileName}";
            }

            doctor.FirstName = profileDto.FirstName;
            doctor.LastName = profileDto.LastName;
            doctor.Email = profileDto.Email;
            doctor.PhoneNumber = profileDto.PhoneNumber;
            doctor.Address = profileDto.Address;
            doctor.DateofBitrh = profileDto.DateofBitrh;
            doctor.Qualification = profileDto.Qualification;
            doctor.CurrentFee = profileDto.currentFee;
            doctor.Experience = profileDto.Experience;


            if (doctor.ApplicationUser != null)
            {
                doctor.ApplicationUser.FirstName = profileDto.FirstName;
                doctor.ApplicationUser.LastName = profileDto.LastName;
                doctor.ApplicationUser.Email = profileDto.Email;
                doctor.ApplicationUser.PhoneNumber = profileDto.PhoneNumber;
                doctor.ApplicationUser.Address = profileDto.Address;
                doctor.ApplicationUser.DateOfBirth = profileDto.DateofBitrh ?? DateTime.UtcNow;
            }
            if(doctor.Clinic != null)
            {
                doctor.Clinic.Name=profileDto.ClinicName;
                doctor.Clinic.Address = profileDto.ClinicAddress;
                doctor.Clinic.PhoneNumber = profileDto.ClinicPhoneNumber;
                doctor.Clinic.OpeningTime=profileDto.OpeningTime;
                doctor.Clinic.ClosingTime = profileDto.ClosingTime;
                doctor.Clinic.Address = profileDto.ClinicAddress;
                doctor.Clinic.Description = profileDto.Description;
                doctor.Clinic.LicenseNumber = profileDto.LicenseNumber;

            }
            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Doctor profile updated successfully", doctor });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating doctor profile: {ex.Message}");
            }
        }
        [HttpGet("profile-picture/{id:int}")]
        public async Task<IActionResult> GetProfilePicture(int id)
        {
            try
            {
                var doctor = await _context.Doctors.FindAsync(id);
                if (doctor == null)
                {
                    return NotFound("Doctor not found");
                }

                if (string.IsNullOrEmpty(doctor.ProfilePicture))
                {
                    return NotFound("No profile picture found");
                }

                // Clean the path to prevent directory traversal
                var cleanPath = doctor.ProfilePicture.TrimStart('/').Replace("..", "");
                var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", cleanPath);

                if (!System.IO.File.Exists(imagePath))
                {
                    return NotFound($"Profile picture file not found at path: {cleanPath}");
                }

                // Determine content type based on file extension
                var contentType = "image/jpeg"; // default
                var extension = Path.GetExtension(imagePath).ToLower();
                switch (extension)
                {
                    case ".png":
                        contentType = "image/png";
                        break;
                    case ".jpg":
                    case ".jpeg":
                        contentType = "image/jpeg";
                        break;
                    case ".gif":
                        contentType = "image/gif";
                        break;
                }

                var imageBytes = await System.IO.File.ReadAllBytesAsync(imagePath);
                return File(imageBytes, contentType);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error retrieving profile picture: {ex.Message}");
            }
        }
       
        //update doctor profile picture
        [HttpPut("update-doctor-profile-picture/{id:int}")]
        public async Task<IActionResult> UpdateDoctorProfilePicture(int id, [FromForm] UpdateDoctorProfilePictureDto dto)
        {
            var doctor = await _context.Doctors.FindAsync(id);
            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }
            if (dto.ProfilePictureFile != null)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "doctors");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }
                var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(dto.ProfilePictureFile.FileName)}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.ProfilePictureFile.CopyToAsync(fileStream);
                }
                doctor.ProfilePicture = $"/uploads/doctors/{uniqueFileName}";
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Profile picture updated successfully", doctor });
        }
 [HttpDelete("delete-doctor/{id:int}")]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            var doctor = await _context.Doctors.FindAsync(id);
            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }
            // Delete the profile picture if it exists
            if (!string.IsNullOrEmpty(doctor.ProfilePicture))
            {
                var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", doctor.ProfilePicture.TrimStart('/'));
                if (System.IO.File.Exists(imagePath))
                {
                    System.IO.File.Delete(imagePath);
                }
            }
            _context.Doctors.Remove(doctor);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Doctor deleted successfully" });
        }
        [HttpGet("get-appointment-from-doctor/{id:int}")]
        public  async Task<IActionResult> GetAppointmentFromDoctor(int id)
        {
            if(id <= 0)
            {
                return BadRequest("Invalid doctor ID");
            }
            var appointments= await _context.Appointments.Include(a => a.Doctor)
                .Include(a => a.Patient)
                .Where(a => a.DoctorID == id)
                .Select(a => new
                {
                    a.Id,
                    DoctorName = $"{a.Doctor.FirstName} {a.Doctor.LastName}",
                    PatientName = $"{a.Patient.FirstName} {a.Patient.LastName}",
                    a.AppointmentDate,
                    a.StartTime,
                    a.EndTime,
                    a.Status,
                    a.AppointmentFee
                })
                .ToListAsync();
            if (appointments == null || appointments.Count == 0)
            {
                return NotFound("No appointments found for this doctor");
            }
            return Ok(appointments);
        }
        [HttpGet("doctor/dashboard/{doctorId}")]
        public async Task<IActionResult> GetDoctorDashboardAsync(int doctorId)
        {
            // التأكد من وجود الطبيب
            var doctorExists = await _context.Doctors.AnyAsync(d => d.Id == doctorId);
            if (!doctorExists)
                return NotFound("Doctor not found.");

            // إجمالي المواعيد لهذا الطبيب
            var totalAppointments = await _context.Appointments
                .Where(a => a.DoctorID == doctorId)
                .CountAsync();

            // مواعيد اليوم
            var today = DateTime.Today;
            var todaysAppointments = await _context.Appointments
                .Where(a => a.DoctorID == doctorId && a.AppointmentDate.Date == today)
                .CountAsync();

            // المواعيد المكتملة
            var completedAppointments = await _context.Appointments
                .Where(a => a.DoctorID == doctorId && a.Status == "Completed")
                .CountAsync();

            // أحدث موعد
            var latestAppointment = await _context.Appointments
                .Where(a => a.DoctorID == doctorId)
                .Include(a => a.Patient)
                .OrderByDescending(a => a.AppointmentDate)
                .Select(a => new
                {
                    a.Id,
                    PatientName = $"{a.Patient.FirstName} {a.Patient.LastName}",
                    a.AppointmentDate,
                    a.StartTime,
                    a.EndTime,
                    a.Status
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                TotalAppointments = totalAppointments,
                TodaysAppointments = todaysAppointments,
                CompletedAppointments = completedAppointments,
                LatestAppointment = latestAppointment
            });
        }

        // New endpoint to get doctors a patient has had appointments with
        [HttpGet("patient-appointments/{patientId}")]
        public async Task<IActionResult> GetDoctorsWithPatientAppointments(int patientId)
        {
            try
            {
                // Verify the patient exists
                var patient = await _context.Patients.FindAsync(patientId);
                if (patient == null)
                {
                    return NotFound($"Patient with ID {patientId} not found");
                }

                // Get all doctors the patient has had appointments with
                var doctorsWithAppointments = await _context.Appointments
                    .Where(a => a.PatientID == patientId)
                    .Select(a => a.DoctorID)
                    .Distinct()
                    .ToListAsync();

                if (!doctorsWithAppointments.Any())
                {
                    return Ok(new { message = "No doctors found with appointments for this patient", data = new List<object>() });
                }

                // Get doctor details
                var doctors = await _context.Doctors
                    .Where(d => doctorsWithAppointments.Contains(d.Id))
                    .Include(d => d.Specialization)
                    .Include(d => d.Clinic)
                    .Select(d => new
                    {
                        d.Id,
                        d.FirstName,
                        d.LastName,
                        d.SpecializationID,
                        d.ClinicID,
                        d.Address,
                        d.PhoneNumber,
                        d.ProfilePicture,
                        d.Description,
                        d.Qualification,
                        ClinicName = d.Clinic != null ? d.Clinic.Name : null,
                        SpecializationName = d.Specialization != null ? d.Specialization.Name : null,
                        d.Experience,
                        d.CurrentFee,
                        d.Email,
                        // Get the most recent appointment date for each doctor
                        LastAppointment = _context.Appointments
                            .Where(a => a.DoctorID == d.Id && a.PatientID == patientId)
                            .OrderByDescending(a => a.AppointmentDate)
                            .Select(a => a.AppointmentDate)
                            .FirstOrDefault()
                    })
                    .OrderByDescending(d => d.LastAppointment) // Order by most recent appointment
                    .ToListAsync();

                return Ok(new { message = "Doctors retrieved successfully", data = doctors });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching doctors", error = ex.Message });
            }
        }
    }
}
