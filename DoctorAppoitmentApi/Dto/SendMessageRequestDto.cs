namespace DoctorAppoitmentApi.Dto
{
    public class SendMessageRequest
    {
        public int? DoctorSenderId { get; set; }
        public int? PatientSenderId { get; set; }
        public int? DoctorReceiverId { get; set; }
        public int? PatientReceiverId { get; set; }
        [Required(ErrorMessage = "Message content is required.")]
        [StringLength(2000, ErrorMessage = "Message cannot exceed 2000 characters.")]
        public string Message { get; set; }
    }
}
