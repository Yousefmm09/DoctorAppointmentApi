using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using DoctorAppoitmentApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Cryptography;
using System.Text;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DoctorAppointmentApi.Models; // Add this for ChatMessage

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
            
            // Get recent appointments
            var recentAppointments = await _context.Appointments
                .Include(a => a.Doctor)
                .Include(a => a.Patient)
                .OrderByDescending(a => a.AppointmentDate)
                .Take(5)
                .Select(a => new
                {
                    a.Id,
                    DoctorName = $"{a.Doctor.FirstName} {a.Doctor.LastName}",
                    PatientName = $"{a.Patient.FirstName} {a.Patient.LastName}",
                    a.AppointmentDate,
                    a.StartTime,
                    a.EndTime,
                    a.Status,
                    Specialization = a.Doctor.Specialization != null ? a.Doctor.Specialization.Name : "General"
                })
                .ToListAsync();
                
            // Get top doctors based on appointments count and ratings
            var topDoctors = await _context.Doctors
                .Include(d => d.Specialization)
                .Include(d => d.Appointments)
                .Include(d => d.Ratings)
                .Select(d => new
                {
                    d.Id,
                    Name = $"{d.FirstName} {d.LastName}",
                    d.ProfilePicture,
                    Specialization = d.Specialization != null ? d.Specialization.Name : "General",
                    AppointmentCount = d.Appointments.Count,
                    Rating = d.Ratings.Any() ? Math.Round(d.Ratings.Average(r => r.Score), 1) : 0,
                    ImageUrl = !string.IsNullOrEmpty(d.ProfilePicture) ? d.ProfilePicture : DefaultProfilePicture
                })
                .OrderByDescending(d => d.AppointmentCount)
                .ThenByDescending(d => d.Rating)
                .Take(5)
                .ToListAsync();
                
            // Calculate average fee
            var doctorFees = await _context.Doctors
                .Where(d => !string.IsNullOrEmpty(d.CurrentFee))
                .Select(d => d.CurrentFee)
                .ToListAsync();
                
            decimal averageFee = 0;
            if (doctorFees.Count > 0)
            {
                var validFees = doctorFees
                    .Select(fee => decimal.TryParse(fee, out decimal parsedFee) ? parsedFee : 0)
                    .Where(fee => fee > 0)
                    .ToList();
                    
                if (validFees.Count > 0)
                {
                    averageFee = validFees.Average();
                }
            }

            return Ok(new
            {
                TotalDoctors = totalDoctors,
                TotalPatients = totalPatients,
                TotalClinics = totalClinics,
                TotalAppointments = totalAppointments,
                RecentAppointments = recentAppointments,
                TopDoctors = topDoctors,
                AverageFee = Math.Round(averageFee, 2)
            });
        }
        [HttpGet("get-all-Appointment")]
        public async Task<IActionResult> GetAllAppointments()
        {
            try
            {
                // Get all payments to join with appointments
                var payments = await _context.Set<Payment>()
                    .ToDictionaryAsync(p => p.AppointmentId, p => p.Status);
                
                var appointments = await _context.Appointments
                    .Include(a => a.Doctor)
                        .ThenInclude(d => d.Specialization)
                    .Include(a => a.Patient)
                        .ThenInclude(p => p.ApplicationUser)
                    .Select(a => new
                    {
                        a.Id,
                        DoctorName = $"{a.Doctor.FirstName} {a.Doctor.LastName}",
                        PatientName = $"{a.Patient.FirstName} {a.Patient.LastName}",
                        a.AppointmentDate,
                        a.StartTime,
                        a.EndTime,
                        a.Status,
                        a.AppointmentFee,
                        DoctorSpecialization = a.Doctor.Specialization != null ? a.Doctor.Specialization.Name : "General",
                        DoctorId = a.DoctorID,
                        PatientId = a.PatientID,
                        DoctorImage = a.Doctor.ProfilePicture,
                        PatientImage = a.Patient.ProfilePicture,
                        PatientEmail = a.Patient.ApplicationUser != null ? a.Patient.ApplicationUser.Email : null,
                        PatientPhone = a.Patient.ApplicationUser != null ? a.Patient.ApplicationUser.PhoneNumber : null,
                        a.Reason,
                        a.Notes,
                        PaymentStatus = "Not Paid" // Default value
                    })
                    .OrderByDescending(a => a.AppointmentDate)
                    .ThenBy(a => a.StartTime)
                    .ToListAsync();
                
                // Update payment status for appointments that have payments
                var result = appointments.Select(a => {
                    var appointmentWithPayment = new {
                        a.Id,
                        a.DoctorName,
                        a.PatientName,
                        a.AppointmentDate,
                        a.StartTime,
                        a.EndTime,
                        a.Status,
                        a.AppointmentFee,
                        a.DoctorSpecialization,
                        a.DoctorId,
                        a.PatientId,
                        a.DoctorImage,
                        a.PatientImage,
                        a.PatientEmail,
                        a.PatientPhone,
                        a.Reason,
                        a.Notes,
                        PaymentStatus = payments.ContainsKey(a.Id) ? payments[a.Id] : "Not Paid"
                    };
                    return appointmentWithPayment;
                }).ToList();
                    
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        [HttpDelete("delete-doctor/{id:int}")]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var doctor = await _context.Doctors
                    .Include(d => d.Appointments)
                    .FirstOrDefaultAsync(d => d.Id == id);
                    
                if (doctor == null)
                {
                    return NotFound("Doctor not found");
                }
                
                // First, delete all related appointments
                if (doctor.Appointments != null && doctor.Appointments.Any())
                {
                    _context.Appointments.RemoveRange(doctor.Appointments);
                    await _context.SaveChangesAsync();
                }
                
                // Check for and delete ratings
                var ratings = await _context.Set<Rating>()
                    .Where(r => r.DoctorId == id)
                    .ToListAsync();
                    
                if (ratings.Any())
                {
                    _context.Set<Rating>().RemoveRange(ratings);
                    await _context.SaveChangesAsync();
                }
                
                // Check for and delete availabilities
                var availabilities = await _context.Set<DoctorAvailability>()
                    .Where(a => a.DoctorID == id)
                    .ToListAsync();
                    
                if (availabilities.Any())
                {
                    _context.Set<DoctorAvailability>().RemoveRange(availabilities);
                    await _context.SaveChangesAsync();
                }
                
                // Check for and delete chat messages
                var chatMessages = await _context.Set<ChatMessage>()
                    .Where(m => m.DoctorSenderId == id || m.DoctorReceiverId == id)
                    .ToListAsync();
                    
                if (chatMessages.Any())
                {
                    _context.Set<ChatMessage>().RemoveRange(chatMessages);
                    await _context.SaveChangesAsync();
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
                
                // Finally, delete the doctor
                _context.Doctors.Remove(doctor);
                await _context.SaveChangesAsync();
                
                // Commit the transaction
                await transaction.CommitAsync();
                
                return Ok(new { message = "Doctor deleted successfully" });
            }
            catch (Exception ex)
            {
                // Roll back the transaction on error
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to delete doctor", error = ex.Message });
            }
        }

        [HttpGet("top-doctors")]
        public async Task<IActionResult> GetTopDoctors()
        {
            try
            {
                var topDoctors = await _context.Doctors
                    .Include(d => d.Specialization)
                    .Include(d => d.Appointments)
                    .Include(d => d.Ratings)
                    .Select(d => new
                    {
                        d.Id,
                        Name = $"{d.FirstName} {d.LastName}",
                        d.ProfilePicture,
                        Specialization = d.Specialization != null ? d.Specialization.Name : "General",
                        AppointmentCount = d.Appointments.Count,
                        Rating = d.Ratings.Any() ? Math.Round(d.Ratings.Average(r => r.Score), 1) : 0,
                        ImageUrl = !string.IsNullOrEmpty(d.ProfilePicture) ? d.ProfilePicture : DefaultProfilePicture
                    })
                    .OrderByDescending(d => d.AppointmentCount)
                    .ThenByDescending(d => d.Rating)
                    .Take(10)
                    .ToListAsync();
                    
                return Ok(topDoctors);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }
    }


}


        
    
