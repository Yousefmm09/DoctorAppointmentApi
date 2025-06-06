using DoctorAppointmentApi.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace DoctorAppoitmentApi.Data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public DbSet<UserAccount> UserAccounts { get; set; }
        public DbSet<Patient> Patients { get; set; }
        public DbSet<Doctors> Doctors { get; set; }
        public DbSet<Clinics> Clinics { get; set; }
        public DbSet<Specialization> Specializations { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Rating> Ratings { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatBotMessage> chatBotMessages { get; set; }
        public DbSet<DoctorAvailability> DoctorAvailabilities { get; set; }
        
        public AppDbContext()
        {
        }
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {

        }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {


            modelBuilder.Entity<Doctors>()
                .HasOne(d => d.Specialization)
                .WithMany(s => s.Doctors)
                .HasForeignKey(d => d.SpecializationID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Doctors>()
                .HasOne(d => d.Clinic)
                .WithMany(c => c.Doctors)
                .HasForeignKey(d => d.ClinicID)
                .OnDelete(DeleteBehavior.Restrict);


            modelBuilder.Entity<Appointment>()
                .HasOne(a => a.Doctor)
                .WithMany(d => d.Appointments)
                .HasForeignKey(a => a.DoctorID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Appointment>()
                .Property(a => a.Status)
                .HasMaxLength(20)
                .IsRequired();

            modelBuilder.Entity<Appointment>()
                .HasIndex(a => new { a.DoctorID, a.AppointmentDate, a.StartTime })
                .IsUnique();

            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Patient>()
           .HasOne(p => p.ApplicationUser)
           .WithMany()
           .HasForeignKey(p => p.ApplicationUserId)
           .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Doctors>()
              .HasOne(d => d.ApplicationUser)
              .WithOne()
              .HasForeignKey<Doctors>(d => d.ApplicationUserId)
              .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Rating>()
         .HasOne(r => r.Patient)
         .WithMany(p => p.Ratings)
         .HasForeignKey(r => r.PatientId)
         .OnDelete(DeleteBehavior.NoAction); 

           
            modelBuilder.Entity<Rating>()
                .HasOne(r => r.Doctor)
                .WithMany(d => d.Ratings)
                .HasForeignKey(r => r.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(s => s.DoctorSender)
                .WithMany()
                .HasForeignKey(s => s.DoctorSenderId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ChatMessage>()
                .HasOne(s => s.PatientSender)
                .WithMany()
                .HasForeignKey(s => s.PatientSenderId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ChatMessage>()
       .HasOne(m => m.DoctorReceiver)
       .WithMany()
       .HasForeignKey(m => m.DoctorReceiverId)
       .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.PatientReceiver)
                .WithMany()
                .HasForeignKey(m => m.PatientReceiverId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ChatMessage>()
      .HasIndex(m => m.DoctorSenderId);
            modelBuilder.Entity<ChatMessage>()
                .HasIndex(m => m.PatientSenderId);
            modelBuilder.Entity<ChatMessage>()
                .HasIndex(m => m.DoctorReceiverId);
            modelBuilder.Entity<ChatMessage>()
                .HasIndex(m => m.PatientReceiverId);
            modelBuilder.Entity<ChatMessage>()
                .HasIndex(m => m.Timestamp);

            modelBuilder.Entity<DoctorAvailability>()
                .HasOne(da => da.Doctor)
                .WithMany()
                .HasForeignKey(da => da.DoctorID)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DoctorAvailability>()
                .HasIndex(da => new { da.DoctorID, da.Date, da.StartTime, da.EndTime })
                .IsUnique()
                .HasFilter("IsActive = 1");
        }



    }
}

