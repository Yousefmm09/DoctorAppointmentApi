namespace DoctorAppoitmentApi.Dto
{
    public class DoctorRegistrationDto
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public string Gender { get; set; }
        public DateTime DateOfBirth { get; set; }
        public IFormFile ProfilePictureFile { get; set; }
        public int? SpecializationId { get; set; }
        public ClinicDto Clinic { get; set; }





        [MaxLength(250)]
        public string Description { get; set; }
        public string Qualification { get; set; }
        public string Experience { get; set; }
        public string CurrentFee { get; set; }
    }

}
