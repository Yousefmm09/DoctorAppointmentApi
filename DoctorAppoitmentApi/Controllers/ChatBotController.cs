using DoctorAppoitmentApi.Service;
using DoctorAppoitmentApi.Dto;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace DoctorAppoitmentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatBotController : ControllerBase
    {
        private readonly IOpenAIService _openAIService;
        private readonly IRAGService _ragService;
        private readonly ILogger<ChatBotController> _logger;

        public ChatBotController(
            IOpenAIService openAIService,
            IRAGService ragService,
            ILogger<ChatBotController> logger)
        {
            _openAIService = openAIService;
            _ragService = ragService;
            _logger = logger;
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Message))
                {
                    return BadRequest("Message cannot be empty");
                }

                // Get relevant context from the database using RAG
                var context = await _ragService.GetRelevantContext(request.Message);

                // Prepare the enhanced prompt with context
                var enhancedPrompt = $"Context:\n{context}\n\nUser Query: {request.Message}\n\nPlease provide a helpful response based on the context above and your general knowledge. If the context contains relevant information, use it to provide specific details. If not, provide a general response.";

                // Get response from OpenAI
                var response = await _openAIService.GetChatResponseAsync(enhancedPrompt);

                return Ok(new { response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat request");
                return StatusCode(500, "An error occurred while processing your request");
            }
        }

        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { status = "ChatBot service is running" });
        }
    }
}
