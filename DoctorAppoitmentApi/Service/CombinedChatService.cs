using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Text;
using System.Collections.Generic;
using DoctorAppoitmentApi.Repository;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using Microsoft.Extensions.Logging.Console;

namespace DoctorAppoitmentApi.Service
{
    public class CombinedChatService : ICombinedChatService
    {
        private readonly IOpenAIService _openAIService;
        private readonly ChatService _chatService;
        private readonly ILogger<CombinedChatService> _logger;
        private readonly IMemoryCache _cache;
        private readonly IDoctorRepository _doctorRepository;
        private readonly AdvancedOpenAIService _advancedOpenAIService;
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;
        private readonly ILocalKnowledgeBase _localKnowledgeBase;

        public CombinedChatService(
            IOpenAIService openAIService,
            IDoctorRepository doctorRepository,
            IMemoryCache cache,
            AppDbContext context,
            IConfiguration config,
            HttpClient httpClient,
            ILogger<CombinedChatService> logger = null)
        {
            _openAIService = openAIService;
            _cache = cache;
            _logger = logger;
            _doctorRepository = doctorRepository;
            _config = config;
            _httpClient = httpClient;
            _chatService = new ChatService(openAIService, doctorRepository, cache, context, null);
            _advancedOpenAIService = new AdvancedOpenAIService(httpClient, config, cache, null);
            var localKnowledgeBaseLogger = logger != null ? LoggerFactory.Create(builder => builder.AddConsole()).CreateLogger<LocalKnowledgeBase>() : null;
            _localKnowledgeBase = new LocalKnowledgeBase(doctorRepository, context, localKnowledgeBaseLogger);
        }

