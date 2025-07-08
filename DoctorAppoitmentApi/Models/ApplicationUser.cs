using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DoctorAppoitmentApi.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? Address { get; set; }

        [Required]
        public string FirstName { get; set; }

        [Required]
        public string LastName { get; set; }

        public string? ProfilePicture { get; set; }

        // PhoneNumber is already in IdentityUser base class, so no need to redeclare it
        // public string PhoneNumber { get; set; }

        [Required]
        public string Gender { get; set; }

        [Required]
        public DateTime DateOfBirth { get; set; }

        [NotMapped]
        public IFormFile? ProfilePictureFile { get; set; }

        // GDPR data removal tracking
        public DateTime? DeletionRequestedAt { get; set; }
        
        // Track account creation date
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}