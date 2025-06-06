namespace DoctorAppoitmentApi.Dto
{
    public class MessageResponse
    {
        public int MessageId { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public int SenderId { get; set; }
        public string SenderType { get; set; }
        public string SenderName { get; set; }
        public int ReceiverId { get; set; }
        public string ReceiverType { get; set; }
        public string ReceiverName { get; set; }
    }
}