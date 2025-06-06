namespace DoctorAppoitmentApi.Models
{
    public class Rating
    {
        public int Id { get; set; }

        [Range(1, 5)]
        public int Score { get; set; }

        public string? Comment { get; set; }

        public DateTime CreatedAt { get; set; }

        public int DoctorId { get; set; }

        [ForeignKey("DoctorId")]
        public Doctors Doctor { get; set; }

        public int PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient Patient { get; set; }
    }

}
