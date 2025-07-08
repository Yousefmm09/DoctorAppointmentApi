using System.Threading.Tasks;
using DoctorAppoitmentApi.Service;
using DoctorAppoitmentApi.Dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using Microsoft.AspNetCore.Cors;
using System.Collections.Generic;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("AllowReactApp")]
    public class AdvancedChatBotController : ControllerBase
    {
        private readonly ICombinedChatService _chatService;
        private readonly ILogger<AdvancedChatBotController> _logger;

        public AdvancedChatBotController(ICombinedChatService chatService, ILogger<AdvancedChatBotController> logger)
        {
            _chatService = chatService;
            _logger = logger;
        }

        /// <summary>
        /// Test endpoint to validate OpenAI API key
        /// </summary>
        [HttpGet("test-key")]
        public async Task<IActionResult> TestApiKey()
        {
            try
            {
                // Test both English and Arabic
                var englishResponse = await _chatService.HandleUserMessageAsync("Hello, can you help me find a doctor?");
                var arabicResponse = await _chatService.HandleUserMessageAsync("مرحبا، هل يمكنك مساعدتي في العثور على طبيب؟");

                return Ok(new
                {
                    status = "success",
                    englishTest = englishResponse,
                    arabicTest = arabicResponse
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing API key");
                return StatusCode(500, new { error = "Error testing API key", details = ex.Message });
            }
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            if (string.IsNullOrEmpty(request?.Message))
            {
                return BadRequest(new { error = "Message is required. الرسالة مطلوبة." });
            }

            try
            {
                _logger.LogInformation("Received chat request from user {UserId}: {Message}", 
                    request.UserId ?? "anonymous", 
                    request.Message.Length > 50 ? request.Message.Substring(0, 50) + "..." : request.Message);
                
                var response = await _chatService.HandleUserMessageAsync(request.Message, request.UserId);
                
                // Enrich response with suggested questions if appropriate
                if (request.IncludeSuggestions && !IsAppointmentBookingResponse(response))
                {
                    var suggestions = await GetSuggestedQuestions(request.Message, response);
                    return Ok(new { 
                        response,
                        suggestions
                    });
                }
                
                return Ok(new { response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in chat endpoint");
                return StatusCode(500, new { 
                    error = "An error occurred while processing your request. حدث خطأ أثناء معالجة طلبك.",
                    details = ex.Message 
                });
            }
        }
        
        [HttpPost("clear-history")]
        public IActionResult ClearHistory([FromBody] ClearHistoryRequest request)
        {
            if (string.IsNullOrEmpty(request?.UserId))
            {
                return BadRequest(new { error = "UserId is required. معرف المستخدم مطلوب." });
            }

            try
            {
                _chatService.ClearConversationHistory(request.UserId);
                return Ok(new { success = true, message = "Conversation history cleared" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing conversation history");
                return StatusCode(500, new { error = "Error clearing conversation history", details = ex.Message });
            }
        }
        
        [HttpPost("feedback")]
        public IActionResult SubmitFeedback([FromBody] FeedbackRequest request)
        {
            if (string.IsNullOrEmpty(request?.Response))
            {
                return BadRequest(new { error = "Response feedback is required" });
            }

            try
            {
                // Log feedback for later analysis and improvement
                _logger.LogInformation("Chatbot feedback received: IsHelpful={IsHelpful}, UserId={UserId}, Query={Query}, Response={Response}, Comments={Comments}",
                    request.IsHelpful,
                    request.UserId ?? "anonymous",
                    request.Query?.Length > 30 ? request.Query.Substring(0, 30) + "..." : request.Query,
                    request.Response?.Length > 30 ? request.Response.Substring(0, 30) + "..." : request.Response,
                    request.Comments);
                
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting feedback");
                return StatusCode(500, new { error = "Error submitting feedback" });
            }
        }
        
        private bool IsAppointmentBookingResponse(string response)
        {
            // Detect if this is an appointment booking flow to avoid showing suggestions
            string normalizedResponse = response.ToLower();
            
            string[] bookingKeywords = new[] {
                "would you like to book", "book an appointment", "appointment with", "available doctors",
                "هل ترغب في حجز", "حجز موعد", "موعد مع", "الأطباء المتاحين"
            };
            
            return bookingKeywords.Any(keyword => normalizedResponse.Contains(keyword.ToLower()));
        }
        
        private async Task<List<string>> GetSuggestedQuestions(string message, string response)
        {
            try
            {
                // Get suggested follow-up questions based on the current message and response
                const string suggestionsPrompt = @"Based on the user's message and your response, suggest 3 natural follow-up questions that the user might want to ask next. Return ONLY the questions in plain text, one per line, with no numbering or bullet points.

User message: {0}

Your response: {1}";
                
                var prompt = string.Format(suggestionsPrompt, message, response);
                var suggestionsResponse = await _chatService.HandleUserMessageAsync(prompt, null);
                
                // Parse the suggestions (one per line)
                var suggestions = suggestionsResponse?.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s => s.Trim('-', ' ', '*', '•'))
                    .Where(s => s.Length > 0)
                    .Take(3)
                    .ToList();
                
                return suggestions ?? new List<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating suggested questions");
                return new List<string>();
            }
        }
    }

    public class ChatRequest
    {
        public string Message { get; set; }
        public string? UserId { get; set; }
        public bool IncludeSuggestions { get; set; } = false;
    }
    
    public class ClearHistoryRequest
    {
        public string UserId { get; set; }
    }
    
    public class FeedbackRequest
    {
        public bool IsHelpful { get; set; }
        public string? UserId { get; set; }
        public string? Query { get; set; }
        public string Response { get; set; }
        public string? Comments { get; set; }
    }
} 