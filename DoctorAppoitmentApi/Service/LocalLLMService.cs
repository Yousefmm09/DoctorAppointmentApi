using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Generic;
using DoctorAppoitmentApi.Service.Models;

namespace DoctorAppoitmentApi.Service
{
    /// <summary>
    /// Interface for interacting with locally hosted large language models
    /// </summary>
    public interface ILocalLLMService
    {
        /// <summary>
        /// Get a response from the locally hosted LLM
        /// </summary>
        Task<string> GetResponseAsync(string prompt);
        
        /// <summary>
        /// Check if the local LLM service is available
        /// </summary>
        Task<bool> IsAvailableAsync();
        
        /// <summary>
        /// Get a response with chat history
        /// </summary>
        Task<string> GetChatResponseWithHistoryAsync(List<OpenAIChatMessage> messages);
    }
    
    /// <summary>
    /// Implementation for interacting with local LLMs like Ollama, LLaMA, etc.
    /// </summary>
    public class LocalLLMService : ILocalLLMService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<LocalLLMService> _logger;
        private readonly IMemoryCache _cache;
        private readonly string _apiEndpoint;
        private readonly string _modelName;
        private readonly int _maxTokens;
        private readonly float _temperature;
        private bool _isInitialized = false;
        
        public LocalLLMService(
            HttpClient httpClient, 
            IConfiguration config, 
            IMemoryCache cache, 
            ILogger<LocalLLMService> logger = null)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
            _cache = cache;
            
            // Load configuration
            _apiEndpoint = _config["LocalLLM:ApiEndpoint"] ?? "http://localhost:11434/api/generate";
            _modelName = _config["LocalLLM:Model"] ?? "medical-llama2";
            _maxTokens = int.Parse(_config["LocalLLM:MaxTokens"] ?? "500");
            _temperature = float.Parse(_config["LocalLLM:Temperature"] ?? "0.7");
        }
        
        /// <summary>
        /// Get a response from the local language model
        /// </summary>
        public async Task<string> GetResponseAsync(string prompt)
        {
            if (string.IsNullOrEmpty(prompt))
                return "الرجاء تقديم سؤال.";
            
            // Try to get from cache
            string cacheKey = $"local_llm_{prompt.GetHashCode()}";
            if (_cache.TryGetValue(cacheKey, out string cachedResponse))
            {
                _logger?.LogInformation("Using cached local LLM response");
                return cachedResponse;
            }
            
            try
            {
                // Check which API format to use (Ollama vs other LLM servers)
                if (_apiEndpoint.Contains("ollama"))
                {
                    return await GetOllamaResponseAsync(prompt);
                }
                else 
                {
                    return await GetGenericLLMResponseAsync(prompt);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error getting response from local LLM: {Message}", ex.Message);
                return "عذراً، لم أستطع الحصول على استجابة من النموذج المحلي.";
            }
        }
        
        /// <summary>
        /// Get a response from Ollama API
        /// </summary>
        private async Task<string> GetOllamaResponseAsync(string prompt)
        {
            var requestData = new
            {
                model = _modelName,
                prompt = prompt,
                stream = false,
                options = new
                {
                    temperature = _temperature,
                    num_predict = _maxTokens
                }
            };
            
            var json = JsonSerializer.Serialize(requestData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync(_apiEndpoint, content);
            response.EnsureSuccessStatusCode();
            
            var responseString = await response.Content.ReadAsStringAsync();
            var responseObj = JsonSerializer.Deserialize<OllamaResponse>(responseString);
            
            // Cache the successful response
            _cache.Set(
                $"local_llm_{prompt.GetHashCode()}", 
                responseObj.Response, 
                TimeSpan.FromHours(1)
            );
            
            return responseObj.Response;
        }
        
        /// <summary>
        /// Get a response from a generic LLM API
        /// </summary>
        private async Task<string> GetGenericLLMResponseAsync(string prompt)
        {
            var requestData = new
            {
                prompt = prompt,
                max_tokens = _maxTokens,
                temperature = _temperature
            };
            
            var json = JsonSerializer.Serialize(requestData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync(_apiEndpoint, content);
            response.EnsureSuccessStatusCode();
            
            var responseString = await response.Content.ReadAsStringAsync();
            var responseObj = JsonSerializer.Deserialize<GenericLLMResponse>(responseString);
            
            // Cache the successful response
            _cache.Set(
                $"local_llm_{prompt.GetHashCode()}", 
                responseObj.Text, 
                TimeSpan.FromHours(1)
            );
            
            return responseObj.Text;
        }
        
        /// <summary>
        /// Check if the local LLM service is available
        /// </summary>
        public async Task<bool> IsAvailableAsync()
        {
            try
            {
                if (_apiEndpoint.Contains("ollama"))
                {
                    // For Ollama, check list models endpoint
                    var response = await _httpClient.GetAsync(_apiEndpoint.Replace("/api/generate", "/api/tags"));
                    return response.IsSuccessStatusCode;
                }
                else
                {
                    // For other LLM servers, try a simple health check
                    var response = await _httpClient.GetAsync(_apiEndpoint.Split('/')[0] + "/health");
                    return response.IsSuccessStatusCode;
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Local LLM service not available: {Message}", ex.Message);
                return false;
            }
        }
        
        /// <summary>
        /// Get a chat response with history in OpenAI-like format
        /// </summary>
        public async Task<string> GetChatResponseWithHistoryAsync(List<OpenAIChatMessage> messages)
        {
            if (messages == null || messages.Count == 0)
                return "الرجاء تقديم رسالة.";
                
            try
            {
                // Format messages into a prompt the local model can understand
                var formattedPrompt = FormatMessagesAsPrompt(messages);
                return await GetResponseAsync(formattedPrompt);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error getting chat response from local LLM");
                return "عذراً، حدث خطأ أثناء معالجة المحادثة.";
            }
        }
        
        /// <summary>
        /// Format chat messages into a prompt for local models
        /// </summary>
        private string FormatMessagesAsPrompt(List<OpenAIChatMessage> messages)
        {
            var sb = new StringBuilder();
            
            // Extract system message if present
            var systemMessage = messages.Find(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            if (systemMessage != null)
            {
                sb.AppendLine("### Instructions:");
                sb.AppendLine(systemMessage.Content);
                sb.AppendLine();
            }
            
            // Format conversation
            sb.AppendLine("### Conversation:");
            foreach (var message in messages.Where(m => m.Role != "system"))
            {
                string roleLabel = message.Role.Equals("user", StringComparison.OrdinalIgnoreCase) 
                    ? "Human" : "Assistant";
                    
                sb.AppendLine($"{roleLabel}: {message.Content}");
            }
            
            sb.AppendLine("Assistant:");
            
            return sb.ToString();
        }
    }
    
    // Response classes for different LLM APIs
    
    public class OllamaResponse
    {
        public string Model { get; set; }
        public string Response { get; set; }
    }
    
    public class GenericLLMResponse
    {
        public string Text { get; set; }
    }
} 