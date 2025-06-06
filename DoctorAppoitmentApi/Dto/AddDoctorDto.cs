using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DoctorAppoitmentApi.Dto
{
    public class AddDoctorDto
    {
        [Required]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }

        [Required]
        public string PhoneNumber { get; set; }

        [Required]
        public string FirstName { get; set; }

        [Required]
        public string LastName { get; set; }

        public string? ProfilePicture { get; set; }

        public string Address { get; set; }
        public string Description { get; set; }
        public int LicenseNumber { get; set; }
        public string Qualification { get; set; }
        public string Experience { get; set; }
        public string CurrentFee { get; set; }

        [Required]
        public int SpecializationID { get; set; }

        [Required]
        public int ClinicID { get; set; }

        [NotMapped]
        public IFormFile? ProfilePictureFile { get; set; }
       

    }
}
