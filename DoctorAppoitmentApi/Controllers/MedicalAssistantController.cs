using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using DoctorAppoitmentApi.Service;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace DoctorAppoitmentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MedicalAssistantController : ControllerBase
    {
        private readonly ILocalKnowledgeBase _knowledgeBase;
        private readonly ILogger<MedicalAssistantController> _logger;

        public MedicalAssistantController(
            ILocalKnowledgeBase knowledgeBase,
            ILogger<MedicalAssistantController> logger)
        {
            _knowledgeBase = knowledgeBase;
            _logger = logger;
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] MedicalChatRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Message))
                {
                    return BadRequest(new { error = "Message cannot be empty" });
                }

                // Get response from knowledge base
                var (matched, response) = await _knowledgeBase.GetResponseAsync(request.Message, request.UserId);

                if (!matched)
                {
                    // If no direct match, try to get medical advice based on symptoms
                    (matched, response) = await _knowledgeBase.GetMedicalAdviceAsync(request.Message);
                }

                // Get suggested follow-up questions
                var suggestions = await _knowledgeBase.GetSuggestedQuestionsAsync(request.Message);

                // Detect specialty if needed
                var (specialty, confidence) = await _knowledgeBase.DetectSpecialtyAsync(request.Message);

                return Ok(new
                {
                    response,
                    suggestions,
                    detectedSpecialty = new { specialty, confidence },
                    matched
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat request");
                return StatusCode(500, new { error = "An error occurred while processing your request" });
            }
        }

        [HttpPost("book-appointment")]
        public async Task<IActionResult> BookAppointment([FromBody] AppointmentRequest request)
        {
            try
            {
                var (success, message) = await _knowledgeBase.InitiateAppointmentBooking(
                    request.UserId,
                    request.DoctorId);

                return Ok(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating appointment booking");
                return StatusCode(500, new { error = "An error occurred while initiating the appointment" });
            }
        }

        [HttpPost("process-booking")]
        public async Task<IActionResult> ProcessBooking([FromBody] ProcessBookingRequest request)
        {
            try
            {
                var (success, message) = await _knowledgeBase.ProcessAppointmentBooking(
                    request.UserId,
                    request.UserInput,
                    request.CurrentState);

                return Ok(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing appointment booking");
                return StatusCode(500, new { error = "An error occurred while processing the appointment" });
            }
        }

        [HttpGet("medical-info/{condition}")]
        public IActionResult GetMedicalInfo(string condition)
        {
            try
            {
                var info = _knowledgeBase.GetMedicalInformation(condition);
                return Ok(new { info });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving medical information");
                return StatusCode(500, new { error = "An error occurred while retrieving medical information" });
            }
        }

        [HttpGet("follow-up-questions/{specialty}")]
        public async Task<IActionResult> GetFollowUpQuestions(string specialty)
        {
            try
            {
                var questions = await _knowledgeBase.GetFollowUpQuestionsAsync(specialty);
                return Ok(new { questions });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving follow-up questions");
                return StatusCode(500, new { error = "An error occurred while retrieving follow-up questions" });
            }
        }
    }

    public class MedicalChatRequest
    {
        public string Message { get; set; }
        public string? UserId { get; set; }
    }

    public class AppointmentRequest
    {
        public string UserId { get; set; }
        public int DoctorId { get; set; }
    }

    public class ProcessBookingRequest
    {
        public string UserId { get; set; }
        public string UserInput { get; set; }
        public string CurrentState { get; set; }
    }
} 