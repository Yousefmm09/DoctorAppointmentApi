using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using DoctorAppointmentApi.Models;

namespace DoctorAppointmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly ILogger<ChatController> _logger;

        public ChatController(AppDbContext context, IHubContext<ChatHub> hubContext, ILogger<ChatController> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
            _logger = logger;
        }

        // Helper methods for consistent user identification
        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        private string GetUserType()
        {
            // Try both claim types for backward compatibility
            var userType = User.FindFirstValue(ClaimTypes.Role);
            if (string.IsNullOrEmpty(userType))
            {
                userType = User.FindFirstValue("UserType");
            }
            return userType;
        }

        [HttpPost("sendMessage")]
        public async Task<ActionResult<MessageResponse>> SendMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                // Validate request
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Ensure at least one sender and one receiver is specified
                if (request.DoctorSenderId == null && request.PatientSenderId == null)
                {
                    return BadRequest(new { message = "A sender (doctor or patient) must be specified." });
                }

                if (request.DoctorReceiverId == null && request.PatientReceiverId == null)
                {
                    return BadRequest(new { message = "A receiver (doctor or patient) must be specified." });
                }

                // Create the message entity
                var message = new ChatMessage
                {
                    DoctorSenderId = request.DoctorSenderId,
                    PatientSenderId = request.PatientSenderId,
                    DoctorReceiverId = request.DoctorReceiverId,
                    PatientReceiverId = request.PatientReceiverId,
                    Message = request.Message,
                    Timestamp = DateTime.UtcNow,
                    IsRead = false
                };

                // Save to database
                _context.ChatMessages.Add(message);
                await _context.SaveChangesAsync();

                // Load related entities
                await LoadRelatedEntities(message);

                // Create response DTO
                var response = CreateMessageResponse(message);

                // Notify the receiver through SignalR
                var receiverGroup = request.DoctorReceiverId?.ToString() ?? request.PatientReceiverId?.ToString();
                if (!string.IsNullOrEmpty(receiverGroup))
                {
                    await _hubContext.Clients.Group(receiverGroup).SendAsync("ReceiveMessage", response);
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "An error occurred while sending the message." });
            }
        }

        [HttpGet("conversations")]
        public async Task<ActionResult<IEnumerable<object>>> GetUserConversations()
        {
            try
            {
                // Get current user ID and type
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { message = "User ID not found in token." });
                }

                var userType = GetUserType();
                if (string.IsNullOrEmpty(userType) || (userType != "Doctor" && userType != "Patient"))
                {
                    return BadRequest(new { message = "Invalid or missing user type." });
                }

                // Modify this section to handle string/GUID user IDs
                var conversations = new List<object>();

                if (userType == "Doctor")
                {
                    // Get doctor entity by user ID (which is now a GUID/string)
                    var doctor = await _context.Doctors
                        .FirstOrDefaultAsync(d => d.ApplicationUserId == userId);

                    if (doctor == null)
                    {
                        return NotFound(new { message = "Doctor profile not found for this user." });
                    }

                    int doctorId = doctor.Id; // Get the numeric ID from the doctor entity

                    // Continue with doctorId as before
                    var doctorMessages = await _context.ChatMessages
                        .Where(m =>
                            (m.DoctorSenderId.HasValue && m.DoctorSenderId.Value == doctorId) ||
                            (m.DoctorReceiverId.HasValue && m.DoctorReceiverId.Value == doctorId))
                        .ToListAsync();

                    // Group by conversation partner
                    var doctorConversations = new List<(string ContactType, int ContactId)>();

                    foreach (var msg in doctorMessages)
                    {
                        if (msg.DoctorSenderId.HasValue && msg.DoctorSenderId.Value == doctorId)
                        {
                            // I'm the sender, who did I send to?
                            if (msg.PatientReceiverId.HasValue)
                            {
                                doctorConversations.Add(("Patient", msg.PatientReceiverId.Value));
                            }
                            else if (msg.DoctorReceiverId.HasValue && msg.DoctorReceiverId.Value != doctorId)
                            {
                                doctorConversations.Add(("Doctor", msg.DoctorReceiverId.Value));
                            }
                        }
                        else if (msg.DoctorReceiverId.HasValue && msg.DoctorReceiverId.Value == doctorId)
                        {
                            // I'm the receiver, who sent to me?
                            if (msg.PatientSenderId.HasValue)
                            {
                                doctorConversations.Add(("Patient", msg.PatientSenderId.Value));
                            }
                            else if (msg.DoctorSenderId.HasValue && msg.DoctorSenderId.Value != doctorId)
                            {
                                doctorConversations.Add(("Doctor", msg.DoctorSenderId.Value));
                            }
                        }
                    }

                    // Get unique conversations
                    var uniqueConversations = doctorConversations
                        .GroupBy(c => new { c.ContactType, c.ContactId })
                        .Select(g => g.First())
                        .ToList();

                    foreach (var conv in uniqueConversations)
                    {
                        if (conv.ContactType == "Patient")
                        {
                            var patient = await _context.Patients.FindAsync(conv.ContactId);
                            if (patient == null) continue;

                            var lastMessageInfo = await GetLastMessageBetween(doctorId.ToString(), "Doctor", conv.ContactId.ToString(), "Patient");
                            if (lastMessageInfo == null) continue;

                            conversations.Add(new
                            {
                                ConversationType = "Patient",
                                ContactId = conv.ContactId,
                                ContactName = $"{patient.FirstName} {patient.LastName}",
                                LastMessage = lastMessageInfo.Message,
                                LastMessageTime = lastMessageInfo.Timestamp,
                                UnreadCount = await GetUnreadCountBetween(doctorId.ToString(), "Doctor", conv.ContactId.ToString(), "Patient")
                            });
                        }
                        else if (conv.ContactType == "Doctor")
                        {
                            var otherDoctor = await _context.Doctors.FindAsync(conv.ContactId);
                            if (otherDoctor == null) continue;

                            var lastMessageInfo = await GetLastMessageBetween(doctorId.ToString(), "Doctor", conv.ContactId.ToString(), "Doctor");
                            if (lastMessageInfo == null) continue;

                            conversations.Add(new
                            {
                                ConversationType = "Doctor",
                                ContactId = conv.ContactId,
                                ContactName = $"Dr. {otherDoctor.FirstName} {otherDoctor.LastName}",
                                LastMessage = lastMessageInfo.Message,
                                LastMessageTime = lastMessageInfo.Timestamp,
                                UnreadCount = await GetUnreadCountBetween(doctorId.ToString(), "Doctor", conv.ContactId.ToString(), "Doctor")
                            });
                        }
                    }
                }
                else // Patient
                {
                    // Get patient entity by user ID (which is now a GUID/string)
                    var patient = await _context.Patients
                        .FirstOrDefaultAsync(p => p.ApplicationUserId == userId);

                    if (patient == null)
                    {
                        return NotFound(new { message = "Patient profile not found for this user." });
                    }

                    int patientId = patient.Id; // Get the numeric ID from the patient entity

                    // Continue with patientId as before
                    var patientMessages = await _context.ChatMessages
                        .Where(m =>
                            (m.PatientSenderId.HasValue && m.PatientSenderId.Value == patientId) ||
                            (m.PatientReceiverId.HasValue && m.PatientReceiverId.Value == patientId))
                        .ToListAsync();

                    // Group by conversation partner
                    var patientConversations = new List<(string ContactType, int ContactId)>();

                    foreach (var msg in patientMessages)
                    {
                        if (msg.PatientSenderId.HasValue && msg.PatientSenderId.Value == patientId)
                        {
                            // I'm the sender, who did I send to?
                            if (msg.DoctorReceiverId.HasValue)
                            {
                                patientConversations.Add(("Doctor", msg.DoctorReceiverId.Value));
                            }
                            else if (msg.PatientReceiverId.HasValue && msg.PatientReceiverId.Value != patientId)
                            {
                                patientConversations.Add(("Patient", msg.PatientReceiverId.Value));
                            }
                        }
                        else if (msg.PatientReceiverId.HasValue && msg.PatientReceiverId.Value == patientId)
                        {
                            // I'm the receiver, who sent to me?
                            if (msg.DoctorSenderId.HasValue)
                            {
                                patientConversations.Add(("Doctor", msg.DoctorSenderId.Value));
                            }
                            else if (msg.PatientSenderId.HasValue && msg.PatientSenderId.Value != patientId)
                            {
                                patientConversations.Add(("Patient", msg.PatientSenderId.Value));
                            }
                        }
                    }

                    // Get unique conversations
                    var uniqueConversations = patientConversations
                        .GroupBy(c => new { c.ContactType, c.ContactId })
                        .Select(g => g.First())
                        .ToList();

                    foreach (var conv in uniqueConversations)
                    {
                        if (conv.ContactType == "Doctor")
                        {
                            var doctor = await _context.Doctors.FindAsync(conv.ContactId);
                            if (doctor == null) continue;

                            var lastMessageInfo = await GetLastMessageBetween(patientId.ToString(), "Patient", conv.ContactId.ToString(), "Doctor");
                            if (lastMessageInfo == null) continue;

                            conversations.Add(new
                            {
                                ConversationType = "Doctor",
                                ContactId = conv.ContactId,
                                ContactName = $"Dr. {doctor.FirstName} {doctor.LastName}",
                                LastMessage = lastMessageInfo.Message,
                                LastMessageTime = lastMessageInfo.Timestamp,
                                UnreadCount = await GetUnreadCountBetween(patientId.ToString(), "Patient", conv.ContactId.ToString(), "Doctor")
                            });
                        }
                        else if (conv.ContactType == "Patient")
                        {
                            var otherPatient = await _context.Patients.FindAsync(conv.ContactId);
                            if (otherPatient == null) continue;

                            var lastMessageInfo = await GetLastMessageBetween(patientId.ToString(), "Patient", conv.ContactId.ToString(), "Patient");
                            if (lastMessageInfo == null) continue;

                            conversations.Add(new
                            {
                                ConversationType = "Patient",
                                ContactId = conv.ContactId,
                                ContactName = $"{otherPatient.FirstName} {otherPatient.LastName}",
                                LastMessage = lastMessageInfo.Message,
                                LastMessageTime = lastMessageInfo.Timestamp,
                                UnreadCount = await GetUnreadCountBetween(patientId.ToString(), "Patient", conv.ContactId.ToString(), "Patient")
                            });
                        }
                    }
                }

                // Return conversations sorted by most recent message
                return Ok(conversations.OrderByDescending(c => ((dynamic)c).LastMessageTime));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving conversations for user: {Message}", ex.Message);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "An error occurred while retrieving conversations." });
            }
        }

        [HttpGet("messages")]
        public async Task<ActionResult<IEnumerable<MessageResponse>>> GetMessages(
            [FromQuery] string contactType,
            [FromQuery] int contactId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            contactType = contactType?.Trim();
            try
            {

                // Get current user ID and type
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { message = "User ID not found in token." });
                }

                var userType = GetUserType();
                if (string.IsNullOrEmpty(userType) || (userType != "Doctor" && userType != "Patient"))
                {
                    return BadRequest(new { message = "Invalid or missing user type." });
                }

                // Get numeric ID for current user
                int currentUserId;
                if (userType == "Doctor")
                {
                    var doctor = await _context.Doctors
                        .FirstOrDefaultAsync(d => d.ApplicationUserId == userId);

                    if (doctor == null)
                    {
                        return NotFound(new { message = "Doctor profile not found for this user." });
                    }

                    currentUserId = doctor.Id;
                }
                else // Patient
                {
                    var patient = await _context.Patients
                        .FirstOrDefaultAsync(p => p.ApplicationUserId == userId);

                    if (patient == null)
                    {
                        return NotFound(new { message = "Patient profile not found for this user." });
                    }

                    currentUserId = patient.Id;
                }

                // Build query based on user type and contact type
                IQueryable<ChatMessage> query = null;

                if (userType == "Doctor" && contactType == "Patient")
                {
                    query = _context.ChatMessages.Where(m =>
                        (m.DoctorSenderId == currentUserId && m.PatientReceiverId == contactId) ||
                        (m.PatientSenderId == contactId && m.DoctorReceiverId == currentUserId));
                }
                else if (userType == "Doctor" && contactType == "Doctor")
                {
                    query = _context.ChatMessages.Where(m =>
                        (m.DoctorSenderId == currentUserId && m.DoctorReceiverId == contactId) ||
                        (m.DoctorSenderId == contactId && m.DoctorReceiverId == currentUserId));
                }
                else if (userType == "Patient" && contactType == "Doctor")
                {
                    query = _context.ChatMessages.Where(m =>
                        (m.PatientSenderId == currentUserId && m.DoctorReceiverId == contactId) ||
                        (m.DoctorSenderId == contactId && m.PatientReceiverId == currentUserId));
                }
                else if (userType == "Patient" && contactType == "Patient")
                {
                    query = _context.ChatMessages.Where(m =>
                        (m.PatientSenderId == currentUserId && m.PatientReceiverId == contactId) ||
                        (m.PatientSenderId == contactId && m.PatientReceiverId == currentUserId));
                }

                if (query == null)
                {
                    return BadRequest(new { message = "Invalid user or contact type." });
                }

                // Calculate pagination
                var totalCount = await query.CountAsync();
                var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

                // Get paginated messages with related entities
                var messages = await query
                    .OrderByDescending(m => m.Timestamp)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Include(m => m.DoctorSender)
                    .Include(m => m.PatientSender)
                    .Include(m => m.DoctorReceiver)
                    .Include(m => m.PatientReceiver)
                    .ToListAsync();

                // Mark unread messages as read if user is the receiver
                var unreadMessages = messages.Where(m =>
                    (userType == "Doctor" && m.DoctorReceiverId == currentUserId && !m.IsRead) ||
                    (userType == "Patient" && m.PatientReceiverId == currentUserId && !m.IsRead)).ToList();

                if (unreadMessages.Any())
                {
                    foreach (var msg in unreadMessages)
                    {
                        msg.IsRead = true;
                        msg.ReadAt = DateTime.UtcNow;
                    }
                    await _context.SaveChangesAsync();
                }

                // Map to response DTOs
                var responseMessages = messages.Select(m => CreateMessageResponse(m)).ToList();

                return Ok(new
                {
                    Messages = responseMessages.OrderBy(m => m.Timestamp),
                    Pagination = new
                    {
                        CurrentPage = page,
                        TotalPages = totalPages,
                        PageSize = pageSize,
                        TotalCount = totalCount
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving messages");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "An error occurred while retrieving messages." });
            }
        }

        [HttpPost("markAsRead")]
        public async Task<ActionResult> MarkMessageAsRead([FromBody] MarkMessageReadRequestDto request)
        {
            try
            {
                var message = await _context.ChatMessages.FindAsync(request.MessageId);
                if (message == null)
                {
                    return NotFound(new { message = "Message not found." });
                }

                // Get current user ID and type
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { message = "User ID not found in token." });
                }

                var userType = GetUserType();

                // Get numeric ID for current user
                int currentUserId;
                if (userType == "Doctor")
                {
                    var doctor = await _context.Doctors
                        .FirstOrDefaultAsync(d => d.ApplicationUserId == userId);

                    if (doctor == null)
                    {
                        return NotFound(new { message = "Doctor profile not found for this user." });
                    }

                    currentUserId = doctor.Id;
                }
                else // Patient
                {
                    var patient = await _context.Patients
                        .FirstOrDefaultAsync(p => p.ApplicationUserId == userId);

                    if (patient == null)
                    {
                        return NotFound(new { message = "Patient profile not found for this user." });
                    }

                    currentUserId = patient.Id;
                }

                // Ensure the user is the intended receiver
                bool isReceiver = (userType == "Doctor" && message.DoctorReceiverId == currentUserId) ||
                                  (userType == "Patient" && message.PatientReceiverId == currentUserId);

                if (!isReceiver)
                {
                    return Forbid();
                }

                // Mark as read if not already
                if (!message.IsRead)
                {
                    message.IsRead = true;
                    message.ReadAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = "Message marked as read." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking message as read");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "An error occurred while marking the message as read." });
            }
        }

        [HttpGet("unreadCount")]
        public async Task<ActionResult<int>> GetUnreadMessageCount()
        {
            try
            {
                // Get current user ID and type
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { message = "User ID not found in token." });
                }

                var userType = GetUserType();

                // Get numeric ID for current user
                int currentUserId;
                if (userType == "Doctor")
                {
                    var doctor = await _context.Doctors
                        .FirstOrDefaultAsync(d => d.ApplicationUserId == userId);

                    if (doctor == null)
                    {
                        return NotFound(new { message = "Doctor profile not found for this user." });
                    }

                    currentUserId = doctor.Id;
                }
                else // Patient
                {
                    var patient = await _context.Patients
                        .FirstOrDefaultAsync(p => p.ApplicationUserId == userId);

                    if (patient == null)
                    {
                        return NotFound(new { message = "Patient profile not found for this user." });
                    }

                    currentUserId = patient.Id;
                }

                int unreadCount = 0;

                if (userType == "Doctor")
                {
                    unreadCount = await _context.ChatMessages
                        .CountAsync(m => m.DoctorReceiverId == currentUserId && !m.IsRead);
                }
                else if (userType == "Patient")
                {
                    unreadCount = await _context.ChatMessages
                        .CountAsync(m => m.PatientReceiverId == currentUserId && !m.IsRead);
                }

                return Ok(new { unreadCount });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving unread count");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "An error occurred while retrieving unread count." });
            }
        }

        // Helper methods
        private async Task LoadRelatedEntities(ChatMessage message)
        {
            if (message.DoctorSenderId.HasValue)
                message.DoctorSender = await _context.Doctors.FindAsync(message.DoctorSenderId.Value);

            if (message.PatientSenderId.HasValue)
                message.PatientSender = await _context.Patients.FindAsync(message.PatientSenderId.Value);

            if (message.DoctorReceiverId.HasValue)
                message.DoctorReceiver = await _context.Doctors.FindAsync(message.DoctorReceiverId.Value);

            if (message.PatientReceiverId.HasValue)
                message.PatientReceiver = await _context.Patients.FindAsync(message.PatientReceiverId.Value);
        }



        private MessageResponse CreateMessageResponse(ChatMessage message)
        {
            string senderName = string.Empty;
            string receiverName = string.Empty;

            // Handle sender name
            if (message.DoctorSender != null)
            {
                senderName = $"Dr. {message.DoctorSender.FirstName} {message.DoctorSender.LastName}";
            }
            else if (message.PatientSender != null)
            {
                senderName = $"{message.PatientSender.FirstName} {message.PatientSender.LastName}";
            }

            // Handle receiver name
            if (message.DoctorReceiver != null)
            {
                receiverName = $"Dr. {message.DoctorReceiver.FirstName} {message.DoctorReceiver.LastName}";
            }
            else if (message.PatientReceiver != null)
            {
                receiverName = $"{message.PatientReceiver.FirstName} {message.PatientReceiver.LastName}";
            }

            return new MessageResponse
            {
                MessageId = message.Id,
                Message = message.Message,
                Timestamp = message.Timestamp,
                IsRead = message.IsRead,
                ReadAt = message.ReadAt,
                SenderId = message.DoctorSenderId ?? message.PatientSenderId ?? 0,
                SenderType = message.DoctorSenderId.HasValue ? "Doctor" : "Patient",
                SenderName = senderName,
                ReceiverId = message.DoctorReceiverId ?? message.PatientReceiverId ?? 0,
                ReceiverType = message.DoctorReceiverId.HasValue ? "Doctor" : "Patient",
                ReceiverName = receiverName
            };
        }


        // Unified helper methods
        private async Task<dynamic> GetLastMessageBetween(string userIdStr, string userType, string contactIdStr, string contactType)
        {
            try
            {
                if (!int.TryParse(userIdStr, out int userId) || !int.TryParse(contactIdStr, out int contactId))
                {
                    return new { Message = "", Timestamp = DateTime.UtcNow };
                }

                var query = _context.ChatMessages.AsQueryable();

                if (userType == "Doctor" && contactType == "Patient")
                {
                    query = query.Where(m =>
                        (m.DoctorSenderId == userId && m.PatientReceiverId == contactId) ||
                        (m.PatientSenderId == contactId && m.DoctorReceiverId == userId));
                }
                else if (userType == "Doctor" && contactType == "Doctor")
                {
                    query = query.Where(m =>
                        (m.DoctorSenderId == userId && m.DoctorReceiverId == contactId) ||
                        (m.DoctorSenderId == contactId && m.DoctorReceiverId == userId));
                }
                else if (userType == "Patient" && contactType == "Doctor")
                {
                    query = query.Where(m =>
                        (m.PatientSenderId == userId && m.DoctorReceiverId == contactId) ||
                        (m.DoctorSenderId == contactId && m.PatientReceiverId == userId));
                }
                else if (userType == "Patient" && contactType == "Patient")
                {
                    query = query.Where(m =>
                        (m.PatientSenderId == userId && m.PatientReceiverId == contactId) ||
                        (m.PatientSenderId == contactId && m.PatientReceiverId == userId));
                }

                var lastMessage = await query.OrderByDescending(m => m.Timestamp).FirstOrDefaultAsync();

                if (lastMessage == null)
                {
                    return new { Message = "", Timestamp = DateTime.UtcNow };
                }

                return new { Message = lastMessage.Message, Timestamp = lastMessage.Timestamp };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last message");
                return new { Message = "", Timestamp = DateTime.UtcNow };
            }
        }

        private async Task<int> GetUnreadCountBetween(string userIdStr, string userType, string contactIdStr, string contactType)
        {
            try
            {
                if (!int.TryParse(userIdStr, out int userId) || !int.TryParse(contactIdStr, out int contactId))
                {
                    return 0;
                }

                var query = _context.ChatMessages.AsQueryable();

                if (userType == "Doctor" && contactType == "Patient")
                {
                    return await query.CountAsync(m =>
                        m.DoctorReceiverId == userId && m.PatientSenderId == contactId && !m.IsRead);
                }
                else if (userType == "Doctor" && contactType == "Doctor")
                {
                    return await query.CountAsync(m =>
                        m.DoctorReceiverId == userId && m.DoctorSenderId == contactId && !m.IsRead);
                }
                else if (userType == "Patient" && contactType == "Doctor")
                {
                    return await query.CountAsync(m =>
                        m.PatientReceiverId == userId && m.DoctorSenderId == contactId && !m.IsRead);
                }
                else if (userType == "Patient" && contactType == "Patient")
                {
                    return await query.CountAsync(m =>
                        m.PatientReceiverId == userId && m.PatientSenderId == contactId && !m.IsRead);
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unread count");
                return 0;
            }
        }
    }
}