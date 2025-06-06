using System;
using System.ComponentModel.DataAnnotations;

namespace DoctorAppoitmentApi.Models.DTOs
{
    public class UpdateAppointmentStatusDto
    {
        [Required]
        public string Status { get; set; }
        
        public DateTime? CompletionDate { get; set; }
        
        public string CancellationReason { get; set; }
        
        public string Notes { get; set; }
    }
} 