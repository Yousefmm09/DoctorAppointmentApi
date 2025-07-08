using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DoctorAppoitmentApi.Models;
using DoctorAppoitmentApi.Service;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.Extensions.Logging;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(
            AppDbContext context,
            INotificationService notificationService,
            ILogger<NotificationsController> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            try
            {
                int userAccountId = await GetUserAccountIdAsync();
                if (userAccountId == 0)
                {
                    return BadRequest("Invalid user account");
                }

                var notifications = await _notificationService.GetUserNotificationsAsync(userAccountId);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving notifications");
                return StatusCode(500, "An error occurred while retrieving notifications");
            }
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            try
            {
                int userAccountId = await GetUserAccountIdAsync();
                if (userAccountId == 0)
                {
                    return BadRequest("Invalid user account");
                }

                int count = await _notificationService.GetUnreadCountAsync(userAccountId);
                return Ok(new { count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving unread notification count");
                return StatusCode(500, "An error occurred while retrieving unread notification count");
            }
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                // Verify the notification belongs to the current user
                int userAccountId = await GetUserAccountIdAsync();
                var notification = await _context.Notifications.FindAsync(id);
                
                if (notification == null)
                {
                    return NotFound("Notification not found");
                }
                
                if (notification.UserAccountId != userAccountId)
                {
                    return Forbid("You do not have permission to access this notification");
                }

                bool success = await _notificationService.MarkAsReadAsync(id);
                if (!success)
                {
                    return NotFound("Notification not found");
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read");
                return StatusCode(500, "An error occurred while marking notification as read");
            }
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                int userAccountId = await GetUserAccountIdAsync();
                if (userAccountId == 0)
                {
                    return BadRequest("Invalid user account");
                }

                bool success = await _notificationService.MarkAllAsReadAsync(userAccountId);
                return Ok(new { success });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read");
                return StatusCode(500, "An error occurred while marking all notifications as read");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            try
            {
                // Verify the notification belongs to the current user
                int userAccountId = await GetUserAccountIdAsync();
                var notification = await _context.Notifications.FindAsync(id);
                
                if (notification == null)
                {
                    return NotFound("Notification not found");
                }
                
                if (notification.UserAccountId != userAccountId)
                {
                    return Forbid("You do not have permission to access this notification");
                }

                bool success = await _notificationService.DeleteNotificationAsync(id);
                if (!success)
                {
                    return NotFound("Notification not found");
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting notification");
                return StatusCode(500, "An error occurred while deleting notification");
            }
        }

        // Helper method to get UserAccount ID from current user
        private async Task<int> GetUserAccountIdAsync()
        {
            try
            {
                string userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return 0;
                }

                // Get user type from claims
                var userType = User.FindFirstValue(ClaimTypes.Role);
                if (string.IsNullOrEmpty(userType))
                {
                    userType = User.FindFirstValue("UserType");
                }

                // Get the email of the user
                string email = User.FindFirstValue(ClaimTypes.Email);
                if (string.IsNullOrEmpty(email))
                {
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null)
                    {
                        email = user.Email;
                    }
                }

                // Find the corresponding UserAccount
                if (!string.IsNullOrEmpty(email))
                {
                    var userAccount = await _context.UserAccounts
                        .FirstOrDefaultAsync(u => u.Email == email);
                        
                    if (userAccount != null)
                    {
                        return userAccount.Id;
                    }
                }

                // If no matching UserAccount by email, try to match by ID
                if (userType == "Patient")
                {
                    var patient = await _context.Patients
                        .FirstOrDefaultAsync(p => p.ApplicationUserId == userId);
                        
                    if (patient != null)
                    {
                        var userAccount = await _context.UserAccounts
                            .FirstOrDefaultAsync(u => u.Id == patient.Id);
                            
                        if (userAccount != null)
                        {
                            return userAccount.Id;
                        }
                    }
                }
                else if (userType == "Doctor")
                {
                    var doctor = await _context.Doctors
                        .FirstOrDefaultAsync(d => d.ApplicationUserId == userId);
                        
                    if (doctor != null)
                    {
                        var userAccount = await _context.UserAccounts
                            .FirstOrDefaultAsync(u => u.Id == doctor.Id);
                            
                        if (userAccount != null)
                        {
                            return userAccount.Id;
                        }
                    }
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user account ID");
                return 0;
            }
        }
    }
} 