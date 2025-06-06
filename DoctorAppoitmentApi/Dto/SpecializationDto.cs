namespace DoctorAppoitmentApi.Dto
{
    public class SpecializationDto
    {
        public string Name { get; set; }
        [Required]
        [MaxLength(250)]
        public string Description { get; set; }
    }
}
