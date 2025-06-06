namespace DoctorAppoitmentApi.Models
{
    public class Clinics
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }=string.Empty;
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        
        [Required]

        [MaxLength(250)]
        public string Description { get; set; }
        public string? LicenseNumber { get; set; }

        private TimeSpan? _openingTime;
        private TimeSpan? _closingTime;

        [DataType(DataType.Time)]
        public TimeSpan? OpeningTime
        {
            get => _openingTime;
            set => _openingTime = value;
        }

        [DataType(DataType.Time)]
        public TimeSpan? ClosingTime
        {
            get => _closingTime;
            set => _closingTime = value;
        }

        public ICollection<Doctors> Doctors { get; set; }
    }
}