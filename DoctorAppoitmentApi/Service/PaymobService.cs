using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DoctorAppoitmentApi.Service
{
    public class PaymobService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly string _apiKey;
        private readonly int _integrationId;
        private readonly string _iframeId;
        private readonly bool _useMockPayment;
        private readonly ILogger<PaymobService> _logger;
        private readonly string _currency;

        public PaymobService(HttpClient httpClient, IConfiguration config, ILogger<PaymobService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
            
            // Get configuration from appsettings.json with fallbacks
            _apiKey = config["Paymob:ApiKey"] ?? "";
            _integrationId = config.GetValue<int>("Paymob:IntegrationId", 0);
            _iframeId = config["Paymob:IframeId"] ?? "";
            _useMockPayment = config.GetValue<bool>("Paymob:UseMockPayment", false);
            _currency = config["Paymob:Currency"] ?? "EGP";
            
            // Log configuration (without API key for security)
            _logger.LogInformation($"PaymobService initialized with: IntegrationId={_integrationId}, IframeId={_iframeId}, UseMockPayment={_useMockPayment}");
            
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning("Paymob API key is empty. Payment processing will fail!");
            }
        }

        public async Task<string> GeneratePaymentUrl(int amountCents, int appointmentId, string firstName = "Patient", string lastName = "User")
        {
            try
            {
                _logger.LogInformation($"Generating payment URL for appointment {appointmentId} with amount {amountCents} cents");
                
                // Always attempt to use real Paymob integration first
                // Only fall back to mock if explicit config or if API call fails
                if (!_useMockPayment && !string.IsNullOrEmpty(_apiKey) && _integrationId > 0 && !string.IsNullOrEmpty(_iframeId))
                {
                    try
                    {
                        // Real Paymob integration
                        var token = await GetAuthTokenAsync();
                        _logger.LogInformation("Auth token obtained successfully");
                        
                        var orderId = await CreateOrderAsync(token, amountCents, appointmentId);
                        _logger.LogInformation($"Order created with ID: {orderId}");
                        
                        var paymentToken = await GeneratePaymentKeyAsync(token, orderId, amountCents, firstName, lastName);
                        _logger.LogInformation("Payment key generated successfully");
                        
                        var url = GetIframeUrl(paymentToken);
                        _logger.LogInformation($"Payment URL generated: {url}");
                        
                        return url;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error using real Paymob integration for appointment {appointmentId}. Falling back to mock payment.");
                        // Fall through to mock payment as a fallback
                    }
                }
                else if (_useMockPayment)
                {
                    _logger.LogWarning("Mock payment mode is explicitly enabled in configuration.");
                }
                else
                {
                    _logger.LogWarning("Missing Paymob configuration: ApiKey={ApiKeyExists}, IntegrationId={IntegrationId}, IframeId={IframeIdExists}", 
                        !string.IsNullOrEmpty(_apiKey), 
                        _integrationId, 
                        !string.IsNullOrEmpty(_iframeId));
                }
                
                // Fall back to mock payment
                var mockPaymentUrl = $"/mock-payment.html?appointmentId={appointmentId}&amount={amountCents/100.0}&firstName={firstName}&lastName={lastName}";
                _logger.LogInformation($"Using mock payment URL: {mockPaymentUrl}");
                return mockPaymentUrl;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error generating payment URL for appointment {appointmentId}");
                
                // Fallback to mock payment if Paymob API fails
                _logger.LogWarning("Falling back to mock payment due to unexpected error");
                var mockPaymentUrl = $"/mock-payment.html?appointmentId={appointmentId}&amount={amountCents/100.0}&firstName={firstName}&lastName={lastName}";
                _logger.LogInformation($"Generated fallback mock payment URL: {mockPaymentUrl}");
                return mockPaymentUrl;
            }
        }

        public async Task<string> GetAuthTokenAsync()
        {
            try
            {
                _logger.LogInformation("Getting auth token from Paymob");
                
                // Create the request content
                var request = new
                {
                    api_key = _apiKey
                };
                
                var jsonContent = JsonSerializer.Serialize(request);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                
                // Make the request
                var response = await _httpClient.PostAsync("https://accept.paymob.com/api/auth/tokens", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Auth token request failed with status {response.StatusCode}: {errorContent}");
                    throw new Exception($"Failed to get auth token: {response.StatusCode}");
                }
                
                // Parse the response
                var responseContent = await response.Content.ReadAsStringAsync();
                var authResponse = JsonSerializer.Deserialize<AuthResponse>(responseContent);
                
                if (authResponse == null || string.IsNullOrEmpty(authResponse.token))
                {
                    _logger.LogError("Auth token response was empty or invalid");
                    throw new Exception("Invalid auth token response");
                }
                
                return authResponse.token;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting auth token from Paymob");
                throw;
            }
        }

        public async Task<int> CreateOrderAsync(string token, int amountCents, int appointmentId)
        {
            try
            {
                _logger.LogInformation($"Creating order for appointment {appointmentId} with amount {amountCents}");
                
                // Create the order request
                var order = new
                {
                    auth_token = token,
                    delivery_needed = false,
                    amount_cents = amountCents,
                    currency = _currency,
                    merchant_order_id = appointmentId.ToString(), // Use string to avoid potential int parsing issues
                    items = new object[] { }
                };

                var jsonContent = JsonSerializer.Serialize(order);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                
                var response = await _httpClient.PostAsync("https://accept.paymob.com/api/ecommerce/orders", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Create order request failed with status {response.StatusCode}: {errorContent}");
                    throw new Exception($"Failed to create order: {response.StatusCode}");
                }
                
                // Parse the response
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogDebug($"Order creation response: {responseContent}");
                var orderResponse = JsonSerializer.Deserialize<OrderResponse>(responseContent);
                
                if (orderResponse == null)
                {
                    _logger.LogError("Order response was empty or invalid");
                    throw new Exception("Invalid order response");
                }
                
                return orderResponse.id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating order for appointment {appointmentId}");
                throw;
            }
        }

        public async Task<string> GeneratePaymentKeyAsync(string token, int orderId, int amountCents, string firstName = "Patient", string lastName = "User")
        {
            try
            {
                _logger.LogInformation($"Generating payment key for order {orderId}");
                
                // Check if integration ID is valid
                if (_integrationId <= 0)
                {
                    _logger.LogError($"Invalid integration ID: {_integrationId}");
                    throw new Exception("Invalid Paymob integration ID configuration");
                }
                
                _logger.LogInformation($"Using integration ID: {_integrationId}");

                // Create payment key request
                var paymentKey = new
                {
                    auth_token = token,
                    amount_cents = amountCents,
                    expiration = 3600,
                    order_id = orderId,
                    billing_data = new
                    {
                        apartment = "NA",
                        email = "patient@example.com",
                        floor = "NA",
                        first_name = firstName,
                        street = "NA",
                        building = "NA",
                        phone_number = "01000000000",
                        shipping_method = "NA",
                        postal_code = "NA",
                        city = "Cairo",
                        country = "EG",
                        last_name = lastName,
                        state = "NA"
                    },
                    currency = _currency,
                    integration_id = _integrationId
                };

                var jsonContent = JsonSerializer.Serialize(paymentKey);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                
                // Make the request
                var response = await _httpClient.PostAsync("https://accept.paymob.com/api/acceptance/payment_keys", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Generate payment key request failed with status {response.StatusCode}: {errorContent}");
                    throw new Exception($"Failed to generate payment key: {response.StatusCode}");
                }
                
                // Parse the response
                var responseContent = await response.Content.ReadAsStringAsync();
                var paymentKeyResponse = JsonSerializer.Deserialize<PaymentKeyResponse>(responseContent);
                
                if (paymentKeyResponse == null || string.IsNullOrEmpty(paymentKeyResponse.token))
                {
                    _logger.LogError("Payment key response was empty or invalid");
                    throw new Exception("Invalid payment key response");
                }
                
                return paymentKeyResponse.token;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error generating payment key for order {orderId}");
                throw;
            }
        }

        public string GetIframeUrl(string paymentToken)
        {
            try
            {
                // Check if iframe ID is valid
                if (string.IsNullOrEmpty(_iframeId))
                {
                    _logger.LogError("Paymob iframe ID is not configured");
                    throw new Exception("Invalid Paymob iframe ID configuration");
                }
                
                _logger.LogInformation($"Using iframe ID: {_iframeId}");
                
                var url = $"https://accept.paymob.com/api/acceptance/iframes/{_iframeId}?payment_token={paymentToken}";
                return url;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating iframe URL");
                throw;
            }
        }
    }

    public class AuthResponse
    {
        [JsonPropertyName("token")]
        public string token { get; set; }
    }

    public class OrderResponse
    {
        [JsonPropertyName("id")]
        public int id { get; set; }
    }

    public class PaymentKeyResponse
    {
        [JsonPropertyName("token")]
        public string token { get; set; }
    }
}
