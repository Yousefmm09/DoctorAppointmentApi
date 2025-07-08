using System.Text.Json;
using System.Text;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using Microsoft.Extensions.Caching.Memory;
using DoctorAppoitmentApi.Service.Models;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.RegularExpressions;

namespace DoctorAppoitmentApi.Service
{
    public class AdvancedOpenAIService : IOpenAIService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly IConfiguration _config;
        private readonly ILogger<AdvancedOpenAIService> _logger;
        private readonly Random _jitterRandom = new Random();
        private readonly IMemoryCache _cache;
        private readonly bool _enableLocalResponses;
        private readonly bool _enableApiCalls;
        private bool _isKeyValidated = false;
        private DateTime _lastRateLimitTime = DateTime.MinValue;
        private int _rateLimitCounter = 0;
        private readonly object _rateLimitLock = new object();
        
        public AdvancedOpenAIService(HttpClient httpClient, IConfiguration config, IMemoryCache cache, ILogger<AdvancedOpenAIService> logger = null)
        {
            _httpClient = httpClient;
            _config = config;
            _cache = cache;
            _logger = logger;
            
            _apiKey = _config["OpenAI:ApiKey"];
            
            if (_httpClient.DefaultRequestHeaders.Authorization == null && !string.IsNullOrEmpty(_apiKey))
            {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            }

            // التحكم في استخدام الردود المحلية والـ API
            _enableLocalResponses = true; // دائمًا تمكين الردود المحلية
            _enableApiCalls = !string.IsNullOrEmpty(_apiKey); // تمكين الـ API فقط إذا كان المفتاح موجودًا
            
            _logger?.LogInformation($"OpenAI Service initialized. API Calls Enabled: {_enableApiCalls}, Local Responses Enabled: {_enableLocalResponses}");
            
            // Use environment variable as fallback if the config is empty
            if (string.IsNullOrEmpty(_apiKey))
            {
                _apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
                _logger?.LogInformation("Using API key from environment variable");
            }
            
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger?.LogError("OpenAI API key is missing in configuration");
            }
        }

        public async Task<string> GetChatResponseAsync(string message)
        {
            if (string.IsNullOrEmpty(message))
            {
                return "الرجاء إدخال رسالة.";
            }

            // Check if we're in a rate limit cooldown period
            if (IsInRateLimitCooldown())
            {
                _logger?.LogWarning("In rate limit cooldown, using local response");
                return TryGetLocalResponse(message) ?? GetDefaultResponse(message);
            }

            // Try local response first if enabled
            if (_enableLocalResponses)
            {
                string localResponse = TryGetLocalResponse(message);
                if (!string.IsNullOrEmpty(localResponse))
                {
                    _logger?.LogInformation("Using local response pattern for: {Message}", message);
                    return localResponse;
                }
            }

            // If API calls are not enabled, return local response
            if (!_enableApiCalls)
            {
                _logger?.LogWarning("API calls disabled, using local response for: {Message}", message);
                return TryGetLocalResponse(message) ?? GetDefaultResponse(message);
            }

            try
            {
                // Cache key for this message
                string cacheKey = $"openai_response_{message.GetHashCode()}";

                // Try to get from cache first
                if (_cache.TryGetValue(cacheKey, out string cachedResponse))
                {
                    _logger?.LogInformation("Using cached response for: {Message}", message);
                    return cachedResponse;
                }

                // Prepare the chat messages
                var messages = new List<OpenAIChatMessage>
                {
                    new OpenAIChatMessage { Role = "system", Content = GetSystemPrompt(message) },
                    new OpenAIChatMessage { Role = "user", Content = message }
                };

                // Get response from API
                var response = await GetChatResponseWithHistoryAsync(messages);

                // Cache the successful response
                if (!string.IsNullOrEmpty(response))
                {
                    var cacheOptions = new MemoryCacheEntryOptions()
                        .SetAbsoluteExpiration(TimeSpan.FromHours(24))
                        .SetSlidingExpiration(TimeSpan.FromHours(2));
                    _cache.Set(cacheKey, response, cacheOptions);
                }

                return response;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GetChatResponseAsync for message: {Message}", message);
                return TryGetLocalResponse(message) ?? GetDefaultResponse(message);
            }
        }

        private string GetSystemPrompt(string message)
        {
            bool isArabic = IsArabicText(message);
            bool isMedicalQuery = IsHealthRelated(new List<OpenAIChatMessage> { new OpenAIChatMessage { Role = "user", Content = message } });

            if (isMedicalQuery)
            {
                return isArabic
                    ? "أنت مساعد طبي متخصص يحاكي قدرات Hume AI، تتمتع بمعرفة طبية واسعة وتقدم معلومات دقيقة وموثوقة. بإمكانك الإجابة على جميع الأسئلة المتعلقة بالصحة والطب بطريقة إنسانية ومتعاطفة. استخدم لغة محادثة طبيعية وصوتًا دافئًا. قدم معلومات شاملة حول الحالات الطبية والأعراض والعلاجات مع الإشارة دائمًا إلى أهمية استشارة الطبيب المختص للتشخيص النهائي. يمكنك أيضًا مساعدة المستخدمين في حجز المواعيد الطبية وتقديم توصيات بناءً على أعراضهم."
                    : "You are a specialized medical assistant modeled after Hume AI capabilities, with extensive medical knowledge providing accurate and reliable information. You can answer all health and medical questions in a human-like, empathetic manner. Use conversational, natural language and a warm tone. Provide comprehensive information about medical conditions, symptoms, and treatments while always emphasizing the importance of consulting a specialist for final diagnosis. You can also assist users in booking medical appointments and providing recommendations based on their symptoms.";
            }

            return isArabic
                ? "أنت مساعد ودود ومحترف يحاكي قدرات Hume AI لنظام حجز المواعيد الطبية. تتميز بقدرتك على التواصل بطريقة طبيعية وإنسانية، وتستطيع فهم احتياجات المستخدمين والإجابة على استفساراتهم بشكل شامل وواضح. ساعد في حجز المواعيد وإدارتها وتقديم اقتراحات مفيدة للمستخدمين. استخدم لغة محادثة حقيقية وأسلوبًا شخصيًا لجعل المستخدمين يشعرون بالراحة والاهتمام."
                : "You are a friendly and professional assistant modeled after Hume AI capabilities for the medical appointment system. You excel at communicating in a natural, human-like manner and can understand user needs and answer their inquiries comprehensively and clearly. Help with booking and managing appointments and providing useful suggestions for users. Use genuine conversational language and a personalized approach to make users feel comfortable and cared for.";
        }

        private string GetDefaultResponse(string message)
        {
            bool isArabic = IsArabicText(message);
            return isArabic
                ? "عذراً، الخدمة مشغولة حالياً. يمكنني مساعدتك بالمعلومات الأساسية عن خدماتنا الطبية وحجز المواعيد."
                : "Sorry, the service is busy right now. I can help you with basic information about our medical services and appointment booking.";
        }

        public async Task<string> GetChatResponseWithHistoryAsync(List<OpenAIChatMessage> messages)
        {
            if (messages == null || !messages.Any())
            {
                return "Please provide a message. يرجى تقديم رسالة.";
            }

            // Check cache first
            string cacheKey = GetCacheKey(messages);
            if (_cache.TryGetValue(cacheKey, out string cachedResponse))
            {
                _logger?.LogInformation("Using cached response for query");
                return cachedResponse;
            }

            try
            {
                // Validate API key if not already done
                if (!_isKeyValidated)
                {
                    try 
                    {
                        bool isValid = await ValidateApiKeyAsync();
                        if (!isValid)
                        {
                            _logger?.LogError("OpenAI API key validation failed");
                            return "Service configuration error. Please contact support. خطأ في إعدادات الخدمة. يرجى الاتصال بالدعم الفني.";
                        }
                        _isKeyValidated = true;
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogError(ex, "Error validating API key");
                        return "Service temporarily unavailable. Please try again later. الخدمة غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.";
                    }
                }

                // Detect language of the last user message
                var lastUserMessage = messages.LastOrDefault(m => m.Role == "user")?.Content ?? "";
                bool isArabic = IsArabicText(lastUserMessage);
                
                // Select appropriate system prompt based on context
                string systemPrompt;
                if (IsHealthRelated(messages))
                {
                    systemPrompt = _config["OpenAI:MedicalSystemPrompt"] ?? 
                        "You are a medical information assistant, fluent in Arabic and English. Respond in the same language as the user's query.";
                }
                else
                {
                    systemPrompt = _config["OpenAI:GeneralSystemPrompt"] ?? 
                        "You are a helpful assistant for a medical appointment system, fluent in Arabic and English. Respond in the same language as the user's query.";
                }

                var systemMessage = new OpenAIChatMessage 
                { 
                    Role = "system", 
                    Content = systemPrompt
                };
                
                var allMessages = new List<OpenAIChatMessage> { systemMessage };
                allMessages.AddRange(messages);

                // Get configuration settings
                var model = _config["OpenAI:Model"] ?? "gpt-3.5-turbo";
                var maxTokens = int.Parse(_config["OpenAI:MaxTokens"] ?? "500");
                var temperature = float.Parse(_config["OpenAI:Temperature"] ?? "0.7");
                
                var requestBody = new
                {
                    model = model,
                    messages = allMessages.Select(m => new { role = m.Role, content = m.Content }).ToArray(),
                    max_tokens = maxTokens,
                    temperature = temperature
                };

                var jsonContent = new StringContent(
                    JsonSerializer.Serialize(requestBody), 
                    Encoding.UTF8, 
                    "application/json");

                int retries = 0;
                int maxRetries = int.Parse(_config["OpenAI:MaxRetries"] ?? "3");
                int initialDelay = int.Parse(_config["OpenAI:RateLimitDelayMs"] ?? "1500");

                while (true)
                {
                    var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                    request.Content = jsonContent;

                    try
                    {
                        var response = await _httpClient.SendAsync(request);

                        if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                        {
                            if (retries >= maxRetries)
                            {
                                string fallbackResponse = isArabic ? 
                                    "عذراً، الخدمة مشغولة حالياً. يرجى المحاولة بعد قليل." :
                                    "Sorry, the service is busy right now. Please try again in a moment.";
                                return fallbackResponse;
                            }

                            int delay = initialDelay * (int)Math.Pow(2, retries);
                            int jitter = _jitterRandom.Next(0, delay / 2);
                            delay += jitter;

                            await Task.Delay(delay);
                            retries++;
                            continue;
                        }

                        if (!response.IsSuccessStatusCode)
                        {
                            string errorResponse = isArabic ?
                                "عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى." :
                                "Sorry, there was an error processing your request. Please try again.";
                            return errorResponse;
                        }

                        var responseString = await response.Content.ReadAsStringAsync();
                        using var jsonDoc = JsonDocument.Parse(responseString);
                        var reply = jsonDoc.RootElement
                            .GetProperty("choices")[0]
                            .GetProperty("message")
                            .GetProperty("content")
                            .GetString();

                        if (string.IsNullOrEmpty(reply))
                        {
                            return isArabic ?
                                "عذراً، لم أتمكن من فهم طلبك. هل يمكنك إعادة صياغة السؤال؟" :
                                "Sorry, I couldn't understand your request. Could you rephrase the question?";
                        }

                        // Cache the successful response
                        var cacheOptions = new MemoryCacheEntryOptions()
                            .SetAbsoluteExpiration(TimeSpan.FromMinutes(30));
                        _cache.Set(cacheKey, reply, cacheOptions);

                        return reply;
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogError(ex, "Error in chat completion request");
                        string errorMessage = isArabic ?
                            "عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً." :
                            "Sorry, an unexpected error occurred. Please try again later.";
                        return errorMessage;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GetChatResponseWithHistoryAsync");
                return "An unexpected error occurred. Please try again later. حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً.";
            }
        }

        /// <summary>
        /// New method to track rate limiting and enter cooldown periods when needed
        /// </summary>
        private void RegisterRateLimit()
        {
            lock (_rateLimitLock)
            {
                // If we're getting rate limits within 15 minutes of each other, increment counter
                if ((DateTime.UtcNow - _lastRateLimitTime).TotalMinutes < 15)
                {
                    _rateLimitCounter++;
                }
                else
                {
                    // Otherwise reset counter and start fresh
                    _rateLimitCounter = 1;
                }
                
                _lastRateLimitTime = DateTime.UtcNow;
                
                _logger?.LogWarning("Rate limit counter: {Counter}", _rateLimitCounter);
            }
        }
        
        /// <summary>
        /// Check if we're in a rate limit cooldown period
        /// </summary>
        private bool IsInRateLimitCooldown()
        {
            lock (_rateLimitLock)
            {
                // Implement progressively longer cooldown periods based on how many rate limits we've hit
                if (_rateLimitCounter >= 10)
                {
                    // After 10+ rate limits, enforce a 6-hour cooldown
                    return (DateTime.UtcNow - _lastRateLimitTime).TotalHours < 6;
                }
                else if (_rateLimitCounter >= 5)
                {
                    // After 5+ rate limits, enforce a 1-hour cooldown
                    return (DateTime.UtcNow - _lastRateLimitTime).TotalHours < 1;
                }
                else if (_rateLimitCounter >= 3)
                {
                    // After 3+ rate limits, enforce a 15-minute cooldown
                    return (DateTime.UtcNow - _lastRateLimitTime).TotalMinutes < 15;
                }
                
                return false;
            }
        }

        /// <summary>
        /// Get a fallback response when we can't use the API
        /// </summary>
        private string GetFallbackResponse(List<OpenAIChatMessage> messages)
        {
            if (messages.Count > 0 && messages[messages.Count - 1].Role == "user")
            {
                string userMessage = messages[messages.Count - 1].Content.ToLower().Trim();
                
                // Try to get a local response first
                string localResponse = TryGetLocalResponse(userMessage);
                if (localResponse != null)
                {
                    return localResponse;
                }
                
                // If we can't match with a pattern, return a generic response
                if (IsHealthRelated(messages))
                {
                    return "نعتذر، خدمة المعلومات الطبية غير متاحة حالياً. يرجى الاتصال بطبيبك أو زيارة قسم الأطباء لحجز موعد للحصول على المشورة المخصصة.";
                }
                else
                {
                    return "عذرًا، لا يمكنني الإجابة على هذا السؤال حاليًا. يمكنك إعادة المحاولة لاحقًا أو طرح سؤال آخر يمكنني المساعدة فيه.";
                }
            }
            
            return "عذرًا، أواجه صعوبة في معالجة طلبك حاليًا. يرجى المحاولة مرة أخرى لاحقًا.";
        }

        private async Task<bool> ValidateApiKeyAsync()
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger?.LogError("OpenAI API key is empty");
                return false;
            }

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, "https://api.openai.com/v1/models");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                
                var response = await _httpClient.SendAsync(request);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger?.LogInformation("OpenAI API key validated successfully");
                    return true;
                }
                
                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    _logger?.LogError("OpenAI API key is invalid or unauthorized");
                    return false;
                }
                
                _logger?.LogWarning("OpenAI API key validation: Unexpected status code {StatusCode}", response.StatusCode);
                return false;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error validating OpenAI API key");
                return false;
            }
        }

        /// <summary>
        /// Check if the query is complex enough to warrant using the advanced model
        /// </summary>
        private bool IsComplexQuery(List<OpenAIChatMessage> messages)
        {
            // If there are multiple messages, it's likely a complex conversation
            if (messages.Count > 3) return true;
            
            // For single message queries, check complexity
            if (messages.Count == 1 && messages[0].Role == "user")
            {
                var message = messages[0].Content.ToLower();
                
                // Check for medical complexity indicators
                if (message.Contains("تشخيص") || 
                    message.Contains("أعراض") || 
                    message.Contains("symptoms") || 
                    message.Contains("diagnosis") ||
                    message.Contains("treatment") ||
                    message.Contains("علاج") ||
                    message.Contains("مرض"))
                {
                    return true;
                }
                
                // Check for length - longer messages may be more complex
                if (message.Length > 100)
                {
                    return true;
                }
            }
            
            return false;
        }

        /// <summary>
        /// Try to match the user query with predefined patterns to avoid API calls
        /// </summary>
        private string TryGetLocalResponse(string message)
        {
            if (string.IsNullOrEmpty(message))
            {
                return null;
            }
            
            // نحول الرسالة للصيغة الصغيرة لسهولة المقارنة
            string lowerMessage = message.Trim().ToLowerInvariant();

            // ======= الردود المحلية للتحيات والأسئلة العامة =======
            if (HasAnyOf(lowerMessage, new[] { "السلام عليكم", "مرحبا", "أهلا", "اهلا", "hi", "hello", "مرحباً", "مرحبًا", "هاي" }))
            {
                return "وعليكم السلام ورحمة الله وبركاته! كيف يمكنني مساعدتك اليوم؟";
            }

            if (HasAnyOf(lowerMessage, new[] { "كيف حالك", "عامل ايه", "كيفك", "كيف الحال", "طمني عليك", "how are you" }))
            {
                return "أنا بخير، شكراً لسؤالك! كيف يمكنني مساعدتك اليوم؟";
            }

            // ======= الردود المحلية حول الأطباء والتخصصات =======
            
            // استعلامات عن أطباء القلب
            if (HasAnyOf(lowerMessage, new[] { "طبيب قلب", "دكتور قلب", "أطباء القلب", "أخصائي قلب", "عايز دكتور قلب", "محتاج طبيب قلب", "أريد طبيب قلب", 
                "heart doctor", "cardiologist" }))
            {
                return "لدينا مجموعة متميزة من أطباء القلب والأوعية الدموية. يمكنك اختيار أحد الأطباء المتخصصين من قسم 'أمراض القلب' في تطبيقنا وحجز موعد مناسب.";
            }
            
            // استعلامات عن أطباء الأطفال
            if (HasAnyOf(lowerMessage, new[] { "طبيب أطفال", "دكتور أطفال", "دكتور اطفال", "طبيب اطفال", "أطباء الأطفال", "عايز دكتور اطفال", "محتاج طبيب اطفال",
                "pediatrician", "children doctor", "kids doctor" }))
            {
                return "لدينا نخبة من أطباء الأطفال ذوي الخبرة والكفاءة. يمكنك استعراض قسم 'طب الأطفال' في التطبيق لاختيار الطبيب المناسب وحجز موعد.";
            }
            
            // استعلامات عن أطباء النساء والولادة
            if (HasAnyOf(lowerMessage, new[] { "طبيب نساء", "دكتور نساء", "نساء وولادة", "نساء و ولادة", "طبيبة نساء", "دكتورة نساء", "عايز دكتور نسا", "طبيب توليد",
                "gynecologist", "obstetrician", "obgyn" }))
            {
                return "نعم، يتوفر لدينا أطباء متخصصون في النساء والتوليد. يمكنك تصفح قسم 'أمراض النساء والتوليد' في التطبيق واختيار الطبيب/ة المناسب/ة.";
            }
            
            // استعلامات عن أطباء العيون
            if (HasAnyOf(lowerMessage, new[] { "طبيب عيون", "دكتور عيون", "أطباء العيون", "استشاري عيون", "عايز دكتور عيون", "محتاج طبيب عيون",
                "ophthalmologist", "eye doctor" }))
            {
                return "لدينا مجموعة من أفضل أطباء وجراحي العيون. يمكنك اختيار الطبيب المناسب من قسم 'طب وجراحة العيون' في تطبيقنا.";
            }
            
            // استعلامات عن أطباء الجلدية
            if (HasAnyOf(lowerMessage, new[] { "طبيب جلدية", "دكتور جلدية", "أمراض جلدية", "طبيب بشرة", "دكتور بشرة", "عايز دكتور جلدية", "محتاج طبيب جلدية",
                "dermatologist", "skin doctor" }))
            {
                return "نعم، يتوفر لدينا أطباء متخصصون في الأمراض الجلدية. يمكنك تصفح قسم 'الأمراض الجلدية' في التطبيق واختيار الطبيب المناسب.";
            }
            
            // استعلامات عن أطباء الأسنان
            if (HasAnyOf(lowerMessage, new[] { "طبيب أسنان", "دكتور اسنان", "طبيب اسنان", "أطباء الأسنان", "عايز دكتور اسنان", "محتاج طبيب اسنان",
                "dentist", "dental doctor" }))
            {
                return "لدينا مجموعة متميزة من أطباء الأسنان في مختلف التخصصات. يمكنك اختيار طبيب الأسنان المناسب من قسم 'طب الأسنان' في تطبيقنا.";
            }
            
            // استعلامات عن أطباء العظام
            if (HasAnyOf(lowerMessage, new[] { "طبيب عظام", "دكتور عظام", "جراح عظام", "أمراض عظام", "عايز دكتور عظام", "محتاج طبيب عظام",
                "orthopedist", "bone doctor", "orthopedic" }))
            {
                return "يتوفر لدينا نخبة من أطباء وجراحي العظام. يمكنك تصفح قسم 'جراحة العظام' في التطبيق واختيار الطبيب المناسب لحالتك.";
            }
            
            // استعلامات عامة عن الأطباء
            if (HasAnyOf(lowerMessage, new[] { "عايز دكتور", "محتاج طبيب", "أريد طبيب", "ابحث عن دكتور", "فين الدكاترة", "الاطباء",
                "need doctor", "find doctor", "where doctor" }))
            {
                return "لدينا العديد من الأطباء المتخصصين في مختلف المجالات الطبية. يمكنك البحث حسب التخصص أو اسم الطبيب في قسم 'الأطباء' واختيار الطبيب المناسب لحالتك.";
            }
            
            // ======= الردود المحلية للأسئلة المتعلقة بالحجز والمواعيد =======
            
            if (HasAnyOf(lowerMessage, new[] { "كيف احجز", "عايز احجز", "ازاي احجز", "طريقة الحجز", "كيفية الحجز", "حجز موعد", "حجز مع دكتور", "حجز كشف",
                "book appointment", "schedule appointment", "make appointment" }))
            {
                return "لحجز موعد، برجاء اتباع الخطوات التالية:\n1. اختر التخصص المطلوب\n2. اختر الطبيب المناسب\n3. اختر اليوم والوقت المناسب\n4. أكمل بيانات الحجز\n5. قم بتأكيد الحجز ودفع الرسوم إذا لزم الأمر";
            }
            
            if (HasAnyOf(lowerMessage, new[] { "الغاء موعد", "الغاء حجز", "كيف الغي", "عايز الغي", "cancel appointment", "delete appointment" }))
            {
                return "لإلغاء موعد محجوز، يرجى الانتقال إلى قسم 'مواعيدي' في التطبيق، ثم اختيار الموعد الذي تريد إلغاءه، والضغط على 'إلغاء الموعد'. يرجى ملاحظة أن الإلغاء قبل 24 ساعة من الموعد يضمن استرداد الرسوم كاملة.";
            }
            
            if (HasAnyOf(lowerMessage, new[] { "تغيير موعد", "تعديل موعد", "تأجيل موعد", "تبديل موعد", "reschedule", "change appointment" }))
            {
                return "لتغيير موعد محجوز، يرجى الانتقال إلى قسم 'مواعيدي' في التطبيق، ثم اختيار الموعد الذي تريد تغييره، والضغط على 'تعديل الموعد'. يمكنك بعد ذلك اختيار وقت جديد حسب جدول الطبيب المتاح.";
            }
            
            // ======= الردود المحلية للأسئلة المتعلقة بالمدفوعات والأسعار =======

            if (HasAnyOf(lowerMessage, new[] { "سعر الكشف", "كم سعر", "تكلفة الكشف", "سعر الحجز", "كم تكلفة", "اسعار الكشف", "اسعار الدكاترة", "سعر الدكتور", "appointment cost", "doctor fees" }))
            {
                return "تختلف أسعار الكشف حسب الطبيب وتخصصه وخبرته. يمكنك معرفة سعر الكشف لكل طبيب في صفحة الطبيب قبل إتمام الحجز. الأسعار تبدأ من 150 جنيهًا وتختلف حسب التخصص.";
            }
            
            if (HasAnyOf(lowerMessage, new[] { "طرق الدفع", "كيف ادفع", "الدفع", "وسائل الدفع", "payment methods", "how to pay", "payment" }))
            {
                return "نقبل مختلف طرق الدفع بما في ذلك:\n• البطاقات الائتمانية (فيزا وماستركارد)\n• محافظ الدفع الإلكترونية\n• الدفع النقدي في العيادة\n• تحويل بنكي (للحجوزات الكبيرة)";
            }
            
            // ======= الردود المحلية للأسئلة العامة عن الصحة =======

            if (HasAnyOf(lowerMessage, new[] { "افضل وقت للنوم", "متى انام", "كم ساعة نوم", "sleeping time", "best time to sleep" }))
            {
                return "ينصح الأطباء بالنوم بين 7-9 ساعات يومياً للبالغين. أفضل وقت للنوم هو بين الساعة 10-11 مساءً والاستيقاظ في وقت ثابت صباحاً. النوم الكافي مهم للصحة العامة والمناعة ووظائف الجسم.";
            }
            
            if (HasAnyOf(lowerMessage, new[] { "صداع", "الم راس", "وجع راس", "headache", "head pain" }))
            {
                return "الصداع له أسباب متعددة منها: الإجهاد، قلة النوم، الجفاف، أو التوتر. للتخفيف يمكن أخذ قسط من الراحة، شرب الماء، وتناول مسكن بسيط. إذا كان الصداع شديداً أو متكرراً، ينصح بمراجعة طبيب.";
            }
            
            if (HasAnyOf(lowerMessage, new[] { "كورونا", "فيروس كورونا", "كوفيد", "covid", "corona" }))
            {
                return "أعراض فيروس كورونا تشمل: حمى، سعال جاف، إرهاق، فقدان حاسة الشم والتذوق. إذا ظهرت عليك هذه الأعراض، يجب عزل نفسك وإجراء فحص. للوقاية: ارتداء الكمامة، التباعد الاجتماعي، وغسل اليدين بانتظام.";
            }
            
            if (HasAnyOf(lowerMessage, new[] { "ضغط", "ضغط الدم", "blood pressure" }))
            {
                return "المعدل الطبيعي لضغط الدم هو حوالي 120/80. ارتفاع ضغط الدم يمكن أن يسبب مشاكل صحية خطيرة. للحفاظ على ضغط دم صحي: مارس الرياضة بانتظام، تناول غذاء صحي قليل الملح، امتنع عن التدخين، وقلل من التوتر.";
            }
            
            if (HasAnyOf(lowerMessage, new[] { "سكر", "سكري", "مرض السكر", "diabetes" }))
            {
                return "مرض السكري هو اضطراب في استقلاب الغلوكوز. أعراضه: العطش الشديد، كثرة التبول، والإرهاق. للتعايش معه: التزم بالأدوية الموصوفة، راقب مستويات السكر، اتبع نظاماً غذائياً صحياً، ومارس الرياضة بانتظام.";
            }

            // لا توجد استجابة محلية مناسبة
            return null;
        }
        
        /// <summary>
        /// تحقق مما إذا كانت الرسالة تحتوي على أي من العبارات المحددة
        /// </summary>
        private bool HasAnyOf(string message, string[] phrases)
        {
            if (string.IsNullOrEmpty(message))
                return false;
                
            foreach (var phrase in phrases)
            {
                if (message.Contains(phrase))
                    return true;
            }
            
            return false;
        }

        /// <summary>
        /// Generate a cache key based on the conversation messages
        /// </summary>
        private string GetCacheKey(List<OpenAIChatMessage> messages)
        {
            var sb = new StringBuilder("openai_");
            foreach (var msg in messages)
            {
                // Only include a part of each message to keep the key reasonably sized
                string contentPart = msg.Content.Length > 20 
                    ? msg.Content.Substring(0, 20) 
                    : msg.Content;
                
                sb.Append($"{msg.Role.Substring(0, 1)}:{contentPart.GetHashCode()}_");
            }
            return sb.ToString();
        }
        
        /// <summary>
        /// Generate text embeddings for semantic search capabilities
        /// </summary>
        public async Task<float[]> GenerateEmbeddingAsync(string text)
        {
            if (string.IsNullOrEmpty(text)) return Array.Empty<float>();

            try
            {
                var model = _config["OpenAI:EmbeddingModel"] ?? "text-embedding-3-small";
                
                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/embeddings");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                
                var requestBody = new
                {
                    model = model,
                    input = text
                };
                
                var jsonContent = new StringContent(
                    JsonSerializer.Serialize(requestBody), 
                    Encoding.UTF8, 
                    "application/json");
                    
                request.Content = jsonContent;
                
                var response = await _httpClient.SendAsync(request);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger?.LogError("Error generating embedding: {StatusCode}", response.StatusCode);
                    return Array.Empty<float>();
                }
                
                var responseString = await response.Content.ReadAsStringAsync();
                using var jsonDoc = JsonDocument.Parse(responseString);
                
                var embeddingArray = jsonDoc.RootElement
                    .GetProperty("data")[0]
                    .GetProperty("embedding");
                    
                var embeddings = new List<float>();
                
                foreach (var value in embeddingArray.EnumerateArray())
                {
                    embeddings.Add(value.GetSingle());
                }
                
                return embeddings.ToArray();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error generating embedding");
                return Array.Empty<float>();
            }
        }

        /// <summary>
        /// تحقق مما إذا كانت الرسائل تتعلق بالصحة أو الطب
        /// </summary>
        private bool IsHealthRelated(List<OpenAIChatMessage> messages)
        {
            var lastUserMessage = messages.LastOrDefault(m => m.Role == "user")?.Content?.ToLower() ?? "";
            
            // Keywords that indicate health-related queries (both English and Arabic)
            var healthKeywords = new[]
            {
                "symptom", "disease", "pain", "doctor", "medical", "health", "treatment", "medicine", "diagnosis",
                "أعراض", "مرض", "ألم", "طبيب", "طبي", "صحة", "علاج", "دواء", "تشخيص"
            };

            return healthKeywords.Any(keyword => lastUserMessage.Contains(keyword, StringComparison.OrdinalIgnoreCase));
        }

        private bool IsArabicText(string text)
        {
            // Arabic Unicode range
            return Regex.IsMatch(text, @"\p{IsArabic}");
        }
    }
} 