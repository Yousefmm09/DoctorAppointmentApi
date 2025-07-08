using System.Threading.Tasks;
using DoctorAppoitmentApi.Controllers;
using System.Collections.Generic;

namespace DoctorAppoitmentApi.Service
{
    public interface IMedLLamaService
    {
        /// <summary>
        /// Process a user query using MedLLama or fall back to the existing system
        /// </summary>
        /// <param name="query">The user's query text</param>
        /// <param name="userId">Optional user ID for context</param>
        /// <param name="includeSuggestions">Whether to include suggested follow-up questions</param>
        /// <returns>Response with answer and optional suggestions</returns>
        Task<MedLLamaResponse> ProcessQueryAsync(string query, string? userId = null, bool includeSuggestions = false);

        /// <summary>
        /// Check if the MedLLama service is healthy and available
        /// </summary>
        /// <returns>Status information about the MedLLama service</returns>
        Task<MedLLamaHealthStatus> CheckHealthAsync();

        /// <summary>
        /// Log feedback for a MedLLama response
        /// </summary>
        /// <param name="feedback">The feedback data</param>
        void LogFeedback(MedLLamaFeedbackRequest feedback);

        /// <summary>
        /// Determine if a query is suitable for processing with MedLLama
        /// </summary>
        /// <param name="query">The user's query text</param>
        /// <returns>True if the query should be processed by MedLLama</returns>
        bool IsSuitableForMedLLama(string query);
    }

    public class MedLLamaResponse
    {
        public string Response { get; set; }
        public string Source { get; set; } = "medllama";
        public List<string> Suggestions { get; set; } = new List<string>();
    }

    public class MedLLamaHealthStatus
    {
        public bool IsAvailable { get; set; }
        public bool ModelLoaded { get; set; }
        public string ApiStatus { get; set; }
        public string Message { get; set; }
    }
} 