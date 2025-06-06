using System.Text;
using DoctorAppoitmentApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DoctorAppoitmentApi.Service
{
    public interface IRAGService
    {
        Task<string> GetRelevantContext(string userQuery);
    }

    public class RAGService : IRAGService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RAGService> _logger;

        public RAGService(AppDbContext context, ILogger<RAGService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<string> GetRelevantContext(string userQuery)
        {
            var contextBuilder = new StringBuilder();

            try
            {
                // Normalize query for better matching
                var normalizedQuery = userQuery.ToLower();

                // Check if query is about doctors
                if (normalizedQuery.Contains("doctor") || normalizedQuery.Contains("specialist") || 
                    normalizedQuery.Contains("physician") || normalizedQuery.Contains("طبيب") || 
                    normalizedQuery.Contains("دكتور") || normalizedQuery.Contains("اخصائي"))
                {
                    var doctors = await _context.Doctors
                        .Include(d => d.Specialization)
                        .Take(5)
                        .ToListAsync();

                    if (doctors.Any())
                    {
                        contextBuilder.AppendLine("Available doctors:");
                        foreach (var doctor in doctors)
                        {
                            contextBuilder.AppendLine($"- Dr. {doctor.FirstName} {doctor.LastName}, {doctor.Specialization?.Name ?? "General"}, Experience: {doctor.Experience} years");
                        }
                    }
                }

                // Check if query is about appointments
                if (normalizedQuery.Contains("appointment") || normalizedQuery.Contains("booking") || 
                    normalizedQuery.Contains("schedule") || normalizedQuery.Contains("موعد") || 
                    normalizedQuery.Contains("حجز"))
                {
                    var appointments = await _context.Appointments
                        .Include(a => a.Doctor)
                        .Where(a => a.AppointmentDate > DateTime.Now)
                        .Take(5)
                        .ToListAsync();

                    if (appointments.Any())
                    {
                        contextBuilder.AppendLine("\nNext available appointments:");
                        foreach (var appointment in appointments)
                        {
                            contextBuilder.AppendLine($"- {appointment.AppointmentDate:yyyy-MM-dd HH:mm} with Dr. {appointment.Doctor?.FirstName} {appointment.Doctor?.LastName}");
                        }
                    }
                }

                // Check if query is about specializations
                if (normalizedQuery.Contains("specialist") || normalizedQuery.Contains("department") || 
                    normalizedQuery.Contains("specialization") || normalizedQuery.Contains("تخصص") || 
                    normalizedQuery.Contains("قسم"))
                {
                    var specializations = await _context.Specializations
                        .Take(10)
                        .ToListAsync();

                    if (specializations.Any())
                    {
                        contextBuilder.AppendLine("\nAvailable specializations:");
                        foreach (var spec in specializations)
                        {
                            contextBuilder.AppendLine($"- {spec.Name}");
                        }
                    }
                }

                // Add general information about working hours and contact
                contextBuilder.AppendLine("\nGeneral Information:");
                contextBuilder.AppendLine("- Working hours: Monday to Friday, 9:00 AM to 5:00 PM");
                contextBuilder.AppendLine("- Emergency contact: Available 24/7");
                contextBuilder.AppendLine("- Booking methods: Online, Phone, or In-person");

                return contextBuilder.ToString().Trim();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving context for query: {Query}", userQuery);
                return string.Empty;
            }
        }
    }
} 