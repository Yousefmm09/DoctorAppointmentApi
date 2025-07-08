using System.ComponentModel.DataAnnotations;

namespace DoctorAppoitmentApi.Dto
{
    public class ForgotPasswordDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
    }
} 