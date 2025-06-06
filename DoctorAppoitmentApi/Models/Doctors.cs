using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DoctorAppoitmentApi.Models
{
    public class Doctors : BasicEntity
    {
        [Required]
        public string ApplicationUserId { get; set; }

        [ForeignKey("ApplicationUserId")]
        public ApplicationUser ApplicationUser { get; set; }

        [Required]
        public int SpecializationID { get; set; }

        [ForeignKey("SpecializationID")]
        public Specialization Specialization { get; set; }

        [Required]
        public int ClinicID { get; set; }

        [ForeignKey("ClinicID")]
        public Clinics Clinic { get; set; }

        public string Address { get; set; }

        [EmailAddress]
        public string Email { get; set; }

        public string PhoneNumber { get; set; }

        public string? ProfilePicture { get; set; }

        [MaxLength(250)]
        public string Description { get; set; }

        public string Qualification { get; set; }
        public string Experience { get; set; }
        public string CurrentFee { get; set; }
        public DateTime? DateofBitrh { get; set; }
        public string Gender { get; set; }

        public ICollection<Appointment> Appointments { get; set; }

        [NotMapped]
        public IFormFile? ProfilePictureFile { get; set; }

        
        public ICollection<Rating> Ratings { get; set; }
        public string? EmbeddingJson { get; set; }
    }

}
