using System.ComponentModel.DataAnnotations;

namespace DoctorAppoitmentApi.Dto
{
    public class ChatRequest
    {
        [Required]
        public string Message { get; set; } = "";
        public string? UserId { get; set; }
    }
} 