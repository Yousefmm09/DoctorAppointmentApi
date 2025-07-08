using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using DoctorAppoitmentApi.Controllers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.IO;
using System.Linq;

namespace DoctorAppoitmentApi.Service
{
    public class MedLLamaService : IMedLLamaService
    {
        private readonly HttpClient _httpClient;
        private readonly ICombinedChatService _fallbackChatService;
        private readonly ILogger<MedLLamaService> _logger;
        private readonly string _medLLamaApiUrl;
        private readonly bool _fallbackToExisting;
        private readonly string _logFilePath;
        
        // Cache the health check result to avoid too many API calls
        private DateTime _lastHealthCheck = DateTime.MinValue;
        private bool _lastHealthStatus = false;
        private readonly TimeSpan _healthCheckCacheDuration = TimeSpan.FromMinutes(5);

        public MedLLamaService(
            HttpClient httpClient,
            ICombinedChatService fallbackChatService,
            IConfiguration configuration,
            ILogger<MedLLamaService> logger)
        {
            _httpClient = httpClient;
            _fallbackChatService = fallbackChatService;
            _logger = logger;
            
            _medLLamaApiUrl = configuration["MedLLama:ApiUrl"] ?? "http://localhost:5001";
            _fallbackToExisting = configuration.GetValue<bool>("MedLLama:FallbackToExisting", true);
            _logFilePath = configuration["MedLLama:LogFilePath"] ?? "medllama_interactions.jsonl";
            
            _logger.LogInformation("MedLLama service initialized with API URL: {ApiUrl}", _medLLamaApiUrl);
        }

        public async Task<MedLLamaResponse> ProcessQueryAsync(string query, string? userId = null, bool includeSuggestions = false)
        {
            // Check if query is suitable for MedLLama
            if (!IsSuitableForMedLLama(query))
            {
                _logger.LogInformation("Query not suitable for MedLLama, falling back to existing service");
                return await FallbackToExistingAsync(query, userId, includeSuggestions);
            }
            
            // Check if MedLLama is available
            if (!await IsHealthyAsync())
            {
                _logger.LogWarning("MedLLama is not available, falling back to existing service");
                return await FallbackToExistingAsync(query, userId, includeSuggestions);
            }
            
            try
            {
                // Prepare the request to MedLLama API
                var requestData = new
                {
                    question = query,
                    userId = userId,
                    includeSuggestions = includeSuggestions
                };
                
                var content = new StringContent(
                    JsonSerializer.Serialize(requestData),
                    Encoding.UTF8,
                    "application/json");
                
                // Send the request to MedLLama API
                var response = await _httpClient.PostAsync($"{_medLLamaApiUrl}/generate", content);
                
                if (response.IsSuccessStatusCode)
                {
                    // Parse the response
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<MedLLamaApiResponse>(
                        responseContent, 
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    
                    // Log the successful interaction
                    LogInteraction(query, result.Response, "medllama", userId);
                    
                    // Return the response
                    return new MedLLamaResponse
                    {
                        Response = result.Response,
                        Source = "medllama",
                        Suggestions = result.Suggestions ?? new List<string>()
                    };
                }
                else
                {
                    _logger.LogWarning("MedLLama API returned status code {StatusCode}", response.StatusCode);
                    
                    if (_fallbackToExisting)
                    {
                        return await FallbackToExistingAsync(query, userId, includeSuggestions);
                    }
                    else
                    {
                        throw new Exception($"MedLLama API returned status code {response.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling MedLLama API");
                
                if (_fallbackToExisting)
                {
                    return await FallbackToExistingAsync(query, userId, includeSuggestions);
                }
                else
                {
                    throw;
                }
            }
        }

        public async Task<MedLLamaHealthStatus> CheckHealthAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_medLLamaApiUrl}/health");
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var healthData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(content);
                    
                    bool modelLoaded = false;
                    if (healthData.TryGetValue("model_status", out var status))
                    {
                        modelLoaded = status.GetString() == "loaded";
                    }
                    
                    _lastHealthCheck = DateTime.UtcNow;
                    _lastHealthStatus = true;
                    
                    return new MedLLamaHealthStatus
                    {
                        IsAvailable = true,
                        ModelLoaded = modelLoaded,
                        ApiStatus = "healthy",
                        Message = modelLoaded ? "MedLLama is ready" : "MedLLama API is available but model is not loaded"
                    };
                }
                else
                {
                    _lastHealthCheck = DateTime.UtcNow;
                    _lastHealthStatus = false;
                    
                    return new MedLLamaHealthStatus
                    {
                        IsAvailable = false,
                        ModelLoaded = false,
                        ApiStatus = $"unhealthy ({response.StatusCode})",
                        Message = $"MedLLama API returned status code {response.StatusCode}"
                    };
                }
            }
            catch (Exception ex)
            {
                _lastHealthCheck = DateTime.UtcNow;
                _lastHealthStatus = false;
                
                _logger.LogError(ex, "Error checking MedLLama health");
                
                return new MedLLamaHealthStatus
                {
                    IsAvailable = false,
                    ModelLoaded = false,
                    ApiStatus = "error",
                    Message = ex.Message
                };
            }
        }

