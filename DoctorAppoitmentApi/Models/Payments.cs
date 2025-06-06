
using System.ComponentModel;

namespace DoctorAppoitmentApi.Models
{

    public class Payment : BasicEntity
    {
        [Required]
        public int UserAccountId { get; set; }

        [Required]
        public int AppointmentId { get; set; }

        [Required]
        public double Amount { get; set; }

        [Required]
        public string PaymentMethod { get; set; }

        [Required]
        [DefaultValue("Unknown")]
        public string TransactionId { get; set; }

        public string Status { get; set; }

        public DateTime PaymentDate { get; set; } = DateTime.Now;

        public UserAccount UserAccount { get; set; }

        public Appointment Appointment { get; set; }
    }
}
