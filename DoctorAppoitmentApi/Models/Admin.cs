namespace DoctorAppoitmentApi.Models
{
    public class Admin 
    {
        [Key]
       public int Id { get; set; }
        [Required]

        public string Name { get; set; }

        [Required]
        public int UserAccountId { get; set; }

        public string Department { get; set; }

        // Navigation properties
        [ForeignKey("UserAccountId")]
        public virtual UserAccount UserAccount { get; set; }
    }
}
