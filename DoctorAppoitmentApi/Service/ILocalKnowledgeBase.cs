public interface ILocalKnowledgeBase
{
    Task<(bool matched, string response)> GetResponseAsync(string query, string? userId = null);
    Task<(bool matched, string response)> GetMedicalAdviceAsync(string symptoms);
    Task<List<string>> GetSuggestedQuestionsAsync(string currentQuery);
    Task<(bool success, string message)> InitiateAppointmentBooking(string userId, int doctorId);
    Task<(bool success, string message)> ProcessAppointmentBooking(string userId, string userInput, string currentState);
    Task<string> GetFollowUpQuestionsAsync(string specialty);
    string GetMedicalInformation(string condition);
    Task<(string specialty, float confidence)> DetectSpecialtyAsync(string query);
    Task<(bool matched, string response)> GetPatientSpecificResponseAsync(string query, string userId);
    
    // New methods for enhanced functionality
    Task<(bool matched, string response, List<string> suggestedFollowUp)> GetEnhancedMedicalAdviceAsync(string symptoms, string userId);
    Task<(string preliminaryDiagnosis, List<string> possibleConditions, string urgencyLevel)> GeneratePreliminaryDiagnosisAsync(string symptoms, string medicalHistory);
    Task<string> GetEmpatheticGreetingAsync(string userId, TimeSpan? timeOfDay = null);
    Task<List<string>> GetDetailedSymptomQuestionsAsync(string initialSymptom);
    Task<(bool success, string appointmentDetails)> SendAppointmentReminderAsync(string userId, int appointmentId);
    Task<string> GetPatientMedicalHistoryAsync(string userId);
    Task<(bool success, string message)> RecordSymptomHistoryAsync(string userId, string symptoms, string severity);
    Task<List<(string doctorName, int doctorId, DateTime nextAvailable)>> GetRecommendedDoctorsAsync(string specialty, string userId);
    Task<string> GenerateSafetyInstructionsAsync(string symptoms, string urgencyLevel);
} 