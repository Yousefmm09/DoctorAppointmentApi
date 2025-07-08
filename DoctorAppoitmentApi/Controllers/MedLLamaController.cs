using DoctorAppoitmentApi.Service;
using DoctorAppoitmentApi.Dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Cors;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace DoctorAppoitmentApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("AllowReactApp")]
    public class MedLLamaController : ControllerBase
    {
        private readonly IMedLLamaService _medLLamaService;
        private readonly ICombinedChatService _chatService;
        private readonly ILogger<MedLLamaController> _logger;

        public MedLLamaController(
            IMedLLamaService medLLamaService,
            ICombinedChatService chatService,
            ILogger<MedLLamaController> logger)
        {
            _medLLamaService = medLLamaService;
            _chatService = chatService;
            _logger = logger;
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
                _logger.LogInformation("Received MedLLama chat request from user {UserId}: {Message}", 
                    request.UserId ?? "anonymous", 
                    request.Message.Length > 50 ? request.Message.Substring(0, 50) + "..." : request.Message);
                
                var result = await _medLLamaService.ProcessQueryAsync(
                    request.Message, 
                    request.UserId, 
                    request.IncludeSuggestions);
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in MedLLama chat endpoint");
                return StatusCode(500, new { 
                    error = "An error occurred while processing your request. حدث خطأ أثناء معالجة طلبك.",
                    details = ex.Message 
                });
            }
        }

        [HttpGet("health")]
        public async Task<IActionResult> HealthCheck()
        {
            try
            {
                var status = await _medLLamaService.CheckHealthAsync();
                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking MedLLama health");
                return StatusCode(500, new { 
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpPost("feedback")]
        public IActionResult SubmitFeedback([FromBody] MedLLamaFeedbackRequest request)
        {
            if (string.IsNullOrEmpty(request?.Response))
            {
                return BadRequest(new { error = "Response feedback is required" });
            }

            try
            {
                _medLLamaService.LogFeedback(request);
                
                _logger.LogInformation("MedLLama feedback received: IsHelpful={IsHelpful}, UserId={UserId}, Query={Query}",
                    request.IsHelpful,
                    request.UserId ?? "anonymous",
                    request.Query?.Length > 30 ? request.Query.Substring(0, 30) + "..." : request.Query);
                
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting MedLLama feedback");
                return StatusCode(500, new { error = "Error submitting feedback" });
            }
        }
    }

    public class MedLLamaFeedbackRequest
    {
        public bool IsHelpful { get; set; }
        public string? UserId { get; set; }
        public string? Query { get; set; }
        public string Response { get; set; }
        public string? Comments { get; set; }
        public string? Source { get; set; }
    }
} 