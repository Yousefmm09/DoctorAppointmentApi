namespace DoctorAppoitmentApi.Dto
{
    public class DoctorProfileDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string ProfilePicture { get; set; }
        public string currentFee { get; set; }
       public string Experience { get; set; }
        public IFormFile ProfilePictureFile { get; set; }
        public string Address { get; set; }
        public DateTime? DateofBitrh { get; set; }
        public string Qualification { get; set; }
        public string ClinicName { get; set; }
        public string? ClinicAddress { get; set; }
        public string? ClinicPhoneNumber { get; set; }
        public string? Description { get; set; }
        public string? LicenseNumber { get; set; }
        public TimeSpan? OpeningTime { get; set; }
        public TimeSpan? ClosingTime { get; set; }
    }

}
