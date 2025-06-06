namespace DoctorAppoitmentApi.Dto
{
    public class PatientAppointment
    {
        
        [Required]
        public int PatientID { get; set; }

        [Required]
        public int DoctorID { get; set; }

        [Required]
        public DateTime AppointmentDate { get; set; }

        [Required]
        public TimeSpan StartTime { get; set; }

        [Required]
        public TimeSpan EndTime { get; set; }

        public string Reason { get; set; } = string.Empty;

        public string Notes { get; set; } = string.Empty;

        [Required]
        public string AppointmentFee { get; set; } = string.Empty;
    }



}
