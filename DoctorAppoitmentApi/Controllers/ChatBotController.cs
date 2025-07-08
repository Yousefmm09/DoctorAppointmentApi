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

                // Check if there's medical information related to the query
                var (hasInfo, medicalInfo) = await _ragService.GetMedicalInformation(request.Message);
                if (hasInfo)
                {
                    context = $"{medicalInfo}\n\n{context}";
                }

                // Check if the user is asking about symptoms or conditions
                if (IsMedicalQuery(request.Message))
                {
                    // Prepare a more detailed medical prompt
                    var enhancedPrompt = CreateMedicalPrompt(request.Message, context);
                    
                    // Get response from OpenAI
                    var response = await _openAIService.GetChatResponseAsync(enhancedPrompt);

                    // Get related topics that might be helpful
                    var relatedTopics = await _ragService.GetRelatedMedicalTopics(request.Message);
                    if (relatedTopics.Any())
                    {
                        response += $"\n\nقد تكون مهتمًا أيضًا بمعرفة المزيد عن: {string.Join(", ", relatedTopics.Take(3))}";
                    }

                    return Ok(new { response });
                }
                else
                {
                    // Prepare the enhanced prompt with context
                    var enhancedPrompt = $"Context:\n{context}\n\nUser Query: {request.Message}\n\nPlease provide a helpful response based on the context above and your general knowledge. If the context contains relevant information, use it to provide specific details. If not, provide a general response. Use a natural, conversational tone similar to Hume AI. If the query is in Arabic, respond in Arabic; otherwise, respond in English.";

                    // Get response from OpenAI
                    var response = await _openAIService.GetChatResponseAsync(enhancedPrompt);

                    return Ok(new { response });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat request");
                return StatusCode(500, "An error occurred while processing your request");
            }
        }

        private bool IsMedicalQuery(string message)
        {
            string normalizedQuery = message.ToLower();
            
            // Check for medical keywords in English and Arabic
            string[] medicalKeywords = new[] { 
                "pain", "symptom", "disease", "treatment", "doctor", "hospital", "medicine", "health",
                "مرض", "علاج", "ألم", "وجع", "أعراض", "صداع", "طبيب", "دكتور", "مستشفى", "صحة"
            };
            
            return medicalKeywords.Any(keyword => normalizedQuery.Contains(keyword));
        }
        
        private string CreateMedicalPrompt(string query, string context)
        {
            bool isArabic = query.Any(c => c >= '\u0600' && c <= '\u06FF');
            
            string systemInstruction = isArabic
                ? "أنت مساعد طبي متخصص يحاكي قدرات Hume AI، تتمتع بمعرفة طبية واسعة وتقدم معلومات دقيقة وموثوقة. بإمكانك الإجابة على جميع الأسئلة المتعلقة بالصحة والطب بطريقة إنسانية ومتعاطفة."
                : "You are a specialized medical assistant modeled after Hume AI capabilities, with extensive medical knowledge providing accurate and reliable information. You can answer all health and medical questions in a human-like, empathetic manner.";
                
            string prompt = $"System: {systemInstruction}\n\n" +
                           $"Context Information:\n{context}\n\n" +
                           $"User Query: {query}\n\n" +
                           "Instructions: Provide a helpful and accurate response to the user's query based on the context provided and your medical knowledge. Be conversational and empathetic in your response. Always mention that the user should consult a healthcare professional for specific medical advice. If the query is in Arabic, respond in Arabic; otherwise, respond in English.";
                           
            return prompt;
        }

        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { status = "ChatBot service is running" });
        }
    }
}
