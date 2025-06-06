namespace DoctorAppoitmentApi.Dto
{
    public class DoctorAddClinic
    {
        [Required]
        public string ClinicName { get; set; }
        [Required]
        public int PhoneNumber { get; set; }
        [Required]
        public string Address { get; set; }
        [Required]
        public string Description { get; set; }
        [Required]
        public int LicenseNumber { get; set; }
        [DataType(DataType.Time)]
        public TimeSpan OpeningTime { get; set; }
        [DataType(DataType.Time)]
        public TimeSpan ClosingTime { get; set; }
    }
}