using System.Threading.Tasks;
using System.Collections.Generic;
using DoctorAppoitmentApi.Service.Models;

namespace DoctorAppoitmentApi.Service
{
    public interface IOpenAIService
    {
        /// <summary>
        /// Get a response for a single user message with no history
        /// </summary>
        Task<string> GetChatResponseAsync(string message);
        
        /// <summary>
        /// Get a response for a conversation with history
        /// </summary>
        Task<string> GetChatResponseWithHistoryAsync(List<OpenAIChatMessage> messages);
        
        /// <summary>
        /// Generate text embeddings for semantic search capabilities
        /// </summary>
        Task<float[]> GenerateEmbeddingAsync(string text);
    }
} 