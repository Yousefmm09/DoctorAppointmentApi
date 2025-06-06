namespace DoctorAppoitmentApi.Dto

{
    public class ChangeAvailableTimeDto
    {
        public int DoctorId { get; set; }
        [Required]
        public TimeSpan StartTime { get; set; }
        [Required]
        public TimeSpan EndTime { get; set; }
    }
}