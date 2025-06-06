using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using DoctorAppoitmentApi.Models;
using DoctorAppoitmentApi.Dto;
using DoctorAppoitmentApi.Data;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RatingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public RatingsController(AppDbContext context)
        {
            _context = context;
        }
        [HttpPost]
        [Authorize(Roles = "Patient")]
        public async Task<IActionResult> AddRating([FromBody] RatingDoctorDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => p.ApplicationUserId == userId);

            if (patient == null) return Unauthorized("Invalid patient.");

            var doctor = await _context.Doctors.FindAsync(dto.DoctorId);
            if (doctor == null) return NotFound("Doctor not found.");

            var rating = new Rating
            {
                PatientId = patient.Id,
                DoctorId = dto.DoctorId,
                Score = dto.score,
                Comment = dto.comment,
                CreatedAt = DateTime.UtcNow
            };

            _context.Ratings.Add(rating);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Rating submitted successfully." });
        }

        [HttpGet("doctor")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> GetMyDoctorRatings([FromQuery] int? doctorId = null)
        {
            try
            {
                int targetDoctorId;
                
                if (doctorId.HasValue)
                {
                    // If doctorId is provided in query, use it
                    targetDoctorId = doctorId.Value;
                    Console.WriteLine($"[RatingsController] Using provided doctorId: {targetDoctorId}");
                }
                else
                {
                    // Otherwise get it from the token
                    var applicationUserIdFromToken = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    if (string.IsNullOrEmpty(applicationUserIdFromToken))
                    {
                        return Unauthorized("User identifier not found in token.");
                    }

                    Console.WriteLine($"[RatingsController] Getting ratings for user ID: {applicationUserIdFromToken}");

                    var loggedInDoctor = await _context.Doctors
                        .Include(d => d.ApplicationUser)
                        .FirstOrDefaultAsync(d => d.ApplicationUserId == applicationUserIdFromToken);

                    if (loggedInDoctor == null)
                    {
                        Console.WriteLine("[RatingsController] Doctor profile not found");
                        return Unauthorized("Doctor profile not found for the logged-in user. Please ensure your doctor profile is complete.");
                    }

                    targetDoctorId = loggedInDoctor.Id;
                    Console.WriteLine($"[RatingsController] Found doctor with ID: {targetDoctorId}");
                }

                var ratings = await _context.Ratings
                    .Where(r => r.DoctorId == targetDoctorId)
                    .Include(r => r.Patient)
                        .ThenInclude(p => p.ApplicationUser)
                    .Select(r => new RatingResponseDto
                    {
                        Id = r.Id,
                        Score = r.Score,
                        Comment = r.Comment,
                        CreatedAt = r.CreatedAt,
                        PatientName = r.Patient.ApplicationUser.FirstName + " " + r.Patient.ApplicationUser.LastName,
                    })
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();

                Console.WriteLine($"[RatingsController] Found {ratings.Count} ratings");

                return Ok(ratings);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RatingsController] Error: {ex.Message}");
                throw;
            }
        }
        [Authorize(Roles = "Patient")]
        [HttpGet("doctor-public")]
        public async Task<IActionResult> GetDoctorRatingsPublic(int doctorId)
        {
            var ratings = await _context.Ratings
                .Where(r => r.DoctorId == doctorId)
                .Include(r => r.Patient)
                .Select(r => new RatingResponseDto
                {
                    Id = r.Id,
                    Score = r.Score,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    PatientName = r.Patient.ApplicationUser.FirstName + " " + r.Patient.ApplicationUser.LastName,
                })
                .ToListAsync();

            return Ok(ratings);
        }
        [HttpGet("doctor/average")]
        [AllowAnonymousAttribute]
        public async Task<IActionResult> GetDoctorAverageRating(int doctorId)
        {
            var averageRating = await _context.Ratings
                .Where(r => r.DoctorId == doctorId)
                .AverageAsync(r => r.Score);
            return Ok(new { AverageRating = averageRating });
        }
        [HttpGet("rating/by-user-id/{userId}")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> GetDoctorRatingByUserId(string userId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (currentUserId != userId)
                return Forbid("You can only view your own rating.");

            var doctor = await _context.Doctors
                .Include(d => d.Ratings)
                .FirstOrDefaultAsync(d => d.ApplicationUserId == userId);

            if (doctor == null)
                return NotFound("Doctor not found");

            if (doctor.Ratings == null || !doctor.Ratings.Any())
                return Ok(new { AverageRating = 0, TotalRatings = 0 });

            var average = doctor.Ratings.Average(r => r.Score);
            var total = doctor.Ratings.Count;

            return Ok(new
            {
                DoctorId = doctor.Id,
                AverageRating = Math.Round(average, 2),
                TotalRatings = total
            });
        }
        //rating des



    }

}
