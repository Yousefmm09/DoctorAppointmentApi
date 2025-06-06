using System.Numerics;

namespace DoctorAppoitmentApi.Models
{
    public class Appointment
    {
        public int Id { get; set; }
        [Required]
        public int PatientID { get; set; }

        [Required]
        public int DoctorID { get; set; }

        [Required]
        [DataType(DataType.DateTime)]
        public DateTime AppointmentDate { get; set; }

        [DataType(DataType.Time)]
        public TimeSpan StartTime { get; set; }

        [DataType(DataType.Time)]
        public TimeSpan EndTime { get; set; }

        public string Status { get; set; }

        public string? Reason { get; set; } = string.Empty;

        public string? Notes { get; set; } = string.Empty;
        public string? AppointmentFee { get; set; } = "0";

        public bool IsConfirmed { get; set; } = false;

        [ForeignKey("PatientID")]
        public virtual Patient Patient { get; set; }

        [ForeignKey("DoctorID")]
        public  Doctors Doctor { get; set; }

        [NotMapped]
        public bool IsOverdue
        {
            get
            {
                var appointmentDateTime = AppointmentDate.Add(StartTime);
                return appointmentDateTime < DateTime.Now && Status != "Completed" && Status != "Cancelled";
            }
        }

        public bool IsValidTimeRange()
        {
            return StartTime < EndTime;
        }

    }
}