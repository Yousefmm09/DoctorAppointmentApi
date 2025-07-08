using System.Text;
using DoctorAppoitmentApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace DoctorAppoitmentApi.Service
{
    public interface IRAGService
    {
        Task<string> GetRelevantContext(string userQuery);
        Task<(bool hasRelevantInfo, string medicalInformation)> GetMedicalInformation(string condition);
        Task<List<string>> GetRelatedMedicalTopics(string query);
    }

    public class RAGService : IRAGService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RAGService> _logger;
        private readonly Dictionary<string, string> _medicalKnowledge;

        public RAGService(AppDbContext context, ILogger<RAGService> logger)
        {
            _context = context;
            _logger = logger;
            _medicalKnowledge = InitializeMedicalKnowledge();
        }

        private Dictionary<string, string> InitializeMedicalKnowledge()
        {
            // This would ideally be loaded from a database or external knowledge source
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                // Common medical conditions
                ["diabetes"] = "Diabetes is a chronic condition characterized by high levels of sugar (glucose) in the blood. It occurs when the pancreas doesn't produce enough insulin or when the body cannot effectively use the insulin it produces.",
                ["hypertension"] = "Hypertension, or high blood pressure, is a common condition where the long-term force of blood against artery walls is high enough to eventually cause health problems like heart disease.",
                ["migraine"] = "Migraines are recurring headaches that cause moderate to severe throbbing or pulsing pain, typically on one side of the head. Symptoms often include sensitivity to light and sound, nausea, and vomiting.",
                ["asthma"] = "Asthma is a chronic condition affecting the airways. During an asthma attack, the lining of the bronchial tubes swells, narrowing the airways and reducing airflow to the lungs.",
                
                // Common symptoms
                ["fever"] = "Fever is a temporary increase in body temperature, often due to an illness. A fever is usually a sign that the body is fighting an infection or illness.",
                ["cough"] = "Coughing is a reflex action to clear the airways of mucus and irritants. Persistent coughing may be a symptom of various conditions including respiratory infections, allergies, or more serious conditions.",
                ["headache"] = "Headaches can range from mild to severe pain and can occur in different parts of the head. Common types include tension headaches, migraines, and cluster headaches.",
                ["fatigue"] = "Fatigue is extreme tiredness that doesn't improve with rest. It can be a symptom of various medical conditions including anemia, depression, or chronic fatigue syndrome.",
                
                // Medical specialties
                ["cardiology"] = "Cardiology is the study and treatment of disorders of the heart and blood vessels. Cardiologists diagnose and treat conditions like heart attacks, heart failure, and arrhythmias.",
                ["neurology"] = "Neurology is the branch of medicine dealing with disorders of the nervous system. Neurologists treat conditions like stroke, multiple sclerosis, and epilepsy.",
                ["dermatology"] = "Dermatology is the branch of medicine dealing with the skin. Dermatologists treat conditions like acne, eczema, psoriasis, and skin cancer.",
                ["orthopedics"] = "Orthopedics is the branch of medicine concerned with the correction of deformities or functional impairments of the skeletal system and associated structures.",
                
                // Arabic entries
                ["سكري"] = "مرض السكري هو حالة مزمنة تتميز بارتفاع مستويات السكر (الجلوكوز) في الدم. يحدث عندما لا ينتج البنكرياس ما يكفي من الأنسولين أو عندما لا يستطيع الجسم استخدام الأنسولين الذي ينتجه بشكل فعال.",
                ["ضغط الدم"] = "ارتفاع ضغط الدم هو حالة شائعة حيث تكون قوة الدم المستمرة ضد جدران الشرايين مرتفعة بما يكفي لتسبب مشاكل صحية في النهاية مثل أمراض القلب.",
                ["صداع نصفي"] = "الصداع النصفي هو صداع متكرر يسبب ألمًا نابضًا متوسطًا إلى شديدًا، عادة على جانب واحد من الرأس. غالبًا ما تشمل الأعراض الحساسية للضوء والصوت والغثيان والقيء.",
                ["ربو"] = "الربو هو حالة مزمنة تؤثر على المسالك الهوائية. أثناء نوبة الربو، تنتفخ بطانة الشعب الهوائية، مما يؤدي إلى تضييق المسالك الهوائية وتقليل تدفق الهواء إلى الرئتين."
            };
        }

        public async Task<string> GetRelevantContext(string userQuery)
        {
            var contextBuilder = new StringBuilder();

            try
            {
                // Normalize query for better matching
                var normalizedQuery = userQuery.ToLower();

                // Check for medical information in the knowledge base
                var medicalInfoResult = await GetMedicalInformation(normalizedQuery);
                if (medicalInfoResult.hasRelevantInfo)
                {
                    contextBuilder.AppendLine("Medical Information:");
                    contextBuilder.AppendLine(medicalInfoResult.medicalInformation);
                    contextBuilder.AppendLine();
                }

                // Check if query is about doctors
                if (normalizedQuery.Contains("doctor") || normalizedQuery.Contains("specialist") || 
                    normalizedQuery.Contains("physician") || normalizedQuery.Contains("طبيب") || 
                    normalizedQuery.Contains("دكتور") || normalizedQuery.Contains("اخصائي"))
                {
                    // Get specialty from query if possible
                    string specialty = null;
                    if (normalizedQuery.Contains("cardio") || normalizedQuery.Contains("heart") || normalizedQuery.Contains("قلب"))
                        specialty = "Cardiology";
                    else if (normalizedQuery.Contains("neuro") || normalizedQuery.Contains("brain") || normalizedQuery.Contains("nerve") || normalizedQuery.Contains("أعصاب"))
                        specialty = "Neurology";
                    else if (normalizedQuery.Contains("derma") || normalizedQuery.Contains("skin") || normalizedQuery.Contains("جلدية"))
                        specialty = "Dermatology";
                    else if (normalizedQuery.Contains("ortho") || normalizedQuery.Contains("bone") || normalizedQuery.Contains("عظام"))
                        specialty = "Orthopedics";
                    
                    // Query doctors based on specialty if provided
                    IQueryable<Doctors> doctorsQuery = _context.Doctors.Include(d => d.Specialization);
                    if (!string.IsNullOrEmpty(specialty))
                    {
                        doctorsQuery = doctorsQuery.Where(d => d.Specialization.Name.Contains(specialty));
                    }
                    
                    var doctors = await doctorsQuery.Take(5).ToListAsync();

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
                        .OrderBy(a => a.AppointmentDate)
                        .Take(5)
                        .ToListAsync();

                    if (appointments.Any())
                    {
                        contextBuilder.AppendLine("\nNext available appointments:");
                        foreach (var appointment in appointments)
                        {
                            contextBuilder.AppendLine($"- {appointment.AppointmentDate:yyyy-MM-dd HH:mm} with Dr. {appointment.Doctor?.FirstName} {appointment.Doctor?.LastName}");
                            contextBuilder.AppendLine($"  Status: {appointment.Status}");
                        }
                    }
                    
                    // Add booking instructions
                    contextBuilder.AppendLine("\nBooking instructions:");
                    contextBuilder.AppendLine("- To book an appointment, specify the doctor, date, and time.");
                    contextBuilder.AppendLine("- Appointments can be made up to 30 days in advance.");
                    contextBuilder.AppendLine("- Cancellations must be made at least 24 hours before the appointment.");
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
                
                // Check if query is about symptoms
                if (normalizedQuery.Contains("symptom") || normalizedQuery.Contains("pain") || 
                    normalizedQuery.Contains("ache") || normalizedQuery.Contains("hurt") || 
                    normalizedQuery.Contains("وجع") || normalizedQuery.Contains("ألم") ||
                    normalizedQuery.Contains("اعراض"))
                {
                    // Add general symptom guidance
                    contextBuilder.AppendLine("\nSymptom Guidance:");
                    contextBuilder.AppendLine("- For persistent or severe symptoms, please consult a doctor.");
                    contextBuilder.AppendLine("- Our system can help identify potential specialties based on symptoms.");
                    contextBuilder.AppendLine("- Emergency symptoms like severe chest pain, difficulty breathing, or severe bleeding require immediate medical attention.");
                }

                // Add general information about working hours and contact
                contextBuilder.AppendLine("\nGeneral Information:");
                contextBuilder.AppendLine("- Working hours: Monday to Friday, 9:00 AM to 5:00 PM");
                contextBuilder.AppendLine("- Emergency contact: Available 24/7");
                contextBuilder.AppendLine("- Booking methods: Online, Phone, or In-person");
                contextBuilder.AppendLine("- Our medical chatbot can answer general questions about health conditions, medications, and treatments");

                return contextBuilder.ToString().Trim();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving context for query: {Query}", userQuery);
                return string.Empty;
            }
        }
        
        public async Task<(bool hasRelevantInfo, string medicalInformation)> GetMedicalInformation(string condition)
        {
            try
            {
                // Normalize the condition for matching
                condition = condition.ToLower();
                
                // Check for exact match in medical knowledge
                foreach (var entry in _medicalKnowledge)
                {
                    if (condition.Contains(entry.Key.ToLower()))
                    {
                        return (true, entry.Value);
                    }
                }
                
                // If no exact match, try to find related information
                var relatedTopics = await GetRelatedMedicalTopics(condition);
                if (relatedTopics.Any())
                {
                    var sb = new StringBuilder();
                    sb.AppendLine("Related medical topics:");
                    foreach (var topic in relatedTopics.Take(3))
                    {
                        if (_medicalKnowledge.TryGetValue(topic, out var info))
                        {
                            sb.AppendLine($"- {topic}: {info}");
                        }
                    }
                    
                    if (sb.Length > "Related medical topics:".Length + 2)
                    {
                        return (true, sb.ToString());
                    }
                }
                
                return (false, string.Empty);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving medical information for condition: {Condition}", condition);
                return (false, string.Empty);
            }
        }
        
        public async Task<List<string>> GetRelatedMedicalTopics(string query)
        {
            // Simple keyword matching for now - could be enhanced with embeddings/vector search
            var normalizedQuery = query.ToLower();
            var relatedTopics = new List<string>();
            
            foreach (var key in _medicalKnowledge.Keys)
            {
                // Check if any word from the key matches any word in the query
                var keyWords = key.ToLower().Split(' ', '-', '_');
                var queryWords = normalizedQuery.Split(' ', '-', '_');
                
                if (keyWords.Any(kw => queryWords.Any(qw => qw.Contains(kw) || kw.Contains(qw))))
                {
                    relatedTopics.Add(key);
                }
            }
            
            return relatedTopics;
        }
    }
} 