using System.Text.Json.Serialization;

namespace DoctorAppoitmentApi.Models
{
    public class Specialization
    {
        public int Id { get; set; }
        public string Name { get; set; }
        [Required]
        [MaxLength(250)]
        public string Description { get; set; }
        public ICollection<Doctors> Doctors { get; set; }

    }
}