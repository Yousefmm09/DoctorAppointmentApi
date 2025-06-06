namespace DoctorAppoitmentApi.Models
{
    public class Patient : BasicEntity
    {
        public string Gender { get; set; } = string.Empty;
        public DateTime? DateOfBirth { get; set; }
        public string Address { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string ZipCode { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? ProfilePicture { get; set; }
        public string? MedicalHistory { get; set; }
        public string? InsuranceInfo { get; set; }

        // ApplicationUser relationship
        [Required]
        public string ApplicationUserId { get; set; }
        [ForeignKey("ApplicationUserId")]
        public ApplicationUser ApplicationUser { get; set; }

        public ICollection<Appointment> Appointments { get; set; }

        public ICollection<Rating> Ratings { get; set; }
    }



}
