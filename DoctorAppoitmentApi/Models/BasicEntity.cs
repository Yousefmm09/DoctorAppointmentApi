﻿

namespace DoctorAppoitmentApi.Models
{
    public class BasicEntity
    {
        public int Id { get; set; }
        [Required]
        [StringLength(50)]
        public string FirstName { get; set; }

        [Required]
        [StringLength(50)]
        public string LastName { get; set; }



    }
}
