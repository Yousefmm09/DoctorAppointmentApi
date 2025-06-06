namespace DoctorAppoitmentApi.Dto
{
    public class ShowAllDoctor
    {
        public int Id { get; set; }

        public string? ProfilePicture { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? Description { get; set; }
        public string? Qualification { get; set; }
        public string? LicenseNumber { get; set; }
        public int SpecializationID { get; set; }
        public int ClinicID { get; set; }
    }
}
