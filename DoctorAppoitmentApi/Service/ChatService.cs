using DoctorAppoitmentApi.Repository;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using DoctorAppoitmentApi.Service.Models;
using System.Text.RegularExpressions;
using DoctorAppoitmentApi.Data;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppoitmentApi.Service
{
    public class ChatService
    {
        private readonly IOpenAIService _openAIService;
        private readonly IDoctorRepository _doctorRepository;
        private readonly IMemoryCache _cache;
        private readonly ILogger<ChatService> _logger;
        private readonly ConcurrentDictionary<string, List<OpenAIChatMessage>> _conversationHistory;
        private readonly int _maxHistoryMessages;
        private readonly bool _enableFallback;
        private readonly AppDbContext _context;

        public ChatService(
            IOpenAIService openAIService,
            IDoctorRepository doctorRepository,
            IMemoryCache cache,
            AppDbContext context,
            ILogger<ChatService> logger = null)
        {
            _openAIService = openAIService;
            _doctorRepository = doctorRepository;
            _cache = cache;
            _logger = logger;
            _context = context;
            _conversationHistory = new ConcurrentDictionary<string, List<OpenAIChatMessage>>();
            _maxHistoryMessages = 10;
            _enableFallback = bool.Parse(_cache.GetOrCreate("EnableFallback", entry => {
                entry.SlidingExpiration = TimeSpan.FromMinutes(30);
                return "true";
            }));
        }

        public async Task<string> HandleUserMessageAsync(string message, string? userId = null)
        {
            if (string.IsNullOrEmpty(message))
            {
                return "Please provide a message. يرجى تقديم رسالة.";
            }

            try
            {
                // Check for specialty-related queries
                if (IsSpecialtyQuery(message))
                {
                    var specialtyResponse = await HandleSpecialtyQueryAsync(message);
                    if (!string.IsNullOrEmpty(specialtyResponse))
                    {
                        AddToConversationHistory(userId, "user", message);
                        AddToConversationHistory(userId, "assistant", specialtyResponse);
                        return specialtyResponse;
                    }
                }

                // Get conversation history
                var history = GetConversationHistory(userId);

                // Add system message if it's the first message
                if (!history.Any())
                {
                    var systemMessage = new OpenAIChatMessage
                    {
                        Role = "system",
                        Content = @"You are a medical assistant for a doctor appointment system. You can help with:
1. Finding doctors by specialty
2. Explaining medical specialties
3. Booking appointments
4. General medical information

Please provide responses in both Arabic and English. Be professional and accurate."
                    };
                    history.Add(systemMessage);
                }

                // Add user message to history
                AddToConversationHistory(userId, "user", message);

                // Get response from OpenAI
                string response = await _openAIService.GetChatResponseWithHistoryAsync(history);

                // Add assistant response to history
                AddToConversationHistory(userId, "assistant", response);

                return response;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in ChatService.HandleUserMessageAsync");
                return "An error occurred. Please try again. حدث خطأ. يرجى المحاولة مرة أخرى.";
            }
        }

        private bool IsSpecialtyQuery(string message)
        {
            message = message.ToLower();
            return message.Contains("تخصص") || 
                   message.Contains("تخصصات") || 
                   message.Contains("specialty") || 
                   message.Contains("specialties") ||
                   message.Contains("doctor") ||
                   message.Contains("دكتور") ||
                   message.Contains("طبيب");
        }

        private async Task<string> HandleSpecialtyQueryAsync(string message)
        {
            try
            {
                // Get all specializations
                var specializations = await _context.Specializations
                    .Include(s => s.Doctors)
                    .ToListAsync();

                if (!specializations.Any())
                {
                    return "No specialties found in our system. لم يتم العثور على تخصصات في نظامنا.";
                }

                // Format the response
                var response = new System.Text.StringBuilder();
                response.AppendLine("Available Medical Specialties | التخصصات الطبية المتوفرة:\n");

                foreach (var specialty in specializations)
                {
                    var doctorCount = specialty.Doctors?.Count ?? 0;
                    response.AppendLine($"- {specialty.Name}");
                    response.AppendLine($"  {specialty.Description}");
                    response.AppendLine($"  Number of doctors | عدد الأطباء: {doctorCount}\n");
                }

                // If the query is about a specific specialty
                var specificSpecialty = specializations
                    .FirstOrDefault(s => message.ToLower().Contains(s.Name.ToLower()));

                if (specificSpecialty != null)
                {
                    response.AppendLine($"\nDetails about {specificSpecialty.Name} | تفاصيل عن {specificSpecialty.Name}:");
                    response.AppendLine($"{specificSpecialty.Description}");

                    // Add doctors in this specialty
                    var doctors = await _context.Doctors
                        .Where(d => d.SpecializationID == specificSpecialty.Id)
                        .ToListAsync();

                    if (doctors.Any())
                    {
                        response.AppendLine($"\nDoctors in this specialty | الأطباء في هذا التخصص:");
                        foreach (var doctor in doctors)
                        {
                            response.AppendLine($"- Dr. {doctor.FirstName} {doctor.LastName}");
                            if (!string.IsNullOrEmpty(doctor.Description))
                                response.AppendLine($"  {doctor.Description}");
                        }
                    }
                }

                return response.ToString();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error handling specialty query");
                return "Error retrieving specialty information. Please try again. خطأ في استرجاع معلومات التخصصات. يرجى المحاولة مرة أخرى.";
            }
        }

        private List<OpenAIChatMessage> GetConversationHistory(string? userId)
        {
            if (string.IsNullOrEmpty(userId))
                return new List<OpenAIChatMessage>();

            return _conversationHistory.GetOrAdd(userId, _ => new List<OpenAIChatMessage>());
        }

        private void AddToConversationHistory(string? userId, string role, string content)
        {
            if (string.IsNullOrEmpty(userId))
                return;

            var history = _conversationHistory.GetOrAdd(userId, _ => new List<OpenAIChatMessage>());
            
            // Add new message
            history.Add(new OpenAIChatMessage { Role = role, Content = content });
            
            // Trim history if too long (keep most recent messages)
            if (history.Count > _maxHistoryMessages)
            {
                // Remove oldest messages (but keep system message if present)
                int startIndex = history.FindIndex(m => m.Role == "system") == 0 ? 1 : 0;
                int removeCount = history.Count - _maxHistoryMessages;
                if (removeCount > 0)
                {
                    history.RemoveRange(startIndex, removeCount);
                }
            }
        }

        public void ClearConversationHistory(string userId)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                _conversationHistory.TryRemove(userId, out _);
            }
        }

        public void ToggleFallbackMode(bool enable)
        {
            _cache.Set("EnableFallback", enable.ToString());
        }

        // New method to find doctors by specialty
        public async Task<List<Doctors>> FindDoctorsBySpecialtyAsync(string specialtyName)
        {
            try
            {
                string normalizedSpecialty = specialtyName.ToLower().Trim();
                
                // Get all doctors with this specialty
                var doctors = await _doctorRepository.FindAllDoctorsBySpecialtyNameAsync(normalizedSpecialty);
                
                // Log the result for debugging
                _logger?.LogInformation("Found {Count} doctors for specialty '{Specialty}'", 
                                      doctors?.Count() ?? 0, specialtyName);
                
                return doctors?.ToList() ?? new List<Doctors>();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error finding doctors by specialty: {Specialty}", specialtyName);
                return new List<Doctors>();
            }
        }
        
        // New method to get information about a specialty
        public async Task<string> GetSpecialtyInfoAsync(string specialtyName)
        {
            try
            {
                string normalizedSpecialty = specialtyName.ToLower().Trim();
                
                // Map common terms to actual specialties
                Dictionary<string, string> specialtyMap = new Dictionary<string, string>
                {
                    { "قلب", "أمراض القلب" },
                    { "heart", "أمراض القلب" },
                    { "cardio", "أمراض القلب" },
                    { "جلد", "الأمراض الجلدية" },
                    { "جلدية", "الأمراض الجلدية" },
                    { "بشرة", "الأمراض الجلدية" },
                    { "derma", "الأمراض الجلدية" },
                    { "skin", "الأمراض الجلدية" },
                    { "عظام", "جراحة العظام" },
                    { "ortho", "جراحة العظام" },
                    { "bone", "جراحة العظام" },
                    { "أطفال", "طب الأطفال" },
                    { "اطفال", "طب الأطفال" },
                    { "pedia", "طب الأطفال" },
                    { "نساء", "أمراض النساء والتوليد" },
                    { "توليد", "أمراض النساء والتوليد" },
                    { "ولادة", "أمراض النساء والتوليد" },
                    { "gyn", "أمراض النساء والتوليد" },
                    { "عيون", "طب وجراحة العيون" },
                    { "eye", "طب وجراحة العيون" },
                    { "opht", "طب وجراحة العيون" },
                    { "أسنان", "طب الأسنان" },
                    { "اسنان", "طب الأسنان" },
                    { "dent", "طب الأسنان" },
                    { "باطنة", "الطب الباطني" },
                    { "internal", "الطب الباطني" },
                    { "مخ", "المخ والأعصاب" },
                    { "أعصاب", "المخ والأعصاب" },
                    { "neuro", "المخ والأعصاب" }
                };
                
                // Find matching specialty name
                string matchedSpecialty = null;
                foreach (var entry in specialtyMap)
                {
                    if (normalizedSpecialty.Contains(entry.Key))
                    {
                        matchedSpecialty = entry.Value;
                        break;
                    }
                }
                
                if (matchedSpecialty == null)
                {
                    return null;
                }
                
                // Get count of doctors with this specialty
                var doctorsCount = await _doctorRepository.CountDoctorsBySpecialtyNameAsync(matchedSpecialty);
                
                if (doctorsCount > 0)
                {
                    return $"لدينا {doctorsCount} من الأطباء المتخصصين في {matchedSpecialty}. يمكنك تصفح القسم واختيار الطبيب المناسب لحالتك.";
                }
                else
                {
                    return $"نأسف، لا يتوفر حالياً أطباء متخصصون في {matchedSpecialty}. يرجى البحث عن تخصص آخر أو الاتصال بخدمة العملاء للمساعدة.";
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error getting specialty info: {Specialty}", specialtyName);
                return null;
            }
        }

        // Helper method to check if message contains a specialty reference
        private bool ContainsSpecialty(string message, out string specialtyName)
        {
            Dictionary<string, List<string>> specialtyTerms = new Dictionary<string, List<string>>
            {
                { "أمراض القلب", new List<string> { "قلب", "قلبية", "heart", "cardio" } },
                { "طب الأطفال", new List<string> { "طفل", "اطفال", "أطفال", "children", "pedia" } },
                { "الأمراض الجلدية", new List<string> { "جلد", "جلدية", "بشرة", "skin", "derma" } },
                { "أمراض النساء والتوليد", new List<string> { "نساء", "توليد", "ولادة", "gyn" } },
                { "طب وجراحة العيون", new List<string> { "عيون", "عين", "نظر", "eye" } },
                { "طب الأسنان", new List<string> { "اسنان", "أسنان", "سن", "دنت", "dent" } },
                { "جراحة العظام", new List<string> { "عظام", "عظم", "مفاصل", "كسور", "ortho" } },
                { "الطب الباطني", new List<string> { "باطنة", "باطني", "داخلي", "internal" } },
                { "المخ والأعصاب", new List<string> { "مخ", "اعصاب", "أعصاب", "عصبي", "دماغ", "neuro" } }
            };
            
            foreach (var specialty in specialtyTerms)
            {
                foreach (var term in specialty.Value)
                {
                    if (message.Contains(term))
                    {
                        specialtyName = specialty.Key;
                        return true;
                    }
                }
            }
            
            specialtyName = string.Empty;
            return false;
        }
    }
}
