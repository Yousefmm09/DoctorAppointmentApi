namespace DoctorAppoitmentApi.Models
{
    public class Notification : BasicEntity
    {
        [Required]
        public int UserAccountId { get; set; }

        [Required]
        public string Message { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public UserAccount UserAccount { get; set; }
    }
}
