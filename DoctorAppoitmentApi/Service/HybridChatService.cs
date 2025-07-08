using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Linq;

namespace DoctorAppoitmentApi.Service
{
    /// <summary>
    /// A hybrid chat service that combines multiple knowledge sources:
    /// 1. Local knowledge base for common queries
    /// 2. Self-hosted LLM for more complex questions
    /// 3. OpenAI as a fallback when needed (if configured)
    /// </summary>
    public class HybridChatService : ICombinedChatService
    {
        private readonly ILocalKnowledgeBase _localKnowledgeBase;
        private readonly ILocalLLMService _localLLMService;
        private readonly IOpenAIService _openAIService; // Used as fallback when enabled
        private readonly ILogger<HybridChatService> _logger;
        private readonly IMemoryCache _cache;
        private readonly bool _useOpenAI;
        private readonly bool _preferLocalLLM;
        private readonly Dictionary<string, List<MessageHistoryItem>> _conversationHistory;
        
        public HybridChatService(
            ILocalKnowledgeBase localKnowledgeBase,
            ILocalLLMService localLLMService,
            IOpenAIService openAIService,
            IMemoryCache cache,
            Microsoft.Extensions.Configuration.IConfiguration config,
            ILogger<HybridChatService> logger = null)
        {
            _localKnowledgeBase = localKnowledgeBase;
            _localLLMService = localLLMService;
            _openAIService = openAIService;
            _logger = logger;
            _cache = cache;
            _conversationHistory = new Dictionary<string, List<MessageHistoryItem>>();
            
            // Read configuration
            _useOpenAI = !string.IsNullOrEmpty(config["OpenAI:ApiKey"]);
            _preferLocalLLM = bool.Parse(config["LocalLLM:PreferLocalLLMOverOpenAI"] ?? "true");
            
            _logger?.LogInformation("Hybrid Chat Service initialized. Using OpenAI: {UseOpenAI}, Prefer Local LLM: {PreferLocalLLM}", 
                _useOpenAI, _preferLocalLLM);
        }
        
