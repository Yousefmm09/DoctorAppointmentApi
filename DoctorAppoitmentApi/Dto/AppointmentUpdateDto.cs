namespace DoctorAppoitmentApi.Dto
{
    public class AppointmentUpdateDto
    {

        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string Status { get; set; }
        public string Notes { get; set; }
    }
}
