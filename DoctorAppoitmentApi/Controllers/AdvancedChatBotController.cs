using System.Threading.Tasks;
using DoctorAppoitmentApi.Service;
using DoctorAppoitmentApi.Dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
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
                var response = await _chatService.HandleUserMessageAsync(request.Message, request.UserId);
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

        // ... existing endpoints ...
    }

    public class ChatRequest
    {
        public string Message { get; set; }
        public string? UserId { get; set; }
    }
} 