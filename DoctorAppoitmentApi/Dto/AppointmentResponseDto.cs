namespace DoctorAppoitmentApi.Dto
{
    public class AppointmentResponseDto
    {
        public int Id { get; set; }
        public string PatientName { get; set; }
        public string DoctorName { get; set; }
        public string Specialization { get; set; }
        public DateTime AppointmentDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string Status { get; set; }
        public bool IsConfirmed { get; set; }
        public string AppointmentFee { get; set; }
        public string Reason { get; set; }
        public string Notes { get; set; }
    }


    

}
