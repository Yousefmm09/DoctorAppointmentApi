using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace DoctorAppoitmentApi.Dto
{
    public class DoctorAvailabilityDto
    {
        [Required]
        public int DoctorId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public TimeSpan StartTime { get; set; }
        
        [Required]
        public TimeSpan EndTime { get; set; }
    }
    
    public class DoctorAvailabilityResponseDto
    {
        public int Id { get; set; }
        public int DoctorId { get; set; }
        public string DoctorName { get; set; }
        public DateTime Date { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public bool IsBooked { get; set; }
    }
    
    public class DoctorWeeklyAvailabilityDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<DoctorAvailabilityResponseDto> AvailableSlots { get; set; }
    }
    
    public class DeleteAvailabilityDto
    {
        [Required]
        public int AvailabilityId { get; set; }
    }
} 