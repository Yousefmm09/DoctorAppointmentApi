using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Http;

namespace DoctorAppoitmentApi.Dto
{
    public class PatientProfileDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        public string? ProfilePicture { get; set; }

        public string? Address { get; set; }

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [NotMapped]
        public IFormFile? ProfilePictureFile { get; set; }

        [Required]
        public string City { get; set; } = string.Empty;

        [Required]
        public string ZipCode { get; set; } = string.Empty;
    }
}
