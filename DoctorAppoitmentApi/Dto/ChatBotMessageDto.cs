namespace DoctorAppoitmentApi.Dto
{
    public class ChatBotMessageDto
    {
        public int Id { get; set; }
        public string Message { get; set; }
        public bool IsBot { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? PatientId { get; set; }
        public int? DoctorId { get; set; }
        public string UserId { get; set; }
        // Constructor
        public ChatBotMessageDto()
        {
            CreatedAt = DateTime.UtcNow;
            UserId = string.Empty;
        }
    }
}
