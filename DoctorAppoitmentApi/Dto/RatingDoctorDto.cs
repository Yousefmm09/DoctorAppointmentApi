namespace DoctorAppoitmentApi.Dto
{
    public class RatingDoctorDto
    {
        public int DoctorId { get; set; }
        public int score { get; set; }
        public string? comment {  get; set; }
    }
}
