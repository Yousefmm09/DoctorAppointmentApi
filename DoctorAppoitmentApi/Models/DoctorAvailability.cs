using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DoctorAppoitmentApi.Models
{
    public class DoctorAvailability
    {
        public int Id { get; set; }
        
        [Required]
        public int DoctorID { get; set; }
        
        [Required]
        [DataType(DataType.Date)]
        public DateTime Date { get; set; }
        
        [Required]
        [DataType(DataType.Time)]
        public TimeSpan StartTime { get; set; }
        
        [Required]
        [DataType(DataType.Time)]
        public TimeSpan EndTime { get; set; }
        
        public bool IsBooked { get; set; } = false;
        
        // Added to track if slot is deleted/disabled
        public bool IsActive { get; set; } = true;
        
        [ForeignKey("DoctorID")]
        public virtual Doctors Doctor { get; set; }
    }
} 