using System;

namespace DoctorAppoitmentApi.Models
{
    public class ChatBotMessage
    {
        public int Id { get; set; }
        public string? UserId { get; set; }  // Can be null for anonymous users
        public string Role { get; set; } = "user";  // user, system, assistant
        public string Content { get; set; } = "";
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string? SessionId { get; set; }  // To group messages in a single conversation
        
        // Navigation property if you want to link to users
        public virtual ApplicationUser? User { get; set; }
    }
}
