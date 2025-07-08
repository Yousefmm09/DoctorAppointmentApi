using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Net.Http.Json;
using System.Collections.Generic;
using System.Web;

namespace DoctorAppoitmentApi.Service
{
    public interface ISmsService
    {
        Task<bool> SendVerificationCodeAsync(string phoneNumber, string verificationCode);
        string GenerateVerificationCode();
    }

    public class SmsService : ISmsService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SmsService> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _smsUsername;
        private readonly string _smsPassword;
        private readonly string _smsSender;
        
        // In-memory storage for verification codes (in production, use a more persistent storage)
        private static Dictionary<string, VerificationCodeInfo> _verificationCodes = new Dictionary<string, VerificationCodeInfo>();

        public SmsService(IConfiguration configuration, ILogger<SmsService> logger, HttpClient httpClient)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClient = httpClient;
            
            // Get SMS API configuration (set these in appsettings.json)
            _smsUsername = _configuration["SmsSettings:Username"];
            _smsPassword = _configuration["SmsSettings:Password"];
            _smsSender = _configuration["SmsSettings:Sender"];
            
            // Log configuration (without sensitive info for security)
            _logger.LogInformation($"SMS service initialized with: Username={_smsUsername}, Sender={_smsSender}");
        }

        public async Task<bool> SendVerificationCodeAsync(string phoneNumber, string verificationCode)
        {
            try
            {
                _logger.LogInformation($"Preparing to send verification code to {phoneNumber}");
                
                // Store verification code for later validation
                StoreVerificationCode(phoneNumber, verificationCode);
                
                // For development/testing, just log the code instead of actually sending SMS
                if (_configuration.GetValue<bool>("SmsSettings:UseDevelopmentMode", true))
                {
                    _logger.LogWarning($"DEVELOPMENT MODE: Verification code for {phoneNumber}: {verificationCode}");
                    return true;
                }
                
                // Ensure phone number is in the correct format (remove + sign and ensure starts with country code)
                string formattedPhone = phoneNumber.TrimStart('+');
                
                // Create the message content
                string message = $"Your verification code is: {verificationCode}. This code will expire in 10 minutes.";
                
                // Build the SMS Misr API URL with query parameters
                string apiUrl = "https://smsmisr.com/api/webapi/";
                
                // Build query parameters
                var queryParams = new Dictionary<string, string>
                {
                    { "username", _smsUsername },
                    { "password", _smsPassword },
                    { "language", "1" }, // 1 for English, 2 for Arabic
                    { "sender", _smsSender },
                    { "mobile", formattedPhone },
                    { "message", message }
                };
                
                // Construct the full URL with query parameters
                var uriBuilder = new UriBuilder(apiUrl);
                var query = HttpUtility.ParseQueryString(string.Empty);
                
                foreach (var param in queryParams)
                {
                    query[param.Key] = param.Value;
                }
                
                uriBuilder.Query = query.ToString();
                
                // Send the request to the SMS API
                var response = await _httpClient.GetAsync(uriBuilder.Uri);
                
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation($"SMS verification code sent successfully to {phoneNumber}. Response: {responseContent}");
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Failed to send SMS. Status: {response.StatusCode}, Error: {errorContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending SMS to {phoneNumber}: {ex.Message}");
                return false;
            }
        }

        public string GenerateVerificationCode()
        {
            // Generate a 6-digit verification code
            Random random = new Random();
            return random.Next(100000, 999999).ToString();
        }
        
        private void StoreVerificationCode(string phoneNumber, string code)
        {
            // Store the code with an expiration time (10 minutes from now)
            _verificationCodes[phoneNumber] = new VerificationCodeInfo
            {
                Code = code,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10)
            };
        }
        
        public static bool ValidateVerificationCode(string phoneNumber, string code)
        {
            if (_verificationCodes.TryGetValue(phoneNumber, out var codeInfo))
            {
                // Check if code is correct and not expired
                if (codeInfo.Code == code && codeInfo.ExpiresAt > DateTime.UtcNow)
                {
                    // Remove the code once verified
                    _verificationCodes.Remove(phoneNumber);
                    return true;
                }
            }
            
            return false;
        }
        
        private class VerificationCodeInfo
        {
            public string Code { get; set; }
            public DateTime ExpiresAt { get; set; }
        }
    }
} 