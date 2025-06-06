using System;

namespace DoctorAppoitmentApi.Dto
{
    public class RatingResponseDto
    {
        public int Id { get; set; }
        public int Score { get; set; }
        public string Comment { get; set; }
        public DateTime CreatedAt { get; set; }
        public string PatientName { get; set; }
        public string PatientProfilePicture { get; set; }
        public int HelpfulCount { get; set; }
        public bool IsReported { get; set; }
        public string DoctorResponse { get; set; }
    }
}
