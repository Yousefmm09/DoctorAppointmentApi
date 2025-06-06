namespace DoctorAppoitmentApi.Dto
{
    public class ClinicDto
    {
        public string? Name { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Description { get; set; }
        public string? LicenseNumber { get; set; }
        public TimeSpan? OpeningTime { get; set; }
        public TimeSpan? ClosingTime { get; set; }
    }
}
