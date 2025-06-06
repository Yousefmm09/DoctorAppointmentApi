using DoctorAppointmentApi.Models;
using System;
namespace DoctorAppointmentApi.Models
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public int? DoctorSenderId { get; set; }
        public virtual Doctors DoctorSender { get; set; }
        public int? PatientSenderId { get; set; }
        public virtual Patient PatientSender { get; set; }
        public int? DoctorReceiverId { get; set; }
        public virtual Doctors DoctorReceiver { get; set; }
        public int? PatientReceiverId { get; set; }
        public virtual Patient PatientReceiver { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
        public bool IsRead { get; set; } = false;
        public DateTime? ReadAt { get; set; }
        public bool IsValid()
        {
            bool hasSender = DoctorSenderId.HasValue || PatientSenderId.HasValue;
            bool hasReceiver = DoctorReceiverId.HasValue || PatientReceiverId.HasValue;
            return hasSender && hasReceiver && !string.IsNullOrEmpty(Message);
        }
    }
}