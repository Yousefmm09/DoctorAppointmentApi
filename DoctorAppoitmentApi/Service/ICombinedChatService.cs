using System.Threading.Tasks;

namespace DoctorAppoitmentApi.Service
{
    public interface ICombinedChatService
    {
        /// <summary>
        /// معالجة رسالة المستخدم وتوجيهها للخدمة المناسبة
        /// </summary>
        /// <param name="message">رسالة المستخدم</param>
        /// <param name="userId">معرف المستخدم (اختياري)</param>
        /// <returns>استجابة من النظام المناسب</returns>
        Task<string> HandleUserMessageAsync(string message, string? userId = null);

        void ClearConversationHistory(string userId);

        void ToggleFallbackMode(bool enable);
    }
} 