using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using DoctorAppoitmentApi.Models;
using DoctorAppoitmentApi.Dto;
using DoctorAppoitmentApi.Data;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DoctorAvailabilityController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DoctorAvailabilityController> _logger;

        public DoctorAvailabilityController(AppDbContext context, ILogger<DoctorAvailabilityController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("doctor/{doctorId}")]
        public async Task<IActionResult> GetDoctorAvailability(int doctorId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                if (endDate < startDate)
                {
                    return BadRequest("End date cannot be before start date.");
                }

                var doctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.Id == doctorId);

                if (doctor == null)
                {
                    return NotFound($"Doctor with ID {doctorId} not found.");
                }

                var availableSlots = await _context.DoctorAvailabilities
                    .Where(da => da.DoctorID == doctorId && 
                                 da.Date >= startDate.Date && 
                                 da.Date <= endDate.Date &&
                                 da.IsActive == true)
                    .OrderBy(da => da.Date)
                    .ThenBy(da => da.StartTime)
                    .ToListAsync();

                var result = new DoctorWeeklyAvailabilityDto
                {
                    StartDate = startDate,
                    EndDate = endDate,
                    AvailableSlots = availableSlots.Select(slot => new DoctorAvailabilityResponseDto
                    {
                        Id = slot.Id,
                        DoctorId = slot.DoctorID,
                        DoctorName = $"{doctor.FirstName} {doctor.LastName}",
                        Date = slot.Date,
                        StartTime = slot.StartTime.ToString(@"hh\:mm"),
                        EndTime = slot.EndTime.ToString(@"hh\:mm"),
                        IsBooked = slot.IsBooked
                    }).ToList()
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting doctor availability.");
                return StatusCode(500, "An error occurred while fetching doctor availability.");
            }
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddDoctorAvailability([FromBody] DoctorAvailabilityDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var doctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.Id == model.DoctorId);

                if (doctor == null)
                {
                    return NotFound($"Doctor with ID {model.DoctorId} not found.");
                }

                // Validate date
                if (model.Date.Date < DateTime.Today)
                {
                    return BadRequest("Cannot set availability for past dates.");
                }

                // Check if time slot is valid
                if (model.StartTime >= model.EndTime)
                {
                    return BadRequest("Start time must be before end time.");
                }

                // Check for overlapping time slots
                var overlappingSlots = await _context.DoctorAvailabilities
                    .Where(da => da.DoctorID == model.DoctorId && 
                                 da.Date.Date == model.Date.Date && 
                                 da.IsActive == true &&
                                 ((da.StartTime <= model.StartTime && da.EndTime > model.StartTime) ||
                                  (da.StartTime < model.EndTime && da.EndTime >= model.EndTime) ||
                                  (model.StartTime <= da.StartTime && model.EndTime >= da.EndTime)))
                    .ToListAsync();

                if (overlappingSlots.Any())
                {
                    return BadRequest("The time slot overlaps with existing availability.");
                }

                var availability = new DoctorAvailability
                {
                    DoctorID = model.DoctorId,
                    Date = model.Date.Date,
                    StartTime = model.StartTime,
                    EndTime = model.EndTime,
                    IsBooked = false,
                    IsActive = true
                };

                _context.DoctorAvailabilities.Add(availability);
                await _context.SaveChangesAsync();

                var response = new DoctorAvailabilityResponseDto
                {
                    Id = availability.Id,
                    DoctorId = availability.DoctorID,
                    DoctorName = $"{doctor.FirstName} {doctor.LastName}",
                    Date = availability.Date,
                    StartTime = availability.StartTime.ToString(@"hh\:mm"),
                    EndTime = availability.EndTime.ToString(@"hh\:mm"),
                    IsBooked = availability.IsBooked
                };

                return CreatedAtAction(nameof(GetDoctorAvailability), new { doctorId = model.DoctorId }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding doctor availability.");
                return StatusCode(500, "An error occurred while adding doctor availability.");
            }
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteDoctorAvailability(int id)
        {
            try
            {
                var availability = await _context.DoctorAvailabilities
                    .FirstOrDefaultAsync(da => da.Id == id);

                if (availability == null)
                {
                    return NotFound($"Availability with ID {id} not found.");
                }

                if (availability.IsBooked)
                {
                    return BadRequest("Cannot delete a time slot that has been booked.");
                }

                // Soft delete - mark as inactive instead of removing from database
                availability.IsActive = false;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Availability deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting doctor availability.");
                return StatusCode(500, "An error occurred while deleting doctor availability.");
            }
        }

        [HttpPut("update/{id}")]
        public async Task<IActionResult> UpdateDoctorAvailability(int id, [FromBody] DoctorAvailabilityDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var availability = await _context.DoctorAvailabilities
                    .FirstOrDefaultAsync(da => da.Id == id);

                if (availability == null)
                {
                    return NotFound($"Availability with ID {id} not found.");
                }

                if (availability.IsBooked)
                {
                    return BadRequest("Cannot update a time slot that has been booked.");
                }

                // Validate date
                if (model.Date.Date < DateTime.Today)
                {
                    return BadRequest("Cannot set availability for past dates.");
                }

                // Check if time slot is valid
                if (model.StartTime >= model.EndTime)
                {
                    return BadRequest("Start time must be before end time.");
                }

                // Check for overlapping time slots
                var overlappingSlots = await _context.DoctorAvailabilities
                    .Where(da => da.DoctorID == model.DoctorId && 
                                 da.Date.Date == model.Date.Date && 
                                 da.Id != id &&
                                 da.IsActive == true &&
                                 ((da.StartTime <= model.StartTime && da.EndTime > model.StartTime) ||
                                  (da.StartTime < model.EndTime && da.EndTime >= model.EndTime) ||
                                  (model.StartTime <= da.StartTime && model.EndTime >= da.EndTime)))
                    .ToListAsync();

                if (overlappingSlots.Any())
                {
                    return BadRequest("The time slot overlaps with existing availability.");
                }

                availability.Date = model.Date.Date;
                availability.StartTime = model.StartTime;
                availability.EndTime = model.EndTime;

                await _context.SaveChangesAsync();

                var doctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.Id == availability.DoctorID);

                var response = new DoctorAvailabilityResponseDto
                {
                    Id = availability.Id,
                    DoctorId = availability.DoctorID,
                    DoctorName = $"{doctor.FirstName} {doctor.LastName}",
                    Date = availability.Date,
                    StartTime = availability.StartTime.ToString(@"hh\:mm"),
                    EndTime = availability.EndTime.ToString(@"hh\:mm"),
                    IsBooked = availability.IsBooked
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating doctor availability.");
                return StatusCode(500, "An error occurred while updating doctor availability.");
            }
        }
    }
} 