        public void LogFeedback(MedLLamaFeedbackRequest feedback)
        {
            try
            {
                var logEntry = new
                {
                    timestamp = DateTime.UtcNow.ToString("o"),
                    type = "feedback",
                    isHelpful = feedback.IsHelpful,
                    userId = feedback.UserId,
                    query = feedback.Query,
                    response = feedback.Response,
                    comments = feedback.Comments,
                    source = feedback.Source ?? "medllama"
                };
                
                var json = JsonSerializer.Serialize(logEntry, new JsonSerializerOptions
                {
                    WriteIndented = false,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                });
                
                File.AppendAllText(_logFilePath, json + Environment.NewLine);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging MedLLama feedback");
            }
        }

        public bool IsSuitableForMedLLama(string query)
        {
            // Check if the text contains Arabic characters
            bool isArabic = query.Any(c => c >= '\u0600' && c <= '\u06FF');
            
            // Arabic medical keywords
            string[] medicalKeywords = new[]
            {
                "مرض", "طبيب", "صحة", "علاج", "دواء", "صداع", "ألم", "وجع", "حمى", "حرارة",
                "سعال", "التهاب", "عملية", "فحص", "مستشفى", "عيادة", "تحليل", "أشعة", "صيدلية",
                "جراحة", "قلب", "رئة", "كبد", "كلى", "معدة", "أمعاء", "سكري", "ضغط"
            };
            
            // Check if any keywords are present
            string queryLower = query.ToLower();
            bool containsMedicalKeyword = medicalKeywords.Any(keyword => queryLower.Contains(keyword));
            
            return isArabic && containsMedicalKeyword;
        }
        
        private async Task<bool> IsHealthyAsync()
        {
            // Use cached health status if available and recent
            if (DateTime.UtcNow - _lastHealthCheck < _healthCheckCacheDuration)
            {
                return _lastHealthStatus;
            }
            
            // Otherwise, check health
            var status = await CheckHealthAsync();
            return status.IsAvailable && status.ModelLoaded;
        }
        
        private async Task<MedLLamaResponse> FallbackToExistingAsync(string query, string? userId, bool includeSuggestions)
        {
            try
            {
                // Use the existing chatbot service
                var response = await _fallbackChatService.HandleUserMessageAsync(query, userId);
                
                // Log the fallback
                LogInteraction(query, response, "existing_chatbot", userId);
                
                // Get suggestions if needed
                List<string> suggestions = new List<string>();
                if (includeSuggestions)
                {
                    // This would ideally be handled by the fallback service
                    // For now, we'll leave it empty
                }
                
                return new MedLLamaResponse
                {
                    Response = response,
                    Source = "existing_chatbot",
                    Suggestions = suggestions
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in fallback to existing chatbot");
                
                // If everything fails, return a generic response
                return new MedLLamaResponse
                {
                    Response = "عذراً، لم أستطع فهم سؤالك حالياً. يرجى المحاولة مرة أخرى أو التواصل مع طبيب.",
                    Source = "generic_fallback",
                    Suggestions = new List<string>()
                };
            }
        }
        
        private void LogInteraction(string query, string response, string source, string? userId)
        {
            try
            {
                var logEntry = new
                {
                    timestamp = DateTime.UtcNow.ToString("o"),
                    type = "interaction",
                    query = query,
                    response = response,
                    source = source,
                    userId = userId
                };
                
                var json = JsonSerializer.Serialize(logEntry, new JsonSerializerOptions
                {
                    WriteIndented = false,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                });
                
                File.AppendAllText(_logFilePath, json + Environment.NewLine);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging MedLLama interaction");
            }
        }
    }
    
    internal class MedLLamaApiResponse
    {
        public string Response { get; set; }
        public List<string> Suggestions { get; set; }
    }
}
