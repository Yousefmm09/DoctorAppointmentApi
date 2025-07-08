using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

        [Required]
        public string FirstName { get; set; } = "Patient";

        [Required]
        public string LastName { get; set; } = "User";

        public UserAccount UserAccount { get; set; }

        [ForeignKey("AppointmentId")]
        public Appointment Appointment { get; set; }
    }
}