        public async Task<string> HandleUserMessageAsync(string message, string? userId = null)
        {
            try
            {
                if (string.IsNullOrEmpty(message))
                {
                    return "Please provide a message. الرجاء كتابة رسالة.";
                }

                // Detect appointment scheduling intent
                if (await DetectAppointmentSchedulingIntent(message))
                {
                    return await HandleAppointmentScheduling(message, userId);
                }

                // First check if this is a greeting and respond with a personalized greeting
                if (Regex.IsMatch(message, @"^(hi|hello|مرحبا|السلام عليكم|صباح الخير|مساء الخير|اهلا)", RegexOptions.IgnoreCase))
                {
                    return await _localKnowledgeBase.GetEmpatheticGreetingAsync(userId);
                }

                // Check if the message is about symptoms or medical condition
                if (Regex.IsMatch(message, @"عندي|أشعر|مريض|الم|وجع|صداع|حمى|مشكلة صحية|اعاني", RegexOptions.IgnoreCase))
                {
                    // Use enhanced medical advice that includes personalization, urgency assessment, and recommended doctors
                    var (matched, enhancedResponse, followUpQuestions) = await _localKnowledgeBase.GetEnhancedMedicalAdviceAsync(message, userId);
                    if (matched)
                    {
                        // If we have follow-up questions, add them to the response
                        if (followUpQuestions.Any())
                        {
                            enhancedResponse += "\n\nلفهم حالتك بشكل أفضل، هل يمكنك الإجابة على الأسئلة التالية:\n";
                            foreach (var question in followUpQuestions.Take(3))
                            {
                                enhancedResponse += $"- {question}\n";
                            }
                        }
                        
                        return enhancedResponse;
                    }
                }

                // Try the regular knowledge base response
                var (basicMatched, localResponse) = await _localKnowledgeBase.GetResponseAsync(message, userId);
                if (basicMatched)
                {
                    // Get suggested follow-up questions
                    var suggestions = await _localKnowledgeBase.GetSuggestedQuestionsAsync(message);
                    if (suggestions.Any())
                    {
                        localResponse += "\n\nأسئلة مقترحة:\n";
                        foreach (var suggestion in suggestions.Take(3))
                        {
                            localResponse += $"- {suggestion}\n";
                        }
                    }
                    return localResponse;
                }

                // Check for patient-specific queries
                if (!string.IsNullOrEmpty(userId))
                {
                    var (patientMatched, patientResponse) = await _localKnowledgeBase.GetPatientSpecificResponseAsync(message, userId);
                    if (patientMatched)
                    {
                        return patientResponse;
                    }
                }

                // Get relevant context for the query
                string context = string.Empty;
                try 
                {
                    context = await GetRelevantContextForQuery(message, userId);
                } 
                catch (Exception ex) 
                {
                    _logger?.LogError(ex, "Error getting context for query");
                    // Continue anyway, just without context
                }

                // Prepare enhanced system prompt with context
                string enhancedSystemPrompt = PrepareSystemPromptWithContext(context, message);

                // Try advanced OpenAI service with enhanced prompt
                try
                {
                    var messages = new List<Service.Models.OpenAIChatMessage> 
                    {
                        new Service.Models.OpenAIChatMessage { Role = "system", Content = enhancedSystemPrompt },
                        new Service.Models.OpenAIChatMessage { Role = "user", Content = message }
                    };
                    
                    var response = await _advancedOpenAIService.GetChatResponseWithHistoryAsync(messages);
                    
                    if (!string.IsNullOrEmpty(response))
                    {
                        // Cache successful responses
                        var cacheKey = $"chat_response_{message.GetHashCode()}";
                        _cache.Set(cacheKey, response, TimeSpan.FromHours(24));
                        
                        // Check if response should be enhanced with follow-up questions
                        if (ShouldAddFollowUpQuestions(message, response))
                        {
                            var suggestedQuestions = await _localKnowledgeBase.GetSuggestedQuestionsAsync(message);
                            if (suggestedQuestions.Any())
                            {
                                response += isArabic(message) 
                                    ? "\n\nأسئلة متابعة مقترحة:\n" 
                                    : "\n\nSuggested follow-up questions:\n";
                                    
                                foreach (var question in suggestedQuestions.Take(3))
                                {
                                    response += $"- {question}\n";
                                }
                            }
                        }
                        
                        return response;
                    }
                }
                catch (UnauthorizedAccessException)
                {
                    _logger?.LogError("OpenAI API key is invalid or missing");
                    // Fall through to basic chat service
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Error with advanced OpenAI service, falling back to basic service");
                }

                // Fall back to basic chat service
                try
                {
                    var basicResponse = await _chatService.HandleUserMessageAsync(message, userId);
                    if (!string.IsNullOrEmpty(basicResponse))
                    {
                        return basicResponse;
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Error with basic chat service");
                }

                // If all else fails, return a helpful default response with empathetic touch
                return "أنا آسف لعدم فهمي لاستفسارك بشكل كامل. يمكنك محاولة إعادة صياغة سؤالك أو اختيار من الأسئلة الشائعة التالية:\n\n" +
                       "- كيف أحجز موعد مع طبيب مختص؟\n" +
                       "- ما هي التخصصات الطبية المتوفرة؟\n" +
                       "- كيف يمكنني الوصول إلى سجلي الطبي؟\n" +
                       "- ما هي مواعيد عمل العيادة؟\n\n" +
                       "أنا هنا لمساعدتك، فلا تتردد في طرح أي سؤال آخر.";
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in HandleUserMessageAsync");
                return "للأسف حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى بعد قليل. نحن نعتذر عن هذا الانقطاع.";
            }
        }

        private async Task<bool> DetectAppointmentSchedulingIntent(string message)
        {
            // Simple pattern matching for appointment scheduling intent
            string[] appointmentKeywords = new[] {
                "book", "schedule", "appointment", "reservation", 
                "حجز", "موعد", "محتاج دكتور", "اريد حجز", "عايز حجز"
            };
            
            string normalizedMessage = message.ToLower();
            
            return appointmentKeywords.Any(keyword => normalizedMessage.Contains(keyword.ToLower()));
        }
        
        private async Task<string> HandleAppointmentScheduling(string message, string? userId)
        {
            try 
            {
                // Check if this is about a specific specialty
                var (specialty, _) = await _localKnowledgeBase.DetectSpecialtyAsync(message);
                
                if (!string.IsNullOrEmpty(specialty))
                {
                    // Get recommended doctors for this specialty
                    var recommendedDoctors = await _localKnowledgeBase.GetRecommendedDoctorsAsync(specialty, userId);
                    
                    if (recommendedDoctors.Any())
                    {
                        var response = isArabic(message)
                            ? $"يمكنني مساعدتك في حجز موعد مع طبيب {specialty}. إليك قائمة بالأطباء المتاحين:\n\n"
                            : $"I can help you book an appointment with a {specialty} specialist. Here are the available doctors:\n\n";
                            
                        foreach (var doctor in recommendedDoctors.Take(3))
                        {
                            response += $"- Dr. {doctor.doctorName}, " + 
                                       (isArabic(message) 
                                         ? $"متاح في: {doctor.nextAvailable:yyyy-MM-dd}\n" 
                                         : $"Available on: {doctor.nextAvailable:yyyy-MM-dd}\n");
                        }
                        
                        response += isArabic(message)
                            ? "\nهل ترغب في حجز موعد مع أحد هؤلاء الأطباء؟ إذا كان الأمر كذلك، يرجى تحديد الطبيب والتاريخ المفضل."
                            : "\nWould you like to book an appointment with one of these doctors? If so, please specify the doctor and your preferred date.";
                            
                        return response;
                    }
                }
                
                // Generic appointment booking response
                return isArabic(message)
                    ? "يمكنني مساعدتك في حجز موعد مع طبيب. هل يمكنك إخباري بنوع الطبيب أو التخصص الذي تبحث عنه؟"
                    : "I can help you book an appointment with a doctor. Could you tell me what type of doctor or specialty you're looking for?";
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error handling appointment scheduling");
                return isArabic(message)
                    ? "عذرًا، واجهنا مشكلة في معالجة طلب الموعد الخاص بك. يرجى المحاولة مرة أخرى لاحقًا."
                    : "Sorry, we encountered an issue processing your appointment request. Please try again later.";
            }
        }
        
        private async Task<string> GetRelevantContextForQuery(string message, string? userId)
        {
            var contextBuilder = new StringBuilder();
            
            // Get context from RAG service if available
            try
            {
                var context = await ((IRAGService)_localKnowledgeBase).GetRelevantContext(message);
                if (!string.IsNullOrEmpty(context))
                {
                    contextBuilder.AppendLine(context);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error getting context from RAG service");
            }
            
            // Add patient-specific context if user ID is available
            if (!string.IsNullOrEmpty(userId))
            {
                try
                {
                    // Get patient appointments
                    var appointments = await _localKnowledgeBase.GetPatientAppointmentsAsync(userId);
                    if (appointments.Any())
                    {
                        contextBuilder.AppendLine("\nPatient Appointments:");
                        foreach (var appointment in appointments.Take(3))
                        {
                            contextBuilder.AppendLine($"- {appointment.AppointmentDate:yyyy-MM-dd HH:mm} with Dr. {appointment.Doctor?.FirstName} {appointment.Doctor?.LastName}, Status: {appointment.Status}");
                        }
                    }
                    
                    // Get patient medical history
                    var medicalHistory = await _localKnowledgeBase.GetPatientMedicalHistoryAsync(userId);
                    if (!string.IsNullOrEmpty(medicalHistory))
                    {
                        contextBuilder.AppendLine("\nPatient Medical History:");
                        contextBuilder.AppendLine(medicalHistory);
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Error getting patient-specific context");
                }
            }
            
            return contextBuilder.ToString().Trim();
        }
        
        private string PrepareSystemPromptWithContext(string context, string message)
        {
            bool isArabicMessage = isArabic(message);
            bool isMedicalQuery = Regex.IsMatch(message, @"مريض|الم|وجع|صداع|حمى|disease|symptom|pain|ache|sick|fever", RegexOptions.IgnoreCase);
            
            var promptBuilder = new StringBuilder();
            
            // Base system role definition
            if (isMedicalQuery)
            {
                promptBuilder.AppendLine(isArabicMessage 
                    ? "أنت مساعد طبي متخصص يحاكي قدرات Hume AI، تتمتع بمعرفة طبية واسعة وتقدم معلومات دقيقة وموثوقة. استخدم لغة محادثة طبيعية وصوتًا دافئًا."
                    : "You are a specialized medical assistant modeled after Hume AI capabilities, with extensive medical knowledge providing accurate and reliable information. Use conversational, natural language and a warm tone.");
            }
            else
            {
                promptBuilder.AppendLine(isArabicMessage 
                    ? "أنت مساعد ودود ومحترف يحاكي قدرات Hume AI لنظام حجز المواعيد الطبية. تتميز بقدرتك على التواصل بطريقة طبيعية وإنسانية."
                    : "You are a friendly and professional assistant modeled after Hume AI capabilities for the medical appointment system. You excel at communicating in a natural, human-like manner.");
            }
            
            // Add key instructions
            promptBuilder.AppendLine(isArabicMessage
                ? "استخدم المعلومات والسياق المتاح لتقديم أفضل إجابة ممكنة. كن دقيقًا ومتعاطفًا وطبيعيًا في الرد."
                : "Use the available information and context to provide the best possible answer. Be accurate, empathetic, and natural in your response.");
            
            // Add caution for medical advice
            if (isMedicalQuery)
            {
                promptBuilder.AppendLine(isArabicMessage
                    ? "تذكير: لا تقدم تشخيصات طبية محددة، بل شجع دائمًا على استشارة الطبيب المختص للحصول على تشخيص وعلاج مناسبين."
                    : "Reminder: Do not provide specific medical diagnoses, but always encourage consulting a specialist for proper diagnosis and treatment.");
            }
            
            // Add context information if available
            if (!string.IsNullOrEmpty(context))
            {
                promptBuilder.AppendLine("\n--- معلومات السياق / Context Information ---");
                promptBuilder.AppendLine(context);
                promptBuilder.AppendLine("--- نهاية السياق / End of Context ---\n");
            }
            
            // Add response instructions
            promptBuilder.AppendLine(isArabicMessage
                ? "استجب للمستخدم بطريقة طبيعية ومحادثة، مع الحفاظ على لهجة متعاطفة ومهنية. استخدم المعلومات من السياق إذا كانت ذات صلة."
                : "Respond to the user in a natural, conversational way, maintaining an empathetic and professional tone. Use information from the context if relevant.");
            
            // Add language instruction
            promptBuilder.AppendLine(isArabicMessage 
                ? "الرجاء الرد باللغة العربية."
                : "Please respond in English.");
                
            return promptBuilder.ToString();
        }
        
        private bool ShouldAddFollowUpQuestions(string message, string response)
        {
            // Add follow-up questions for medical queries and when response is somewhat short
            bool isMedicalQuery = Regex.IsMatch(message, @"مريض|الم|وجع|صداع|حمى|disease|symptom|pain|ache|sick|fever", RegexOptions.IgnoreCase);
            bool isShortResponse = response.Length < 500;
            
            return isMedicalQuery || isShortResponse;
        }
        
        private bool isArabic(string text)
        {
            if (string.IsNullOrEmpty(text)) return false;
            
            // Check if it contains Arabic characters
            return text.Any(c => c >= '\u0600' && c <= '\u06FF');
        }

        public void ClearConversationHistory(string userId)
        {
            try
            {
                _chatService.ClearConversationHistory(userId);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error clearing conversation history for user {UserId}", userId);
            }
        }

        public void ToggleFallbackMode(bool enable)
        {
            try
            {
                _chatService.ToggleFallbackMode(enable);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error toggling fallback mode to {Enable}", enable);
            }
        }
    }
} 