namespace DoctorAppoitmentApi.Models
{
    public class UserAccount
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string Password { get; set; } 
        [Required]
        public string PhoneNumber { get; set; }
        public bool IsActive { get; set; }
        public string Role { get; set; }
        public string? ProfilePicture { get; set; }
        public DateTime DateOfBirth { get; set; }  
    }
}
