using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using DoctorAppoitmentApi.Service;
using DoctorAppoitmentApi.Models;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AppointmentController> _logger;
        private readonly IEmailService _emailService;
        private readonly INotificationService _notificationService;

        public AppointmentController(
            AppDbContext context, 
            ILogger<AppointmentController> logger,
            IEmailService emailService,
            INotificationService notificationService)
        {
            _context = context;
            _logger = logger;
            _emailService = emailService;
            _notificationService = notificationService;
        }

        #region GET Methods

        [HttpGet]
        public async Task<IActionResult> GetAllAppointmentsAsync()
        {
            try
            {
                var appointments = await _context.Appointments
     .Include(a => a.Doctor).ThenInclude(d => d.Specialization)
     .Include(a => a.Patient)
     .Select(a => new AppointmentResponseDto
     {
         Id = a.Id,
         PatientName = (a.Patient.FirstName ?? "" + " " + a.Patient.LastName ?? "").Trim(),
         DoctorName = (a.Doctor.FirstName ?? "" + " " + a.Doctor.LastName ?? "").Trim(),
         Specialization = a.Doctor.Specialization.Name ?? "Unknown",
         AppointmentDate = a.AppointmentDate,
         StartTime = a.StartTime,
         EndTime = a.EndTime,
         Status = a.Status ?? "Pending",
         IsConfirmed = a.IsConfirmed,
         AppointmentFee = a.AppointmentFee ?? "0",
         Reason = a.Reason ?? "",
         Notes = a.Notes ?? ""
     })
     .ToListAsync();


                return Ok(appointments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all appointments.");
                return StatusCode(500, "An error occurred while fetching appointments.");
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAppointmentByIdAsync(int id)
        {
            var appointment = await _context.Appointments
                .Include(a => a.Doctor).ThenInclude(d => d.Specialization)
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (appointment == null)
                return NotFound("Appointment not found.");

            return Ok(MapToResponseDto(appointment));
        }

        [HttpGet("available-slots")]
        public async Task<IActionResult> GetAvailableSlots([FromQuery] int doctorId, [FromQuery] DateTime date)
        {
            try
            {
                var allSlots = new List<TimeSpan>();
                var openingTime = new TimeSpan(8, 0, 0);
                var closingTime = new TimeSpan(18, 0, 0);
                var slotDuration = TimeSpan.FromMinutes(30);

                for (var time = openingTime; time < closingTime; time += slotDuration)
                {
                    var endTime = time + slotDuration;
                    if (await IsTimeSlotAvailable(doctorId, date, time, endTime))
                    {
                        allSlots.Add(time);
                    }
                }

                return Ok(allSlots.Select(t => t.ToString(@"hh\:mm")));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting available slots.");
                return StatusCode(500, "An error occurred while fetching available slots.");
            }
        }

        // New endpoint for getting doctor availability slots
        [HttpGet("get-doctor-slots")]
        public async Task<IActionResult> GetDoctorSlots([FromQuery] int doctorId, [FromQuery] DateTime startDate, [FromQuery] DateTime? endDate = null)
        {
            try
            {
                // Default to one week if no end date is provided
                var actualEndDate = endDate ?? startDate.AddDays(7);
                
                if (actualEndDate < startDate)
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
                                 da.Date <= actualEndDate.Date &&
                                 da.IsActive == true)
                    .OrderBy(da => da.Date)
                    .ThenBy(da => da.StartTime)
                    .ToListAsync();

                var result = new
                {
                    startDate = startDate,
                    endDate = actualEndDate,
                    doctorId = doctorId,
                    doctorName = $"{doctor.FirstName} {doctor.LastName}",
                    availableSlots = availableSlots.Select(slot => new
                    {
                        id = slot.Id,
                        doctorId = slot.DoctorID,
                        date = slot.Date,
                        startTime = slot.StartTime.ToString(@"hh\:mm"),
                        endTime = slot.EndTime.ToString(@"hh\:mm"),
                        isBooked = slot.IsBooked
                    }).ToList()
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting doctor availability slots.");
                return StatusCode(500, "An error occurred while fetching doctor availability slots.");
            }
        }

        [HttpGet("check-availability")]
        public async Task<IActionResult> CheckAvailability([FromQuery] int doctorId, [FromQuery] DateTime date, [FromQuery] TimeSpan startTime, [FromQuery] TimeSpan endTime)
        {
            var isAvailable = await IsTimeSlotAvailable(doctorId, date, startTime, endTime);
            return Ok(new { isAvailable });
        }

        [HttpGet("doctor/{doctorId}/with-payments")]
        public async Task<IActionResult> GetAppointmentsWithPaymentsForDoctor(int doctorId)
        {
            try
            {
                _logger.LogInformation($"Getting appointments with payment info for doctor ID: {doctorId}");
                
                var appointments = await _context.Appointments
                    .Include(a => a.Patient)
                    .ThenInclude(p => p.ApplicationUser)
                    .Include(a => a.Doctor)
                    .ThenInclude(d => d.ApplicationUser)
                    .Include(a => a.Payments) // Include payment information
                    .Where(a => a.DoctorID == doctorId)
                    .OrderByDescending(a => a.AppointmentDate)
                    .ToListAsync();

                var result = appointments.Select(appointment => new
                {
                    id = appointment.Id,
                    doctorId = appointment.DoctorID,
                    patientId = appointment.PatientID,
                    patientName = $"{appointment.Patient?.ApplicationUser?.FirstName} {appointment.Patient?.ApplicationUser?.LastName}",
                    patientEmail = appointment.Patient?.ApplicationUser?.Email,
                    patientPhoneNumber = appointment.Patient?.PhoneNumber,
                    patientProfilePicture = appointment.Patient?.ProfilePicture,
                    appointmentDate = appointment.AppointmentDate,
                    startTime = appointment.StartTime,
                    endTime = appointment.EndTime,
                    reason = appointment.Reason,
                    status = appointment.Status,
                    isConfirmed = appointment.IsConfirmed,
                    doctorName = $"{appointment.Doctor?.ApplicationUser?.FirstName} {appointment.Doctor?.ApplicationUser?.LastName}",
                    appointmentFee = appointment.AppointmentFee,
                    // Include payment information
                    payment = appointment.Payments != null && appointment.Payments.Any() ? 
                        new {
                            status = appointment.Payments.OrderByDescending(p => p.PaymentDate).FirstOrDefault()?.Status,
                            amount = appointment.Payments.OrderByDescending(p => p.PaymentDate).FirstOrDefault()?.Amount,
                            paymentMethod = appointment.Payments.OrderByDescending(p => p.PaymentDate).FirstOrDefault()?.PaymentMethod,
                            paymentDate = appointment.Payments.OrderByDescending(p => p.PaymentDate).FirstOrDefault()?.PaymentDate,
                            transactionId = appointment.Payments.OrderByDescending(p => p.PaymentDate).FirstOrDefault()?.TransactionId
                        } : null
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting appointments with payments for doctor ID: {doctorId}");
                return StatusCode(500, new { error = "Failed to get appointments with payment information", details = ex.Message });
            }
        }

        #endregion

        #region POST Methods

        [HttpPost]
        public async Task<IActionResult> CreateAppointmentAsync([FromBody] PatientAppointment model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (model.PatientID <= 0 || model.DoctorID <= 0)
                return BadRequest("Invalid PatientID or DoctorID.");

            try
            {
                // Validate appointment date
                if (model.AppointmentDate.Date < DateTime.Today)
                {
                    return BadRequest("Cannot book appointments for past dates.");
                }

                if (model.AppointmentDate.Date > DateTime.Today.AddMonths(3))
                {
                    return BadRequest("Appointments can only be booked up to 3 months in advance.");
                }

                // Round appointment times to nearest 30 minutes
                model.StartTime = RoundToNearestInterval(model.StartTime, TimeSpan.FromMinutes(30));
                model.EndTime = model.StartTime.Add(TimeSpan.FromMinutes(30)); // Fixed 30-minute slots

                var patient = await _context.Patients
                    .Include(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(p => p.Id == model.PatientID);

                if (patient == null)
                    return NotFound($"Patient with ID {model.PatientID} not found.");

                // Get clinic details with validation
                var doctorInfo = await _context.Doctors
     .Where(d => d.Id == model.DoctorID)
     .Select(d => new
     {
         d.Id,
         d.FirstName,
         d.LastName,
         ClinicName = d.Clinic.Name,
         ClinicOpeningTime = TimeSpan.Parse(d.Clinic.OpeningTime.ToString()),
         ClinicClosingTime = TimeSpan.Parse(d.Clinic.ClosingTime.ToString()),
         BreakStartTime = TimeSpan.FromHours(13),
         BreakEndTime = TimeSpan.FromHours(14),
         d.CurrentFee
     })
     .FirstOrDefaultAsync();


                if (doctorInfo == null)
                {
                    _logger.LogWarning("Doctor {DoctorId} not found", model.DoctorID);
                    return NotFound($"Doctor with ID {model.DoctorID} not found.");
                }

                // Validate working hours
                if (IsBreakTime(model.StartTime, doctorInfo.BreakStartTime, doctorInfo.BreakEndTime))
                {
                    return BadRequest($"Doctor {doctorInfo.FirstName} {doctorInfo.LastName} is on break between " +
                                    $"{doctorInfo.BreakStartTime:hh\\:mm} - {doctorInfo.BreakEndTime:hh\\:mm}");
                }

                if (!IsWithinWorkingHours(model.StartTime, model.EndTime, doctorInfo.ClinicOpeningTime, doctorInfo.ClinicClosingTime))
                {
                    return BadRequest(
                        $"Dr. {doctorInfo.FirstName} {doctorInfo.LastName} at {doctorInfo.ClinicName} is available between " +
                        $"{doctorInfo.ClinicOpeningTime:hh\\:mm} - {doctorInfo.ClinicClosingTime:hh\\:mm}. " +
                        $"Please select a time within these hours."
                    );
                }

                // Check slot availability
                if (!await IsTimeSlotAvailable(model.DoctorID, model.AppointmentDate, model.StartTime, model.EndTime))
                {
                    var nextAvailable = await FindNextAvailableSlot(
                        model.DoctorID,
                        model.AppointmentDate,
                        doctorInfo.ClinicOpeningTime,
                        doctorInfo.ClinicClosingTime
                    );

                    return BadRequest(new
                    {
                        message = "The selected time slot is not available.",
                        suggestedTime = nextAvailable?.ToString("hh\\:mm"),
                        suggestedDate = nextAvailable.HasValue ? model.AppointmentDate.Date : model.AppointmentDate.Date.AddDays(1)
                    });
                }

                // Create appointment with rounded times
                var appointment = new Appointment
                {
                    PatientID = model.PatientID,
                    DoctorID = model.DoctorID,
                    AppointmentDate = model.AppointmentDate.Date,
                    StartTime = model.StartTime,
                    EndTime = model.EndTime,
                    Status = "Scheduled",
                    Reason = model.Reason ?? "",
                    Notes = model.Notes ?? "",
                    AppointmentFee = model.AppointmentFee ?? doctorInfo.CurrentFee ?? "0",
                    IsConfirmed = false
                };

                try
                {
                    _context.Appointments.Add(appointment);
                    await _context.SaveChangesAsync();

                    var createdAppointment = await _context.Appointments
                        .Include(a => a.Doctor)
                            .ThenInclude(d => d.Specialization)
                        .Include(a => a.Patient)
                        .FirstOrDefaultAsync(a => a.Id == appointment.Id);

                    if (createdAppointment == null)
                    {
                        _logger.LogError("Failed to retrieve created appointment. ID: {AppointmentId}", appointment.Id);
                        return StatusCode(500, "An error occurred while retrieving the created appointment.");
                    }

                    // Log success
                    _logger.LogInformation(
                        "Appointment created successfully. ID: {AppointmentId}, Date: {Date}, Time: {Time}",
                        createdAppointment.Id,
                        createdAppointment.AppointmentDate.ToString("dd/MM/yyyy"),
                        createdAppointment.StartTime.ToString("hh\\:mm")
                    );

                    // Send notifications
                    try
                    {
                        // Send notifications using the notification service
                        await _notificationService.NotifyAppointmentCreatedAsync(createdAppointment);
                    }
                    catch (Exception ex)
                    {
                        // Just log the error but don't interrupt the appointment creation flow
                        _logger.LogError(ex, "Error sending notifications for appointment {AppointmentId}", createdAppointment.Id);
                    }

                    return Ok(MapToResponseDto(createdAppointment));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error creating appointment");
                    return StatusCode(500, new { message = "An error occurred while creating the appointment." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in CreateAppointmentAsync");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // Add these helper methods

        //cancel appointment
        [HttpPost("cancel/{id}")]
        public async Task<IActionResult> CancelAppointmentAsync(int id)
        {
            try
            {
                var appointment = await _context.Appointments
                    .Include(a => a.Doctor)
                        .ThenInclude(d => d.ApplicationUser)
                    .Include(a => a.Patient)
                        .ThenInclude(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (appointment == null)
                    return NotFound("Appointment not found.");

                if (appointment.Status == "Cancelled")
                {
                    return BadRequest("Appointment is already cancelled.");
                }

                appointment.Status = "Cancelled";
                await _context.SaveChangesAsync();

                // Send cancellation notification
                try
                {
                    await _notificationService.NotifyAppointmentCancelledAsync(appointment);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending cancellation notification for appointment {AppointmentId}", id);
                }

                return Ok(MapToResponseDto(appointment));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling appointment.");
                return StatusCode(500, "An error occurred while cancelling the appointment.");
            }
        }


        [HttpPost("confirm/{id}")]
        public async Task<IActionResult> ConfirmAppointmentAsync(int id)
        {
            try
            {
                var appointment = await _context.Appointments
                    .Include(a => a.Doctor)
                        .ThenInclude(d => d.ApplicationUser)
                    .Include(a => a.Patient)
                        .ThenInclude(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (appointment == null)
                    return NotFound("Appointment not found.");

                if (appointment.IsConfirmed)
                    return BadRequest("Appointment is already confirmed.");

                appointment.IsConfirmed = true;
                await _context.SaveChangesAsync();

                // Send confirmation notification
                try
                {
                    await _notificationService.NotifyAppointmentConfirmedAsync(appointment);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending confirmation notification for appointment {AppointmentId}", id);
                }

                return Ok(MapToResponseDto(appointment));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming appointment.");
                return StatusCode(500, "An error occurred while confirming the appointment.");
            }
        }

        #endregion

        #region PUT Methods

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAppointmentAsync(int id, [FromBody] AppointmentUpdateDto model)
        {
            var appointment = await _context.Appointments.FindAsync(id);
            if (appointment == null)
                return NotFound("Appointment not found.");

            if (model.StartTime != appointment.StartTime || model.EndTime != appointment.EndTime)
            {
                if (!await IsTimeSlotAvailable(appointment.DoctorID, appointment.AppointmentDate, model.StartTime, model.EndTime, id))
                    return BadRequest("The selected time slot is not available.");
            }

            try
            {
                appointment.StartTime = model.StartTime;
                appointment.EndTime = model.EndTime;
                appointment.Status = model.Status;
                appointment.Notes = model.Notes ?? "";

                await _context.SaveChangesAsync();
                return Ok(MapToResponseDto(appointment));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating appointment.");
                return StatusCode(500, "An error occurred while updating the appointment.");
            }
        }

        #endregion
        // change appointment available time for patient

        // Doctor Change Appointment Time Method
        [HttpPut("doctor-change-appointment-time/{id}")]
        public async Task<IActionResult> DoctorChangeAppointmentTime(int id, [FromBody] ChangeAvailableTimeDto model)
        {
            // Find the appointment
            var appointment = await _context.Appointments
                .Include(a => a.Doctor)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (appointment == null)
                return NotFound("Appointment not found.");

            // Validate user token and role
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdClaim))
                return Unauthorized("Invalid token.");

            // Ensure only the doctor can modify the appointment
            if (role != "Doctor")
                return Forbid("Only doctors can modify appointments.");

            // Find doctor by user ID
            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.ApplicationUserId == userIdClaim);
            if (doctor == null)
                return Unauthorized("Doctor not found.");

            if (appointment.DoctorID != doctor.Id)
                return Forbid("Doctors can only modify their own appointments.");

            // Doctors can only change today's appointments
            if (appointment.AppointmentDate.Date != DateTime.Today)
                return BadRequest("Doctors can only change today's appointments.");

            // Check if the new time slot is available
            if (!await IsTimeSlotAvailable(appointment.DoctorID, appointment.AppointmentDate, model.StartTime, model.EndTime, id))
                return BadRequest("The selected time slot is not available.");

            try
            {
                // Update appointment time
                appointment.StartTime = model.StartTime;
                appointment.EndTime = model.EndTime;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Appointment time updated successfully.",
                    appointment = MapToResponseDto(appointment)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing appointment time by doctor.");
                return StatusCode(500, "An error occurred while changing the appointment time.");
            }
        }

        // New endpoint for updating doctor availability slots
        [HttpPut("update-slot/{id}")]
        public async Task<IActionResult> UpdateAvailabilitySlot(string id, [FromBody] DoctorAvailabilityDto model)
        {
            try
            {
                // Check if this is a temporary ID (created by frontend before saving)
                if (id.StartsWith("temp-"))
                {
                    // This is a new slot, so create it instead of updating
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

                    // Create new availability
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

                    return Ok(new 
                    { 
                        id = availability.Id,
                        doctorId = availability.DoctorID,
                        doctorName = $"{doctor.FirstName} {doctor.LastName}",
                        date = availability.Date,
                        startTime = availability.StartTime.ToString(@"hh\:mm"),
                        endTime = availability.EndTime.ToString(@"hh\:mm"),
                        isBooked = availability.IsBooked
                    });
                }
                else
                {
                    // Try to parse the ID as an integer
                    if (!int.TryParse(id, out int availabilityId))
                    {
                        return BadRequest("Invalid availability ID format");
                    }

                    // Find the existing availability
                    var availability = await _context.DoctorAvailabilities
                        .FirstOrDefaultAsync(da => da.Id == availabilityId);

                    if (availability == null)
                    {
                        return NotFound($"Availability with ID {availabilityId} not found.");
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
                                    da.Id != availabilityId &&
                                    da.IsActive == true &&
                                    ((da.StartTime <= model.StartTime && da.EndTime > model.StartTime) ||
                                    (da.StartTime < model.EndTime && da.EndTime >= model.EndTime) ||
                                    (model.StartTime <= da.StartTime && model.EndTime >= da.EndTime)))
                        .ToListAsync();

                    if (overlappingSlots.Any())
                    {
                        return BadRequest("The time slot overlaps with existing availability.");
                    }

                    // Update the availability
                    availability.Date = model.Date.Date;
                    availability.StartTime = model.StartTime;
                    availability.EndTime = model.EndTime;

                    await _context.SaveChangesAsync();

                    // Get doctor info
                    var doctor = await _context.Doctors
                        .FirstOrDefaultAsync(d => d.Id == availability.DoctorID);

                    return Ok(new 
                    { 
                        id = availability.Id,
                        doctorId = availability.DoctorID,
                        doctorName = doctor != null ? $"{doctor.FirstName} {doctor.LastName}" : "Unknown",
                        date = availability.Date,
                        startTime = availability.StartTime.ToString(@"hh\:mm"),
                        endTime = availability.EndTime.ToString(@"hh\:mm"),
                        isBooked = availability.IsBooked
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating availability slot.");
                return StatusCode(500, "An error occurred while updating the availability slot.");
            }
        }

        // New endpoint for deleting doctor availability slots
        [HttpDelete("delete-slot/{id}")]
        public async Task<IActionResult> DeleteAvailabilitySlot(string id)
        {
            try
            {
                // If it's a temporary ID, no need to delete from database
                if (id.StartsWith("temp-"))
                {
                    return Ok(new { message = "Temporary slot deleted successfully." });
                }

                // Try to parse the ID as an integer
                if (!int.TryParse(id, out int availabilityId))
                {
                    return BadRequest("Invalid availability ID format");
                }

                // Find the availability
                var availability = await _context.DoctorAvailabilities
                    .FirstOrDefaultAsync(da => da.Id == availabilityId);

                if (availability == null)
                {
                    return NotFound($"Availability with ID {availabilityId} not found.");
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
                _logger.LogError(ex, "Error deleting availability slot.");
                return StatusCode(500, "An error occurred while deleting the availability slot.");
            }
        }
        
        #region Helper Methods

        private async Task<bool> IsTimeSlotAvailable(int doctorId, DateTime date, TimeSpan startTime, TimeSpan endTime, int? excludeAppointmentId = null)
        {
            var query = _context.Appointments
                .Where(a => a.DoctorID == doctorId &&
                            a.AppointmentDate.Date == date.Date &&
                            a.StartTime < endTime &&
                            a.EndTime > startTime);

            if (excludeAppointmentId.HasValue)
                query = query.Where(a => a.Id != excludeAppointmentId.Value);

            return !await query.AnyAsync();
        }

        private bool IsWithinWorkingHours(TimeSpan startTime, TimeSpan endTime, TimeSpan openingTime, TimeSpan closingTime)
        {
            return startTime >= openingTime && endTime <= closingTime;
        }

        private AppointmentResponseDto MapToResponseDto(Appointment appointment)
        {
            if (appointment == null) return null;

            return new AppointmentResponseDto
            {
                Id = appointment.Id,
                PatientName = appointment.Patient != null ? $"{appointment.Patient.FirstName} {appointment.Patient.LastName}".Trim() : "Unknown Patient",
                DoctorName = appointment.Doctor != null ? $"{appointment.Doctor.FirstName} {appointment.Doctor.LastName}".Trim() : "Unknown Doctor",
                Specialization = appointment.Doctor?.Specialization?.Name ?? "Unknown",
                AppointmentDate = appointment.AppointmentDate,
                StartTime = appointment.StartTime,
                EndTime = appointment.EndTime,
                Status = appointment.Status ?? "Pending",
                IsConfirmed = appointment.IsConfirmed,
                AppointmentFee = appointment.AppointmentFee ?? "0",
                Reason = appointment.Reason ?? "",
                Notes = appointment.Notes ?? ""
            };
        }

        private TimeSpan RoundToNearestInterval(TimeSpan time, TimeSpan interval)
        {
            var totalMinutes = Math.Round(time.TotalMinutes / interval.TotalMinutes) * interval.TotalMinutes;
            return TimeSpan.FromMinutes(totalMinutes);
        }

        private bool IsBreakTime(TimeSpan appointmentTime, TimeSpan breakStart, TimeSpan breakEnd)
        {
            return appointmentTime >= breakStart && appointmentTime < breakEnd;
        }

        private async Task<TimeSpan?> FindNextAvailableSlot(int doctorId, DateTime date, TimeSpan openTime, TimeSpan closeTime)
        {
            var slotDuration = TimeSpan.FromMinutes(30);
            for (var time = openTime; time < closeTime; time += slotDuration)
            {
                var endTime = time + slotDuration;
                if (await IsTimeSlotAvailable(doctorId, date, time, endTime))
                {
                    return time;
                }
            }
            return null;
        }
        
        [HttpPost("{id}/send-reminder")]
        public async Task<IActionResult> SendReminderAsync(int id)
        {
            try
            {
                var appointment = await _context.Appointments
                    .Include(a => a.Doctor)
                        .ThenInclude(d => d.ApplicationUser)
                    .Include(a => a.Patient)
                        .ThenInclude(p => p.ApplicationUser)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (appointment == null)
                {
                    return NotFound("Appointment not found");
                }

                // Send reminder notification
                await _notificationService.SendAppointmentReminderAsync(appointment);
                
                return Ok(new { message = "Reminder sent successfully", appointment = MapToResponseDto(appointment) });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending reminder for appointment {AppointmentId}", id);
                return StatusCode(500, "An error occurred while sending appointment reminder");
            }
        }

        #endregion
    }
}
