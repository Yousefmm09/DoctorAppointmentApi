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

                // Try advanced OpenAI service
                try
                {
                    var response = await _advancedOpenAIService.GetChatResponseAsync(message);
                    if (!string.IsNullOrEmpty(response))
                    {
                        // Cache successful responses
                        var cacheKey = $"chat_response_{message.GetHashCode()}";
                        _cache.Set(cacheKey, response, TimeSpan.FromHours(24));
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