        /// <summary>
        /// Main method to handle user messages and route them to the appropriate service
        /// </summary>
        public async Task<string> HandleUserMessageAsync(string message, string? userId = null)
        {
            if (string.IsNullOrEmpty(message))
            {
                return "الرجاء كتابة رسالة.";
            }
            
            string cacheKey = $"hybrid_chat_{message.GetHashCode()}_{userId}";
            if (_cache.TryGetValue(cacheKey, out string cachedResponse))
            {
                _logger?.LogInformation("Using cached response for message");
                return cachedResponse;
            }
            
            try
            {
                // Record the user message in history
                RecordMessageInHistory(userId, "user", message);
                
                // 1. First check if this is a greeting
                if (Regex.IsMatch(message, @"^(hi|hello|مرحبا|السلام عليكم|صباح الخير|مساء الخير|اهلا)", RegexOptions.IgnoreCase))
                {
                    var greeting = await _localKnowledgeBase.GetEmpatheticGreetingAsync(userId);
                    RecordMessageInHistory(userId, "assistant", greeting);
                    return greeting;
                }
                
                // 2. Try local knowledge base for common patterns and medical advice
                var (matched, localKbResponse) = await _localKnowledgeBase.GetResponseAsync(message, userId);
                if (matched)
                {
                    _logger?.LogInformation("Returning local knowledge base response");
                    
                    // Add suggested follow-up questions
                    var suggestions = await _localKnowledgeBase.GetSuggestedQuestionsAsync(message);
                    if (suggestions.Any())
                    {
                        var responseWithSuggestions = AddSuggestionsToResponse(localKbResponse, suggestions, IsArabic(message));
                        RecordMessageInHistory(userId, "assistant", responseWithSuggestions);
                        CacheResponse(cacheKey, responseWithSuggestions);
                        return responseWithSuggestions;
                    }
                    
                    RecordMessageInHistory(userId, "assistant", localKbResponse);
                    CacheResponse(cacheKey, localKbResponse);
                    return localKbResponse;
                }
                
                // 3. Try specialized medical advice for symptoms
                if (IsAboutSymptoms(message))
                {
                    var (medicalMatched, medicalResponse, followUpQuestions) = 
                        await _localKnowledgeBase.GetEnhancedMedicalAdviceAsync(message, userId);
                        
                    if (medicalMatched)
                    {
                        if (followUpQuestions.Any())
                        {
                            medicalResponse += IsArabic(message)
                                ? "\n\nلفهم حالتك بشكل أفضل، هل يمكنك الإجابة على الأسئلة التالية:\n"
                                : "\n\nTo better understand your condition, could you answer these questions:\n";
                                
                            foreach (var question in followUpQuestions.Take(3))
                            {
                                medicalResponse += $"- {question}\n";
                            }
                        }
                        
                        RecordMessageInHistory(userId, "assistant", medicalResponse);
                        CacheResponse(cacheKey, medicalResponse);
                        return medicalResponse;
                    }
                }
                
                // 4. Generate context for the LLM
                var context = await GenerateContext(message, userId);
                
                // 5. Check if local LLM is available and preferred
                if (_preferLocalLLM)
                {
                    try
                    {
                        bool localLLMAvailable = await _localLLMService.IsAvailableAsync();
                        if (localLLMAvailable)
                        {
                            _logger?.LogInformation("Using local LLM for response");
                            
                            // Create a prompt with context and conversation history
                            var formattedPrompt = CreateLocalLLMPrompt(message, context, userId);
                            var localLLMResponse = await _localLLMService.GetResponseAsync(formattedPrompt);
                            
                            // Cache and return response
                            RecordMessageInHistory(userId, "assistant", localLLMResponse);
                            CacheResponse(cacheKey, localLLMResponse);
                            return localLLMResponse;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogError(ex, "Error using local LLM, will try fallback");
                    }
                }
                
                // 6. Use OpenAI if available and allowed
                if (_useOpenAI && !_preferLocalLLM)
                {
                    try
                    {
                        _logger?.LogInformation("Using OpenAI for response");
                        
                        // Create OpenAI message structure with context
                        var messages = CreateOpenAIMessages(message, context, userId);
                        var openAIResponse = await _openAIService.GetChatResponseWithHistoryAsync(messages);
                        
                        // Cache and return response
                        RecordMessageInHistory(userId, "assistant", openAIResponse);
                        CacheResponse(cacheKey, openAIResponse);
                        return openAIResponse;
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogError(ex, "Error using OpenAI, will use fallback response");
                    }
                }
                
                // 7. Final fallback for when all else fails
                var fallbackResponse = GenerateFallbackResponse(message, IsArabic(message));
                RecordMessageInHistory(userId, "assistant", fallbackResponse);
                return fallbackResponse;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in HybridChatService.HandleUserMessageAsync");
                
                // In case of any error, return a polite message
                return IsArabic(message)
                    ? "عذراً، حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى."
                    : "Sorry, an error occurred while processing your question. Please try again.";
            }
        }
        
        /// <summary>
        /// Generate context for the query from various sources
        /// </summary>
        private async Task<string> GenerateContext(string message, string? userId)
        {
            var contextBuilder = new StringBuilder();
            
            // Try to get relevant medical information
            if (_localKnowledgeBase is IRAGService ragService)
            {
                try
                {
                    var context = await ragService.GetRelevantContext(message);
                    if (!string.IsNullOrWhiteSpace(context))
                    {
                        contextBuilder.AppendLine(context);
                    }
                    
                    var (hasInfo, medInfo) = await ragService.GetMedicalInformation(message);
                    if (hasInfo)
                    {
                        contextBuilder.AppendLine("\nMedical Information:");
                        contextBuilder.AppendLine(medInfo);
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Error getting context from RAG service");
                }
            }
            
            // Add user-specific context if available
            if (!string.IsNullOrEmpty(userId))
            {
                try
                {
                    // Get appointments
                    var appointments = await _localKnowledgeBase.GetPatientAppointmentsAsync(userId);
                    if (appointments.Any())
                    {
                        contextBuilder.AppendLine("\nPatient Appointments:");
                        foreach (var apt in appointments.Take(3))
                        {
                            contextBuilder.AppendLine($"- Date: {apt.AppointmentDate}, Doctor: {apt.Doctor?.FirstName} {apt.Doctor?.LastName}, Status: {apt.Status}");
                        }
                    }
                    
                    // Get medical history if relevant
                    if (IsAboutHealthOrHistory(message))
                    {
                        var history = await _localKnowledgeBase.GetPatientMedicalHistoryAsync(userId);
                        if (!string.IsNullOrEmpty(history))
                        {
                            contextBuilder.AppendLine("\nPatient Medical History:");
                            contextBuilder.AppendLine(history);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Error getting user-specific context");
                }
            }
            
            return contextBuilder.ToString().Trim();
        }
        
        /// <summary>
        /// Create a prompt for the local LLM with context and conversation history
        /// </summary>
        private string CreateLocalLLMPrompt(string message, string context, string? userId)
        {
            var promptBuilder = new StringBuilder();
            bool isArabic = IsArabic(message);
            
            // Add system instruction
            promptBuilder.AppendLine(isArabic
                ? "### تعليمات:\nأنت مساعد طبي ذكي تتمتع بمعرفة طبية واسعة وتقدم معلومات دقيقة وموثوقة. استخدم لغة محادثة طبيعية وأسلوباً متعاطفاً. شجع دائماً على استشارة الطبيب المختص للتشخيص النهائي."
                : "### Instructions:\nYou are an intelligent medical assistant with extensive medical knowledge providing accurate and reliable information. Use natural conversational language and an empathetic tone. Always encourage consulting a specialist for final diagnosis.");
            
            // Add context if available
            if (!string.IsNullOrEmpty(context))
            {
                promptBuilder.AppendLine("\n### Context:");
                promptBuilder.AppendLine(context);
            }
            
            // Add conversation history
            if (!string.IsNullOrEmpty(userId) && _conversationHistory.TryGetValue(userId, out var history) && history.Count > 0)
            {
                promptBuilder.AppendLine("\n### Previous Conversation:");
                foreach (var item in history.Skip(Math.Max(0, history.Count - 6))) // Get last 3 exchanges (6 messages)
                {
                    string roleLabel = item.Role == "user" ? "Human" : "Assistant";
                    promptBuilder.AppendLine($"{roleLabel}: {item.Content}");
                }
            }
            
            // Add current query
            promptBuilder.AppendLine("\n### Current Query:");
            promptBuilder.AppendLine($"Human: {message}");
            promptBuilder.AppendLine("Assistant:");
            
            return promptBuilder.ToString();
        }
        
        /// <summary>
        /// Create OpenAI message format with context and history
        /// </summary>
        private List<Service.Models.OpenAIChatMessage> CreateOpenAIMessages(string message, string context, string? userId)
        {
            var messages = new List<Service.Models.OpenAIChatMessage>();
            bool isArabic = IsArabic(message);
            
            // System message with instructions
            messages.Add(new Service.Models.OpenAIChatMessage
            {
                Role = "system",
                Content = isArabic
                    ? $"أنت مساعد طبي ذكي تتمتع بمعرفة طبية واسعة وتقدم معلومات دقيقة وموثوقة. استخدم لغة محادثة طبيعية وأسلوباً متعاطفاً. شجع دائماً على استشارة الطبيب المختص للتشخيص النهائي.\n\nمعلومات السياق:\n{context}"
                    : $"You are an intelligent medical assistant with extensive medical knowledge providing accurate and reliable information. Use natural conversational language and an empathetic tone. Always encourage consulting a specialist for final diagnosis.\n\nContext Information:\n{context}"
            });
            
            // Add conversation history
            if (!string.IsNullOrEmpty(userId) && _conversationHistory.TryGetValue(userId, out var history))
            {
                foreach (var item in history.Skip(Math.Max(0, history.Count - 6))) // Last 3 exchanges
                {
                    messages.Add(new Service.Models.OpenAIChatMessage
                    {
                        Role = item.Role,
                        Content = item.Content
                    });
                }
            }
            
            // Add current message if not already added from history
            if (string.IsNullOrEmpty(userId) || !_conversationHistory.ContainsKey(userId) || 
                _conversationHistory[userId].LastOrDefault()?.Content != message)
            {
                messages.Add(new Service.Models.OpenAIChatMessage
                {
                    Role = "user",
                    Content = message
                });
            }
            
            return messages;
        }
        
        /// <summary>
        /// Clear conversation history for a user
        /// </summary>
        public void ClearConversationHistory(string userId)
        {
            if (!string.IsNullOrEmpty(userId) && _conversationHistory.ContainsKey(userId))
            {
                _conversationHistory.Remove(userId);
                _logger?.LogInformation("Cleared conversation history for user {UserId}", userId);
            }
        }
        
        /// <summary>
        /// Toggle between different modes
        /// </summary>
        public void ToggleFallbackMode(bool enable)
        {
            // This would control whether to use OpenAI as fallback
            // Not implementing detailed logic since we rely on configuration
            _logger?.LogInformation("ToggleFallbackMode called with parameter {Enable}", enable);
        }
        
        #region Helper Methods
        
        /// <summary>
        /// Check if text contains Arabic characters
        /// </summary>
        private bool IsArabic(string text)
        {
            return !string.IsNullOrEmpty(text) && text.Any(c => c >= '\u0600' && c <= '\u06FF');
        }
        
        /// <summary>
        /// Check if query is related to symptoms
        /// </summary>
        private bool IsAboutSymptoms(string message)
        {
            if (string.IsNullOrEmpty(message)) return false;
            
            string normalizedMessage = message.ToLower();
            string[] symptomKeywords = {
                "pain", "ache", "hurt", "symptom", "feeling", "sick", "ill", "disease",
                "وجع", "ألم", "أعاني", "مريض", "عندي", "أشعر", "مرض", "صداع", "حمى"
            };
            
            return symptomKeywords.Any(keyword => normalizedMessage.Contains(keyword));
        }
        
        /// <summary>
        /// Check if query is about health or medical history
        /// </summary>
        private bool IsAboutHealthOrHistory(string message)
        {
            if (string.IsNullOrEmpty(message)) return false;
            
            string normalizedMessage = message.ToLower();
            string[] historyKeywords = {
                "history", "record", "previous", "health", "condition", "medical", "past", "diagnosed",
                "سجل", "تاريخ", "سابق", "صحة", "حالة", "طبي", "ماضي", "تشخيص"
            };
            
            return historyKeywords.Any(keyword => normalizedMessage.Contains(keyword));
        }
        
        /// <summary>
        /// Add follow-up question suggestions to a response
        /// </summary>
        private string AddSuggestionsToResponse(string response, List<string> suggestions, bool isArabic)
        {
            if (suggestions == null || !suggestions.Any()) return response;
            
            var builder = new StringBuilder(response);
            builder.AppendLine();
            builder.AppendLine();
            
            builder.AppendLine(isArabic
                ? "أسئلة متابعة مقترحة:"
                : "Suggested follow-up questions:");
                
            foreach (var suggestion in suggestions.Take(3))
            {
                builder.AppendLine($"- {suggestion}");
            }
            
            return builder.ToString();
        }
        
        /// <summary>
        /// Generate a fallback response when other methods fail
        /// </summary>
        private string GenerateFallbackResponse(string message, bool isArabic)
        {
            return isArabic
                ? "عذراً، لا يمكنني الإجابة على هذا السؤال حالياً. يمكنك تجربة سؤال آخر أو اختيار من هذه المواضيع:\n\n" +
                  "- معلومات عن حجز المواعيد\n" + 
                  "- التخصصات الطبية المتوفرة\n" +
                  "- ساعات العمل والتواصل\n" +
                  "- نصائح صحية عامة"
                : "I'm sorry, I can't answer this question at the moment. You can try another question or choose from these topics:\n\n" +
                  "- Information about appointment booking\n" +
                  "- Available medical specialties\n" +
                  "- Working hours and contact information\n" +
                  "- General health advice";
        }
        
        /// <summary>
        /// Record message in conversation history
        /// </summary>
        private void RecordMessageInHistory(string? userId, string role, string content)
        {
            if (string.IsNullOrEmpty(userId)) return;
            
            if (!_conversationHistory.TryGetValue(userId, out var history))
            {
                history = new List<MessageHistoryItem>();
                _conversationHistory[userId] = history;
            }
            
            history.Add(new MessageHistoryItem
            {
                Role = role,
                Content = content,
                Timestamp = DateTime.UtcNow
            });
            
            // Keep history size manageable
            if (history.Count > 20)
            {
                _conversationHistory[userId] = history.Skip(history.Count - 20).ToList();
            }
        }
        
        /// <summary>
        /// Cache a response
        /// </summary>
        private void CacheResponse(string key, string response)
        {
            _cache.Set(key, response, TimeSpan.FromHours(1));
        }
        
        #endregion
    }
    
    /// <summary>
    /// Message history item for conversation tracking
    /// </summary>
    public class MessageHistoryItem
    {
        public string Role { get; set; }
        public string Content { get; set; }
        public DateTime Timestamp { get; set; }
    }
} 