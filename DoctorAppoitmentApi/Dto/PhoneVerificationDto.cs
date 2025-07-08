using System.ComponentModel.DataAnnotations;

namespace DoctorAppoitmentApi.Dto
{
    public class PhoneVerificationDto
    {
        [Required]
        public string UserId { get; set; }
        
        [Required]
        public string UserType { get; set; } // "Patient" or "Doctor"
        
        [Required]
        [Phone]
        public string NewPhoneNumber { get; set; }
    }

    public class VerifyPhoneCodeDto
    {
        [Required]
        public string UserId { get; set; }
        
        [Required]
        public string UserType { get; set; } // "Patient" or "Doctor"
        
        [Required]
        [Phone]
        public string NewPhoneNumber { get; set; }
        
        [Required]
        public string VerificationCode { get; set; }
    }
} 