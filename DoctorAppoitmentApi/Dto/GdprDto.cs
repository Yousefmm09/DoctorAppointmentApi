using System;
using System.ComponentModel.DataAnnotations;

namespace DoctorAppoitmentApi.Dto
{
    public class GdprRequestDto
    {
        [Required]
        public string UserId { get; set; }

        [Required]
        [EmailAddress]
        public string UserEmail { get; set; }

        public string Reason { get; set; }
        
        public bool RemovalFlag { get; set; }
    }

    public class GdprForceRemovalDto
    {
        [Required]
        public string UserId { get; set; }

        [Required]
        [EmailAddress]
        public string UserEmail { get; set; }

        [Required]
        public bool AdminConfirmation { get; set; }

        public string RemovalReason { get; set; }
    }

    public class UserDataExportDto
    {
        public string UserId { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string AppointmentsHtml { get; set; }
    }
} 