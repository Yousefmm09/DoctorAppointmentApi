using DoctorAppoitmentApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private const string DefaultProfilePicture = "/images/default-profile.png";


        public AdminController(AppDbContext dbContext)
        {
            _context = dbContext;
        }
        [HttpGet("All_Doctor")]
        public async Task<IActionResult> GetAllDoctorsAsync()
        {
            var doctors = await _context.Doctors
                .Include(c => c.Clinic)
                .Include(s => s.Specialization)
                .Select(d => new
                {
                    d.Id,
                    d.FirstName,
                    d.LastName,
                    d.PhoneNumber,
                    d.ProfilePicture,
                    SpecializationName = d.Specialization != null ? d.Specialization.Name : null,
                    ClinicsName = d.Clinic != null ? d.Clinic.Name : null,
                    d.Address,
                    d.Appointments,
                    d.Description,
                    d.Experience,
                    d.CurrentFee
                })
                .ToListAsync();
            return Ok(doctors);
        }



        [HttpGet("get-all-clinics")]  // Explicit HTTP GET attribute
        public async Task<IActionResult> GetAllClinicsAsync()
        {
            var clinics = await _context.Clinics
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Address,
                    c.PhoneNumber,
                    c.Description,
                    c.LicenseNumber,
                    c.OpeningTime,
                    c.ClosingTime
                })
                .ToListAsync();
            return Ok(clinics);
        }
        //dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardData()
        {
            var totalDoctors = await _context.Doctors.CountAsync();
            var totalPatients = await _context.Patients.CountAsync();
            var totalClinics = await _context.Clinics.CountAsync();
            var totalAppointments = await _context.Appointments.CountAsync();
            //lastet appointment
            var latestAppointment = await _context.Appointments
                .Include(a => a.Doctor)
                .Include(a => a.Patient)
                .OrderByDescending(a => a.AppointmentDate)
                .Select(a => new
                {
                    a.Id,
                    DoctorName = $"{a.Doctor.FirstName} {a.Doctor.LastName}",
                    PatientName = $"{a.Patient.FirstName} {a.Patient.LastName}",
                    a.AppointmentDate,
                    a.StartTime,
                    a.EndTime,
                    a.Status
                })
                .FirstOrDefaultAsync();
            return Ok(new
            {
                TotalDoctors = totalDoctors,
                TotalPatients = totalPatients,
                TotalClinics = totalClinics,
                TotalAppointments = totalAppointments,
                LatestAppointment = latestAppointment
            });
        }
        [HttpGet("get-all-Appointment")]
        public async Task<IActionResult> GetAllAppointments()
        {
            var appointments = await _context.Appointments
                .Include(a => a.Doctor)
                .Include(a => a.Patient)
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
                    //a.PaymentStatus,

                })
                .ToListAsync();
            return Ok(appointments);
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
    }


}


        
    
