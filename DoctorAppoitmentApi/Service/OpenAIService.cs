using DoctorAppoitmentApi.Service;
using DoctorAppoitmentApi.Service.Models;
using System.Text.Json;
using System.Text;
using System.Collections.Generic;
using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

public class OpenAIService : IOpenAIService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly IConfiguration _config;
    private readonly ILogger<OpenAIService> _logger;
    private readonly Random _jitterRandom = new Random();
    private bool _isKeyValidated = false;

    public OpenAIService(IConfiguration config, HttpClient httpClient, ILogger<OpenAIService> logger = null)
    {
        _httpClient = httpClient;
        _config = config;
        _apiKey = config["OpenAI:ApiKey"];
        _logger = logger;
        
        // Use environment variable as fallback if the config is empty
        if (string.IsNullOrEmpty(_apiKey))
        {
            _apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            _logger?.LogInformation("Using API key from environment variable");
        }
        
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger?.LogError("OpenAI API key is missing in configuration");
            throw new InvalidOperationException("OpenAI API key is not configured. Please set the OpenAI:ApiKey in configuration or OPENAI_API_KEY environment variable.");
        }
    }

    public async Task<string> GetChatResponseAsync(string message)
    {
        return await GetChatResponseWithHistoryAsync(new List<OpenAIChatMessage> { 
            new OpenAIChatMessage { Role = "user", Content = message } 
        });
    }

    public async Task<string> GetChatResponseWithHistoryAsync(List<OpenAIChatMessage> messages)
    {
        try
        {
            // First check if this is a simple greeting or common Arabic request that we can handle without API
            if (messages.Count == 1 && messages[0].Role == "user")
            {
                string userMessage = messages[0].Content.ToLower().Trim();
                
                // Common greetings - bypass API call
                if (userMessage == "hi" || userMessage == "hello" || userMessage == "hey" || userMessage == "اهلا")
                {
                    return "Hello! I'm your doctor appointment assistant. How can I help you today?";
                }
                
                // Broader Arabic heart doctor pattern matching
                if ((userMessage.Contains("دكتور") || userMessage.Contains("طبيب")) && 
                    (userMessage.Contains("قلب") || userMessage.Contains("للقلب")))
                {
                    _logger?.LogInformation("OpenAIService: Arabic heart doctor pattern matched (broader pattern)");
                    return "لدينا العديد من أطباء القلب المتخصصين. يمكنك تصفح التخصص 'أمراض القلب' في قسم الأطباء لمعرفة المزيد والحجز.";
                }
                
                // Heart doctor in Arabic - exact matching - bypass API call
                if (userMessage.Contains("عايز دكتور للقلب") || userMessage.Contains("دكتور قلب") || userMessage.Contains("طبيب قلب") || userMessage.Contains("عايز دكتور قلب"))
                {
                    _logger?.LogInformation("OpenAIService: Arabic heart doctor pattern matched (exact pattern)");
                    return "لدينا العديد من أطباء القلب المتخصصين. يمكنك تصفح التخصص 'أمراض القلب' في قسم الأطباء لمعرفة المزيد والحجز.";
                }
                
                // Add more patterns to reduce API usage
                if (userMessage.Contains("appointment") || userMessage.Contains("book") || userMessage.Contains("schedule") || userMessage.Contains("حجز"))
                {
                    return "To book an appointment, please navigate to the Doctors section, choose a doctor, and select an available time slot.";
                }
                
                if (userMessage.Contains("doctor") || userMessage.Contains("specialist"))
                {
                    return "We have many qualified doctors in different specialties. You can browse them in the Doctors section.";
                }
            }

            // Check for API key before making any requests
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger?.LogError("Cannot proceed with API request: No API key available");
                throw new InvalidOperationException("OpenAI API key is not configured");
            }

            // Validate API key if not already done
            if (!_isKeyValidated)
            {
                try {
                    bool isValid = await ValidateApiKeyAsync();
                    if (!isValid)
                    {
                        _logger?.LogError("OpenAI API key validation failed");
                        throw new UnauthorizedAccessException("Invalid OpenAI API key");
                    }
                    _isKeyValidated = true;
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Error validating API key");
                    throw;
                }
            }

            // Add system message to provide context for medical domain
            string systemPrompt = _config["OpenAI:SystemPromptTemplate"] ?? 
                "You are a helpful medical assistant for a doctor appointment system. " +
                "Provide concise, accurate information about medical topics, doctors, " +
                "appointments, and general health inquiries. Remember to be professional " +
                "and empathetic. Do not provide specific medical advice or diagnoses.";
                
            var systemMessage = new OpenAIChatMessage 
            { 
                Role = "system", 
                Content = systemPrompt
            };
            
            var allMessages = new List<OpenAIChatMessage> { systemMessage };
            allMessages.AddRange(messages);

            // Log the request (without API key)
            _logger?.LogInformation("Sending request to OpenAI API with {MessageCount} messages", allMessages.Count);
            
            var model = _config["OpenAI:Model"] ?? "gpt-3.5-turbo-0125";
            var maxTokens = int.Parse(_config["OpenAI:MaxTokens"] ?? "150");
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
            int initialDelay = int.Parse(_config["OpenAI:RateLimitDelayMs"] ?? "2000");

            while (true)
            {
                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                request.Content = jsonContent;

                try
                {
                    var response = await _httpClient.SendAsync(request);

                    // Handle rate limiting (429 Too Many Requests)
                    if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                    {
                        if (retries >= maxRetries)
                        {
                            throw new Exception("Service is experiencing high traffic. Please try again later.");
                        }

                        // Calculate delay with exponential backoff and jitter
                        int delay = initialDelay * (int)Math.Pow(2, retries);
                        int jitter = _jitterRandom.Next(0, delay / 2);
                        delay += jitter;

                        _logger?.LogInformation("Rate limited by OpenAI API. Retrying in {DelayMs}ms (Attempt {Retry}/{MaxRetries})", 
                            delay, retries + 1, maxRetries);

                        await Task.Delay(delay);
                        retries++;
                        continue;
                    }
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        _logger?.LogError("OpenAI API error: {StatusCode} - {Content}", response.StatusCode, errorContent);
                        
                        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                        {
                            throw new UnauthorizedAccessException("Invalid OpenAI API key");
                        }
                        
                        throw new Exception($"OpenAI API error: {response.StatusCode}");
                    }

                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<dynamic>(jsonResponse);
                    string messageContent = result.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

                    return messageContent;
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Error calling OpenAI API");
                    throw;
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error in GetChatResponseWithHistoryAsync");
            throw;
        }
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
            // Make a simple models list request to validate the API key
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
    /// Generate text embeddings for semantic search capabilities
    /// </summary>
    public async Task<float[]> GenerateEmbeddingAsync(string text)
    {
        if (string.IsNullOrEmpty(text)) return Array.Empty<float>();
        
        // Check for API key before making any requests
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger?.LogError("Cannot generate embedding: No API key available");
            return Array.Empty<float>();
        }

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
}
