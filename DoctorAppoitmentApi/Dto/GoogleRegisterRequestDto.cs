namespace DoctorAppoitmentApi.Dto
{
    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;
    using Microsoft.AspNetCore.Http;

    public class GoogleRegisterRequestDto
    {
        [Required]
        public string IdToken { get; set; }   // التوكن من Google

        // بيانات شخصية
        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }

        // بيانات العنوان
        public string? Address { get; set; }

        [Required]
        public string City { get; set; } = string.Empty;

        [Required]
        public string ZipCode { get; set; } = string.Empty;

      

        [NotMapped]
        public IFormFile? ProfilePictureFile { get; set; }
    }

}
