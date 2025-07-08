using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using DoctorAppoitmentApi.Models;
using DoctorAppoitmentApi.Repository;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Linq;

namespace DoctorAppoitmentApi.Service
{
    public class LocalKnowledgeBase : ILocalKnowledgeBase
    {
        private readonly IDoctorRepository _doctorRepository;
        private readonly ILogger<LocalKnowledgeBase> _logger;
        private readonly AppDbContext _context;
        private readonly Dictionary<string, AppointmentBookingState> _bookingStates;
        
        // Static knowledge patterns
        private readonly Dictionary<string, List<(string pattern, string response)>> _knowledgePatterns;
        
        // Medical conditions patterns
        private readonly Dictionary<string, List<string>> _medicalConditionsPatterns;
        
        // Symptoms patterns
        private readonly Dictionary<string, List<string>> _symptomsPatterns;

        private Dictionary<string, List<string>> _followUpQuestions;
        private Dictionary<string, string> _medicalInformation;

        public LocalKnowledgeBase(
            IDoctorRepository doctorRepository,
            AppDbContext context,
            ILogger<LocalKnowledgeBase> logger)
        {
            _doctorRepository = doctorRepository;
            _context = context;
            _logger = logger;
            _knowledgePatterns = InitializeKnowledgePatterns();
            _medicalConditionsPatterns = InitializeMedicalConditionsPatterns();
            _symptomsPatterns = InitializeSymptomsPatterns();
            _bookingStates = new Dictionary<string, AppointmentBookingState>();
            _followUpQuestions = InitializeFollowUpQuestions();
            _medicalInformation = InitializeMedicalInformation();
        }

        private Dictionary<string, List<(string pattern, string response)>> InitializeKnowledgePatterns()
        {
            return new Dictionary<string, List<(string pattern, string response)>>
            {
                ["authentication"] = new List<(string, string)>
                {
                    (@"(نسيت|فقدت).*كلمة.*(?:المرور|السر|الباسورد)", 
                     "يمكنك إعادة تعيين كلمة المرور باتباع الخطوات التالية:\n" +
                     "1. اضغط على 'نسيت كلمة المرور' في صفحة تسجيل الدخول\n" +
                     "2. أدخل بريدك الإلكتروني المسجل\n" +
                     "3. ستصلك رسالة بها رابط لإعادة تعيين كلمة المرور\n" +
                     "4. اتبع الرابط وأدخل كلمة المرور الجديدة"),
                    
                    (@"(?:كيف|عايز).*(?:اسجل|انشئ).*حساب", 
                     "لإنشاء حساب جديد:\n" +
                     "1. اضغط على 'إنشاء حساب' في الصفحة الرئيسية\n" +
                     "2. املأ البيانات المطلوبة (الاسم، البريد الإلكتروني، رقم الهاتف)\n" +
                     "3. اختر كلمة مرور قوية\n" +
                     "4. اضغط على 'تسجيل' لإتمام العملية")
                },

                ["appointments"] = new List<(string, string)>
                {
                    (@"(?:كيف|عايز|اريد).*(?:احجز|اعمل).*موعد",
                     "لحجز موعد جديد:\n" +
                     "1. ادخل على قسم 'الأطباء'\n" +
                     "2. اختر التخصص المطلوب\n" +
                     "3. اختر الطبيب المناسب\n" +
                     "4. حدد الموعد المناسب من المواعيد المتاحة\n" +
                     "5. أكد الحجز ودفع الرسوم"),

                    (@"(?:كيف|عايز).*(?:الغي|الغاء).*موعد",
                     "لإلغاء موعد:\n" +
                     "1. ادخل على 'مواعيدي'\n" +
                     "2. اختر الموعد المراد إلغاؤه\n" +
                     "3. اضغط على 'إلغاء الموعد'\n" +
                     "4. أكد الإلغاء\n" +
                     "* يمكن إلغاء الموعد قبل 24 ساعة من موعده"),

                    (@"(?:ايه|فين).*(?:مواعيدي|حجوزاتي)",
                     "سأقوم بالبحث عن مواعيدك المسجلة...")
                },

                ["medical_advice"] = new List<(string, string)>
                {
                    (@"(?:عندي|أشعر).*(?:الم|وجع|صداع)",
                     "من فضلك أخبرني بمزيد من التفاصيل عن الألم:\n" +
                     "- منذ متى بدأ الألم؟\n" +
                     "- هل هو مستمر أم متقطع؟\n" +
                     "- هل يزداد مع الحركة؟\n" +
                     "سأقوم بتوجيهك للتخصص المناسب"),

                    (@"(?:عندي|فيه).*(?:حساسية|حكة|طفح)",
                     "الحساسية والطفح الجلدي قد تكون لها أسباب متعددة. سأقترح عليك زيارة:\n" +
                     "1. طبيب جلدية\n" +
                     "2. طبيب حساسية ومناعة\n" +
                     "هل تريد أن أبحث لك عن أقرب موعد متاح؟")
                },

                ["payment"] = new List<(string, string)>
                {
                    (@"(?:ايه|ما هي).*(?:طرق|وسائل).*الدفع",
                     "نقبل وسائل الدفع التالية:\n" +
                     "1. البطاقات البنكية (فيزا/ماستركارد)\n" +
                     "2. المحافظ الإلكترونية\n" +
                     "3. الدفع النقدي في العيادة\n" +
                     "4. التحويل البنكي"),

                    (@"(?:كم|ايه).*(?:سعر|تكلفة).*(?:الكشف|الحجز)",
                     "تختلف أسعار الكشف حسب:\n" +
                     "- تخصص الطبيب\n" +
                     "- درجة الطبيب العلمية\n" +
                     "- نوع الزيارة (كشف أول/متابعة)\n" +
                     "يمكنك معرفة السعر بالضبط عند اختيار الطبيب في صفحة الحجز")
                },

                ["medical_symptoms"] = new List<(string, string)>
                {
                    // الصداع
                    (@"(?:عندي|أشعر|فيه).*(?:صداع|الم.*راس|وجع.*راس)",
                     "من فضلك أخبرني بمزيد من التفاصيل عن الصداع:\n\n" +
                     "1️⃣ منذ متى بدأ الصداع؟\n" +
                     "2️⃣ في أي منطقة من الرأس يتركز الألم؟\n" +
                     "3️⃣ هل هو:\n" +
                     "   • مستمر أم متقطع؟\n" +
                     "   • نابض أم ثابت؟\n" +
                     "4️⃣ هل يزداد مع:\n" +
                     "   • الحركة؟\n" +
                     "   • الضوء أو الصوت؟\n" +
                     "   • التوتر أو الإجهاد؟\n" +
                     "5️⃣ هل يصاحبه أعراض أخرى مثل:\n" +
                     "   • غثيان أو قيء؟\n" +
                     "   • دوخة؟\n" +
                     "   • اضطرابات في الرؤية؟\n\n" +
                     "🏥 بناءً على إجاباتك، سأقوم بتوجيهك للتخصص المناسب."),

                    // آلام المعدة
                    (@"(?:عندي|أشعر|فيه).*(?:الم.*معدة|وجع.*بطن|مغص)",
                     "من فضلك أخبرني بمزيد من التفاصيل عن ألم المعدة:\n\n" +
                     "1️⃣ منذ متى بدأ الألم؟\n" +
                     "2️⃣ موقع الألم:\n" +
                     "   • أعلى البطن؟\n" +
                     "   • حول السرة؟\n" +
                     "   • أسفل البطن؟\n" +
                     "3️⃣ نوع الألم:\n" +
                     "   • حاد أم خفيف؟\n" +
                     "   • مستمر أم متقطع؟\n" +
                     "4️⃣ هل يصاحبه:\n" +
                     "   • غثيان أو قيء؟\n" +
                     "   • إسهال أو إمساك؟\n" +
                     "   • حرقة في المعدة؟\n" +
                     "   • انتفاخ؟\n" +
                     "5️⃣ هل يتأثر بـ:\n" +
                     "   • الطعام؟\n" +
                     "   • الجوع؟\n" +
                     "   • الحركة؟\n\n" +
                     "🏥 سأساعدك في تحديد ما إذا كنت تحتاج لزيارة:\n" +
                     "• طبيب باطنة\n" +
                     "• أخصائي جهاز هضمي\n" +
                     "• طوارئ"),

                    // آلام المفاصل
                    (@"(?:عندي|أشعر|فيه).*(?:الم.*مفاصل|خشونة|روماتيزم)",
                     "من فضلك أخبرني بمزيد من التفاصيل عن آلام المفاصل:\n\n" +
                     "1️⃣ المفاصل المتأثرة:\n" +
                     "   • الركبة؟\n" +
                     "   • الكتف؟\n" +
                     "   • الرسغ؟\n" +
                     "   • مفاصل متعددة؟\n" +
                     "2️⃣ الأعراض:\n" +
                     "   • تورم؟\n" +
                     "   • احمرار؟\n" +
                     "   • تيبس صباحي؟\n" +
                     "3️⃣ متى يزداد الألم؟\n" +
                     "   • مع الحركة؟\n" +
                     "   • في الراحة؟\n" +
                     "   • في الصباح؟\n" +
                     "   • في المساء؟\n\n" +
                     "🏥 سأساعدك في تحديد ما إذا كنت تحتاج لزيارة:\n" +
                     "• طبيب عظام\n" +
                     "• طبيب روماتيزم\n" +
                     "• طبيب طبيعي"),

                    // مشاكل الجلد
                    (@"(?:عندي|أشعر|فيه).*(?:حكة|طفح|حبوب|اكزيما|حساسية جلد)",
                     "من فضلك أخبرني بمزيد من التفاصيل عن المشكلة الجلدية:\n\n" +
                     "1️⃣ الأعراض الظاهرة:\n" +
                     "   • حكة؟\n" +
                     "   • احمرار؟\n" +
                     "   • تقشر؟\n" +
                     "   • بثور؟\n" +
                     "2️⃣ المناطق المصابة:\n" +
                     "   • الوجه؟\n" +
                     "   • الجسم؟\n" +
                     "   • الأطراف؟\n" +
                     "3️⃣ منذ متى ظهرت الأعراض؟\n" +
                     "4️⃣ هل هناك عوامل تزيد الأعراض:\n" +
                     "   • التعرض للشمس؟\n" +
                     "   • أطعمة معينة؟\n" +
                     "   • مستحضرات تجميل؟\n" +
                     "   • تعرق؟\n\n" +
                     "🏥 سأساعدك في تحديد ما إذا كنت تحتاج لزيارة:\n" +
                     "• طبيب جلدية\n" +
                     "• طبيب حساسية\n" +
                     "• طوارئ في حالة التورم الشديد"),

                    // مشاكل التنفس
                    (@"(?:عندي|أشعر|فيه).*(?:ضيق.*تنفس|كحة|صعوبة.*تنفس)",
                     "من فضلك أخبرني بمزيد من التفاصيل عن مشاكل التنفس:\n\n" +
                     "1️⃣ الأعراض:\n" +
                     "   • ضيق في التنفس؟\n" +
                     "   • كحة؟\n" +
                     "   • صفير في الصدر؟\n" +
                     "2️⃣ متى تزداد الأعراض؟\n" +
                     "   • في الراحة؟\n" +
                     "   • مع المجهود؟\n" +
                     "   • في الليل؟\n" +
                     "3️⃣ هل يصاحبها:\n" +
                     "   • ألم في الصدر؟\n" +
                     "   • خفقان؟\n" +
                     "   • حمى؟\n" +
                     "4️⃣ هل لديك:\n" +
                     "   • حساسية صدرية؟\n" +
                     "   • تدخين؟\n\n" +
                     "🏥 سأساعدك في تحديد ما إذا كنت تحتاج لزيارة:\n" +
                     "• طبيب صدرية\n" +
                     "• طبيب قلب\n" +
                     "• طوارئ في الحالات الشديدة"),

                    // مشاكل العين
                    (@"(?:عندي|أشعر|فيه).*(?:الم.*عين|حكة.*عين|احمرار.*عين)",
                     "من فضلك أخبرني بمزيد من التفاصيل عن مشاكل العين:\n\n" +
                     "1️⃣ الأعراض:\n" +
                     "   • احمرار؟\n" +
                     "   • حكة؟\n" +
                     "   • دموع؟\n" +
                     "   • ألم؟\n" +
                     "2️⃣ هل تعاني من:\n" +
                     "   • تغير في الرؤية؟\n" +
                     "   • حساسية للضوء؟\n" +
                     "   • رؤية هالات؟\n" +
                     "3️⃣ هل الأعراض:\n" +
                     "   • في عين واحدة أم الاثنتين؟\n" +
                     "   • مستمرة أم متقطعة؟\n" +
                     "4️⃣ هل سبق لك:\n" +
                     "   • إصابة في العين؟\n" +
                     "   • عملية في العين؟\n" +
                     "   • ارتداء عدسات؟\n\n" +
                     "🏥 سأساعدك في تحديد ما إذا كنت تحتاج لزيارة:\n" +
                     "• طبيب عيون\n" +
                     "• طوارئ في حالات الإصابات")
                }
            };
        }

        private Dictionary<string, List<string>> InitializeMedicalConditionsPatterns()
        {
            return new Dictionary<string, List<string>>
            {
                ["قلب وأوعية دموية"] = new List<string> 
                { 
                    "ضغط الدم", "خفقان", "ألم في الصدر", "ضيق تنفس", "تعب مع المجهود",
                    "نبض سريع", "دوخة", "تورم القدمين", "زرقة", "تعرق بارد",
                    "ألم ينتشر للذراع", "صعوبة التنفس أثناء النوم", "رجفان", "خدر في الذراع",
                    "تنميل في الأطراف", "دوار", "غثيان مع ألم الصدر", "إغماء", "دقات قلب غير منتظمة"
                },
                ["جهاز هضمي"] = new List<string>
                {
                    "حموضة", "حرقان", "قرحة", "إمساك", "إسهال", "انتفاخ", "غثيان",
                    "قيء", "ألم بطن", "عسر هضم", "نزيف", "بواسير", "فقدان شهية",
                    "صعوبة البلع", "اصفرار العين", "براز أسود", "تجشؤ", "مغص",
                    "حرقة في المعدة", "تقلصات في البطن", "غازات", "انتفاخ البطن"
                },
                ["جلدية"] = new List<string>
                {
                    "حكة", "طفح جلدي", "اكزيما", "حبوب", "تقشر الجلد", "احمرار",
                    "تغير لون الجلد", "بقع", "صدفية", "حساسية", "تساقط شعر",
                    "فطريات", "بثور", "دمامل", "تعرق زائد", "حروق شمس", "شري",
                    "تورم الجلد", "حبوب الشباب", "ثآليل", "تصبغات", "تجاعيد"
                },
                ["عظام ومفاصل"] = new List<string>
                {
                    "ألم مفاصل", "تورم مفاصل", "تيبس صباحي", "خشونة", "كسور",
                    "التهاب مفاصل", "روماتيزم", "نقرس", "آلام ظهر", "آلام رقبة",
                    "تنميل", "ضعف عضلات", "تشنجات", "التواء", "تقلص عضلي",
                    "آلام الركبة", "هشاشة العظام", "انزلاق غضروفي", "تورم الكاحل"
                },
                ["عيون"] = new List<string>
                {
                    "ضعف نظر", "احمرار العين", "حكة في العين", "دموع", "جفاف",
                    "رؤية ضبابية", "حساسية للضوء", "صداع مع تغير في الرؤية",
                    "رؤية هالات", "عمى ليلي", "حول", "ألم في العين", "انتفاخ الجفن",
                    "عدم وضوح الرؤية", "رؤية نقط سوداء", "رمش متكرر", "حرقان في العين"
                },
                ["أنف وأذن وحنجرة"] = new List<string>
                {
                    "التهاب لوز", "صعوبة بلع", "التهاب أذن", "طنين", "فقدان سمع",
                    "سيلان أنف", "انسداد أنف", "التهاب جيوب أنفية", "بحة صوت",
                    "سعال مزمن", "تضخم لحمية", "صفير في الأذن", "ألم في الأذن",
                    "نزيف من الأنف", "فقدان حاسة الشم", "صعوبة في التنفس من الأنف"
                },
                ["نفسية وعصبية"] = new List<string>
                {
                    "قلق", "توتر", "اكتئاب", "أرق", "صعوبة النوم", "كوابيس",
                    "تعب نفسي", "عصبية زائدة", "صداع توتري", "وسواس قهري",
                    "نوبات هلع", "خوف مرضي", "صعوبة التركيز", "نسيان متكرر"
                },
                ["غدد صماء وسكري"] = new List<string>
                {
                    "عطش شديد", "كثرة التبول", "جوع مستمر", "نقص وزن مفاجئ",
                    "زيادة وزن غير مبررة", "تعب وإرهاق", "بطء في النمو",
                    "اضطرابات الدورة الشهرية", "تساقط الشعر", "برودة دائمة"
                },
                ["أمراض نساء"] = new List<string>
                {
                    "اضطرابات الدورة", "نزيف مهبلي", "ألم أسفل البطن", "حكة مهبلية",
                    "إفرازات غير طبيعية", "تكيس المبايض", "آلام الحوض", "عقم",
                    "انقطاع الطمث", "تأخر الحمل", "آلام الثدي", "كتل في الثدي"
                }
            };
        }

        private Dictionary<string, List<string>> InitializeSymptomsPatterns()
        {
            return new Dictionary<string, List<string>>
            {
                ["حرارة"] = new List<string> { 
                    "سخونية", "حمى", "ارتفاع درجة الحرارة", "سخونة", 
                    "حرارة في الجسم", "جسمي سخن", "تعب مع حرارة" 
                },
                ["ألم"] = new List<string> { 
                    "وجع", "صداع", "آلام", "أوجاع", "ألم حاد", 
                    "ألم خفيف", "وجع شديد", "نغزات", "حرقان" 
                },
                ["تعب"] = new List<string> { 
                    "إرهاق", "إعياء", "خمول", "ضعف عام", "تعب شديد", 
                    "إجهاد", "فتور", "كسل", "عدم القدرة على الحركة" 
                },
                ["دوخة"] = new List<string> { 
                    "دوار", "دوشة", "لخبطة", "عدم توازن", 
                    "الدنيا بتلف", "دايخ", "مش متوازن" 
                },
                ["حساسية"] = new List<string> { 
                    "حكة", "طفح", "كحة", "عطس", "رشح", 
                    "زكام", "حساسية صدر", "ضيق تنفس" 
                }
            };
        }

        private Dictionary<string, List<string>> InitializeFollowUpQuestions()
        {
            return new Dictionary<string, List<string>>
            {
                ["قلب وأوعية دموية"] = new List<string>
                {
                    "هل لديك تاريخ عائلي لأمراض القلب؟",
                    "هل تعاني من ارتفاع ضغط الدم؟",
                    "هل تدخن؟",
                    "هل تمارس الرياضة بانتظام؟",
                    "هل تتبع نظاماً غذائياً صحياً؟"
                },
                ["جهاز هضمي"] = new List<string>
                {
                    "متى بدأت الأعراض؟",
                    "هل تناولت طعاماً غير معتاد مؤخراً؟",
                    "هل لديك حساسية من أطعمة معينة؟",
                    "هل تعاني من الإمساك أو الإسهال؟",
                    "هل لاحظت أي تغيير في شهيتك؟"
                }
                // Add more specialties and their follow-up questions
            };
        }

        private Dictionary<string, string> InitializeMedicalInformation()
        {
            return new Dictionary<string, string>
            {
                ["ضغط الدم"] = @"ضغط الدم الطبيعي يتراوح بين 120/80. 
                    • ارتفاع ضغط الدم: أعلى من 140/90
                    • انخفاض ضغط الدم: أقل من 90/60
                    
                    نصائح للتحكم في ضغط الدم:
                    • تقليل الملح في الطعام
                    • ممارسة الرياضة بانتظام
                    • الإقلاع عن التدخين
                    • تجنب التوتر
                    • تناول الأدوية بانتظام إذا وصفها الطبيب",

                ["السكري"] = @"مستويات السكر الطبيعية في الدم:
                    • صائم: 70-100 ملغ/دل
                    • بعد الأكل بساعتين: أقل من 140 ملغ/دل
                    
                    علامات ارتفاع السكر:
                    • العطش الشديد
                    • كثرة التبول
                    • الجوع المستمر
                    • التعب والإرهاق
                    
                    نصائح للتحكم في السكري:
                    • تناول الأدوية بانتظام
                    • مراقبة مستوى السكر يومياً
                    • اتباع نظام غذائي صحي
                    • ممارسة الرياضة بانتظام"
                // Add more medical information
            };
        }

        public async Task<(bool matched, string response)> GetResponseAsync(string query, string? userId = null)
        {
            try
            {
                // 1. Check if this is part of an ongoing booking process
                if (!string.IsNullOrEmpty(userId) && _bookingStates.ContainsKey(userId))
                {
                    var (success, message) = await ProcessAppointmentBooking(userId, query, "ongoing");
                    return (true, message);
                }

                // 2. Check for doctor-related queries first
                if (await IsDoctorQuery(query))
                {
                    var (specialty, confidence) = await DetectSpecialtyAsync(query);
                    _logger?.LogInformation($"Detected specialty: {specialty} with confidence: {confidence}");

                    if (!string.IsNullOrEmpty(specialty))
                    {
                        var doctors = await _doctorRepository.FindAllDoctorsBySpecialtyNameAsync(specialty);
                        if (doctors.Any())
                        {
                            // تحويل اسم التخصص للعربية
                            var arabicSpecialty = specialty switch
                            {
                                "Dermatology" => "الجلدية",
                                "Orthopedics" => "العظام",
                                "Cardiology" => "القلب",
                                "Pediatrics" => "الأطفال",
                                "Gynecology" => "النساء والتوليد",
                                "ENT" => "الأنف والأذن والحنجرة",
                                "Internal Medicine" => "الباطنة",
                                _ => specialty
                            };

                            var response = new StringBuilder();
                            response.AppendLine($"🏥 نتائج البحث عن أطباء {arabicSpecialty}");
                            response.AppendLine("──────────────────────");
                            response.AppendLine($"عدد الأطباء المتوفرين: {doctors.Count()}");
                            response.AppendLine();

                            foreach (var doctor in doctors.Take(3))
                            {
                                response.AppendLine($"👨‍⚕️ د. {doctor.FirstName} {doctor.LastName}");
                                response.AppendLine($"   • التخصص: {arabicSpecialty}");
                                response.AppendLine($"   • سعر الكشف: {doctor.CurrentFee} جنيه");
                                response.AppendLine($"   • معرف الطبيب: {doctor.Id}");
                                response.AppendLine("──────────────");
                            }

                            response.AppendLine();
                            response.AppendLine("📋 لحجز موعد:");
                            response.AppendLine("اكتب 'عايز احجز مع دكتور' متبوعاً برقم معرف الطبيب");
                            response.AppendLine("مثال: عايز احجز مع دكتور 3");

                            // إضافة الأسئلة المقترحة
                            var suggestions = await GetSuggestedQuestionsAsync(query);
                            if (suggestions.Any())
                            {
                                response.AppendLine();
                                response.AppendLine("❓ أسئلة شائعة:");
                                foreach (var suggestion in suggestions.Take(3))
                                {
                                    response.AppendLine($"• {suggestion}");
                                }
                            }

                            return (true, response.ToString());
                        }
                        else
                        {
                            return (true, $"⚠️ عذراً، لا يوجد حالياً أطباء متخصصين في {specialty}.\n\n" +
                                        "هل تريد:\n" +
                                        "• البحث في تخصص آخر؟\n" +
                                        "• معرفة التخصصات المتوفرة؟\n" +
                                        "• التحدث مع خدمة العملاء؟");
                        }
                    }
                }

                // 3. Check if user specific response is needed
                if (!string.IsNullOrEmpty(userId))
                {
                    var (userMatched, userResponse) = await GetPatientSpecificResponseAsync(query, userId);
                    if (userMatched) return (true, userResponse);
                }

                // 4. Check static patterns
                foreach (var category in _knowledgePatterns)
                {
                    foreach (var (pattern, response) in category.Value)
                    {
                        if (Regex.IsMatch(query, pattern, RegexOptions.IgnoreCase))
                        {
                            return (true, response);
                        }
                    }
                }

                // 5. Check for medical advice
                var (medicalMatched, medicalResponse) = await GetMedicalAdviceAsync(query);
                if (medicalMatched) return (true, medicalResponse);

                // 6. No match found - provide helpful suggestions
                return (false, "عذراً، لم أفهم طلبك بشكل كامل. هل تريد:\n" +
                             "1. البحث عن طبيب في تخصص معين؟\n" +
                             "2. حجز موعد مع طبيب محدد؟\n" +
                             "3. معرفة المزيد عن التخصصات المتوفرة؟\n" +
                             "4. الاستفسار عن مواعيدك الحالية؟");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in LocalKnowledgeBase.GetResponseAsync");
                return (false, "عذراً، حدث خطأ أثناء معالجة طلبك. الرجاء المحاولة مرة أخرى.");
            }
        }

        public async Task<(bool matched, string response)> GetPatientSpecificResponseAsync(string query, string userId)
        {
            try
            {
                // Get patient information
                var patient = await _context.Patients
                    .Include(p => p.ApplicationUser)
                    .Include(p => p.Appointments)
                        .ThenInclude(a => a.Doctor)
                            .ThenInclude(d => d.Specialization)
                    .FirstOrDefaultAsync(p => p.ApplicationUserId == userId);

                if (patient == null) return (false, string.Empty);

                // Check for appointment related queries
                if (query.Contains("مواعيدي") || query.Contains("حجوزاتي"))
                {
                    var appointments = await GetPatientAppointmentsAsync(userId);
                    if (!appointments.Any())
                        return (true, "لا يوجد لديك مواعيد حالية.");

                    var response = "مواعيدك القادمة:\n";
                    foreach (var apt in appointments)
                    {
                        response += $"- موعد مع د. {apt.Doctor.FirstName} {apt.Doctor.LastName} " +
                                  $"({apt.Doctor.Specialization.Name}) " +
                                  $"في {apt.AppointmentDate:dd/MM/yyyy} " +
                                  $"الساعة {apt.StartTime:hh:mm tt}\n";
                    }
                    return (true, response);
                }

                // Check for medical history queries
                if (query.Contains("تاريخي الطبي") || query.Contains("سجلي الطبي"))
                {
                    if (string.IsNullOrEmpty(patient.MedicalHistory))
                        return (true, "لم يتم تسجيل أي تاريخ طبي سابق. هل تريد إضافة معلومات طبية؟");

                    return (true, $"تاريخك الطبي:\n{patient.MedicalHistory}");
                }

                return (false, string.Empty);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GetPatientSpecificResponseAsync");
                return (false, string.Empty);
            }
        }

        public async Task<(bool matched, string response)> GetMedicalAdviceAsync(string symptoms)
        {
            try
            {
                var matchedConditions = new Dictionary<string, List<string>>();
                var urgencyLevel = AssessUrgencyLevel(symptoms);
                var response = new StringBuilder();

                foreach (var condition in _medicalConditionsPatterns)
                {
                    var matchedSymptoms = condition.Value
                        .Where(symptom => symptoms.Contains(symptom, StringComparison.OrdinalIgnoreCase))
                        .ToList();

                    if (matchedSymptoms.Any())
                    {
                        matchedConditions.Add(condition.Key, matchedSymptoms);
                    }
                }

                if (matchedConditions.Any())
                {
                    response.AppendLine("🏥 تحليل الأعراض:");
                    response.AppendLine("──────────────");

                    foreach (var condition in matchedConditions)
                    {
                        response.AppendLine($"◾ تخصص {condition.Key}:");
                        response.AppendLine($"  الأعراض المطابقة: {string.Join("، ", condition.Value)}");
                        
                        // Get doctors for this specialty
                        var doctors = await _doctorRepository.FindAllDoctorsBySpecialtyNameAsync(condition.Key);
                        if (doctors.Any())
                        {
                            response.AppendLine($"\n  👨‍⚕️ الأطباء المتخصصون المتاحون:");
                            foreach (var doctor in doctors.Take(3))
                            {
                                response.AppendLine($"  • د. {doctor.FirstName} {doctor.LastName}");
                            }
                        }
                        response.AppendLine("──────────────");
                    }

                    // Add urgency advice
                    response.AppendLine($"\n⚠️ مستوى الأولوية: {GetUrgencyLevelText(urgencyLevel)}");
                    
                    if (urgencyLevel == UrgencyLevel.Emergency)
                    {
                        response.AppendLine("\n🚨 تنبيه: يُنصح بالتوجه فوراً إلى أقرب طوارئ.");
                    }
                    else if (urgencyLevel == UrgencyLevel.Urgent)
                    {
                        response.AppendLine("\n⚡ تنبيه: يُنصح بزيارة الطبيب في أقرب وقت ممكن (خلال 24 ساعة).");
                    }

                    // Add general advice
                    response.AppendLine("\n💡 نصائح عامة:");
                    response.AppendLine("• احتفظ بسجل مفصل لأعراضك وتوقيتها");
                    response.AppendLine("• قم بقياس العلامات الحيوية إن أمكن (درجة الحرارة، ضغط الدم)");
                    response.AppendLine("• تجنب تناول أي أدوية دون استشارة طبية");

                    // Add booking instructions
                    response.AppendLine("\n📋 لحجز موعد:");
                    response.AppendLine("1. اختر التخصص المناسب من القائمة أعلاه");
                    response.AppendLine("2. اكتب 'عايز احجز مع دكتور' متبوعاً برقم معرف الطبيب");
                    response.AppendLine("مثال: عايز احجز مع دكتور 3");

                    return (true, response.ToString());
                }

                return (false, string.Empty);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GetMedicalAdviceAsync");
                return (false, string.Empty);
            }
        }

        private UrgencyLevel AssessUrgencyLevel(string symptoms)
        {
            var emergencySymptoms = new[]
            {
                "ألم شديد في الصدر", "صعوبة في التنفس", "نزيف شديد",
                "فقدان الوعي", "شلل", "تشنجات", "إغماء",
                "إصابة شديدة في الرأس", "ألم بطن حاد"
            };

            var urgentSymptoms = new[]
            {
                "حمى شديدة", "ألم شديد", "صداع شديد",
                "قيء مستمر", "إسهال شديد", "جفاف",
                "تورم مفاجئ", "ضيق تنفس متوسط"
            };

            if (emergencySymptoms.Any(s => symptoms.Contains(s, StringComparison.OrdinalIgnoreCase)))
            {
                return UrgencyLevel.Emergency;
            }
            
            if (urgentSymptoms.Any(s => symptoms.Contains(s, StringComparison.OrdinalIgnoreCase)))
            {
                return UrgencyLevel.Urgent;
            }

            return UrgencyLevel.Normal;
        }

        private string GetUrgencyLevelText(UrgencyLevel level)
        {
            return level switch
            {
                UrgencyLevel.Emergency => "🔴 حالة طارئة - تتطلب عناية فورية",
                UrgencyLevel.Urgent => "🟡 عاجل - تتطلب عناية خلال 24 ساعة",
                _ => "🟢 عادي - يمكن حجز موعد عيادة"
            };
        }

        private enum UrgencyLevel
        {
            Normal,
            Urgent,
            Emergency
        }

        public async Task<List<string>> GetSuggestedQuestionsAsync(string currentQuery)
        {
            var suggestions = new List<string>();
            
            // Add context-aware suggestions based on current query
            if (currentQuery.Contains("دكتور") || currentQuery.Contains("طبيب"))
            {
                suggestions.AddRange(new[]
                {
                    "كيف أحجز موعد مع الدكتور؟",
                    "ما هي مواعيد العمل؟",
                    "كم سعر الكشف؟",
                    "هل يقبل التأمين الصحي؟"
                });
            }
            
            if (currentQuery.Contains("حجز") || currentQuery.Contains("موعد"))
            {
                suggestions.AddRange(new[]
                {
                    "ما هي طرق الدفع المتاحة؟",
                    "كيف يمكنني إلغاء الموعد؟",
                    "هل يمكنني تغيير موعد الحجز؟",
                    "كم مدة الكشف؟"
                });
            }

            if (currentQuery.Contains("ألم") || currentQuery.Contains("وجع"))
            {
                suggestions.AddRange(new[]
                {
                    "ما هو أقرب موعد متاح؟",
                    "هل يمكنني استشارة طبيب عن بعد؟",
                    "ما هي الأوراق المطلوبة للكشف؟"
                });
            }

            return suggestions;
        }

        public async Task<(string specialty, float confidence)> DetectSpecialtyAsync(string query)
        {
            var specialtyMappings = new Dictionary<string, (string DbName, List<string> Keywords)>
            {
                ["Dermatology"] = ("Dermatology", new List<string> { 
                    // Arabic
                    "جلد", "بشرة", "جلدية", "جلديه", "حساسية جلد", "حبوب", "طفح", "اكزيما",
                    // English
                    "skin", "dermatology", "dermatologist", "rash", "acne", "eczema", "allergy"
                }),
                ["Orthopedics"] = ("Orthopedics", new List<string> { 
                    // Arabic
                    "عظام", "عظم", "مفاصل", "كسور", "رضوض", "ظهر", "ركبة", "خشونة",
                    // English
                    "orthopedic", "bone", "joint", "fracture", "back", "knee", "arthritis"
                }),
                ["Cardiology"] = ("Cardiology", new List<string> { 
                    // Arabic
                    "قلب", "قلبية", "صدر", "ضغط", "شرايين", "خفقان", "نبض", "ذبحة",
                    // English
                    "heart", "cardiac", "cardiology", "cardiologist", "chest", "blood pressure", "cardiovascular"
                }),
                ["Pediatrics"] = ("Pediatrics", new List<string> { 
                    // Arabic
                    "اطفال", "طفل", "رضيع", "حديث ولادة", "تطعيم", "نمو", "حضانة",
                    // English
                    "pediatric", "pediatrician", "child", "children", "baby", "newborn", "vaccination"
                }),
                ["Gynecology"] = ("Gynecology", new List<string> { 
                    // Arabic
                    "نساء", "ولادة", "حمل", "نسائية", "توليد", "رحم", "مبيض",
                    // English
                    "gynecology", "obstetrics", "pregnancy", "obgyn", "women", "uterus", "ovary"
                }),
                ["ENT"] = ("ENT", new List<string> { 
                    // Arabic
                    "انف", "اذن", "حنجرة", "حلق", "سمع", "لوز", "جيوب انفية",
                    // English
                    "ent", "ear", "nose", "throat", "hearing", "tonsils", "sinus"
                }),
                ["Internal Medicine"] = ("Internal Medicine", new List<string> { 
                    // Arabic
                    "باطنة", "باطنية", "معدة", "امعاء", "هضم", "كبد", "مرارة", "قولون",
                    // English
                    "internal", "medicine", "stomach", "digestive", "liver", "gallbladder", "colon"
                })
            };

            var maxConfidence = 0f;
            var detectedSpecialty = "";
            var normalizedQuery = query.ToLower();

            foreach (var mapping in specialtyMappings)
            {
                var matchCount = mapping.Value.Keywords
                    .Count(keyword => normalizedQuery.Contains(keyword.ToLower()));
                
                var confidence = matchCount > 0 ? (float)matchCount / mapping.Value.Keywords.Count : 0;
                
                if (confidence > maxConfidence)
                {
                    maxConfidence = confidence;
                    detectedSpecialty = mapping.Value.DbName;
                }
            }

            _logger?.LogInformation($"Query: {query}, Detected specialty: {detectedSpecialty}, Confidence: {maxConfidence}");

            return (detectedSpecialty, maxConfidence);
        }

        private async Task<bool> IsDoctorQuery(string query)
        {
            var doctorPatterns = new[]
            {
                // Arabic Patterns
                @"(?:عايز|محتاج|اريد).*(?:دكتور|طبيب)",
                @"(?:فين|وين).*(?:دكتور|طبيب)",
                @"(?:احسن|افضل).*(?:دكتور|طبيب)",
                @"(?:اقرب|اول).*(?:دكتور|طبيب)",
                
                // English Patterns
                @"(?:need|want|looking).*(?:doctor|physician)",
                @"(?:find|search).*(?:doctor|physician)",
                @"(?:best|good).*(?:doctor|physician)",
                @"(?:nearest|closest).*(?:doctor|physician)"
            };

            return doctorPatterns.Any(pattern => Regex.IsMatch(query, pattern, RegexOptions.IgnoreCase));
        }

        public async Task<List<Appointment>> GetPatientAppointmentsAsync(string userId)
        {
            try
            {
                return await _context.Appointments
                    .Include(a => a.Doctor)
                        .ThenInclude(d => d.Specialization)
                    .Include(a => a.Patient)
                    .Where(a => a.Patient.ApplicationUserId == userId && 
                           a.AppointmentDate >= DateTime.Today)
                    .OrderBy(a => a.AppointmentDate)
                    .ThenBy(a => a.StartTime)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error getting patient appointments");
                return new List<Appointment>();
            }
        }

        public async Task<(bool success, string message)> InitiateAppointmentBooking(string userId, int doctorId)
        {
            try
            {
                var doctor = await _context.Doctors
                    .Include(d => d.Specialization)
                    .FirstOrDefaultAsync(d => d.Id == doctorId);

                if (doctor == null)
                    return (false, "عذراً، لم يتم العثور على الطبيب المطلوب.");

                var patient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.ApplicationUserId == userId);

                if (patient == null)
                    return (false, "عذراً، يجب إكمال ملفك الشخصي أولاً.");

                // Initialize booking state
                var bookingState = new AppointmentBookingState
                {
                    DoctorId = doctorId,
                    PatientId = patient.Id,
                    CurrentStep = BookingStep.SelectDate,
                    Doctor = doctor
                };

                _bookingStates[userId] = bookingState;

                return (true, $"حسناً، سنبدأ حجز موعد مع د. {doctor.FirstName} {doctor.LastName} ({doctor.Specialization.Name})\n" +
                             "من فضلك اختر التاريخ المناسب (مثال: 25/12/2024):");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error initiating appointment booking");
                return (false, "عذراً، حدث خطأ أثناء بدء عملية الحجز. الرجاء المحاولة مرة أخرى.");
            }
        }

        public async Task<(bool success, string message)> ProcessAppointmentBooking(string userId, string userInput, string currentState)
        {
            if (!_bookingStates.ContainsKey(userId))
                return (false, "عذراً، يجب بدء عملية الحجز أولاً.");

            var bookingState = _bookingStates[userId];

            try
            {
                switch (bookingState.CurrentStep)
                {
                    case BookingStep.SelectDate:
                        if (DateTime.TryParse(userInput, out DateTime selectedDate))
                        {
                            if (selectedDate.Date < DateTime.Today)
                                return (false, "عذراً، لا يمكن اختيار تاريخ في الماضي. اختر تاريخاً مستقبلياً:");

                            bookingState.AppointmentDate = selectedDate;
                            bookingState.CurrentStep = BookingStep.SelectTime;

                            // Get available time slots
                            var availableSlots = await GetAvailableTimeSlots(bookingState.DoctorId, selectedDate);
                            if (!availableSlots.Any())
                                return (false, "عذراً، لا توجد مواعيد متاحة في هذا اليوم. اختر تاريخاً آخر:");

                            return (true, "اختر وقت الموعد المناسب من المواعيد المتاحة:\n" +
                                        string.Join("\n", availableSlots.Select(s => $"- {s:HH:mm}")));
                        }
                        return (false, "صيغة التاريخ غير صحيحة. الرجاء إدخال التاريخ بالصيغة الصحيحة (مثال: 25/12/2024):");

                    case BookingStep.SelectTime:
                        if (TimeSpan.TryParse(userInput, out TimeSpan selectedTime))
                        {
                            // Validate time slot availability
                            var availableSlots = await GetAvailableTimeSlots(bookingState.DoctorId, bookingState.AppointmentDate);
                            if (!availableSlots.Contains(selectedTime))
                                return (false, "عذراً، هذا الموعد غير متاح. اختر موعداً آخر من المواعيد المتاحة:");

                            bookingState.AppointmentTime = selectedTime;
                            bookingState.CurrentStep = BookingStep.Confirm;

                            var doctor = bookingState.Doctor;
                            return (true, $"مراجعة تفاصيل الحجز:\n" +
                                        $"الطبيب: د. {doctor.FirstName} {doctor.LastName}\n" +
                                        $"التخصص: {doctor.Specialization.Name}\n" +
                                        $"التاريخ: {bookingState.AppointmentDate:dd/MM/yyyy}\n" +
                                        $"الوقت: {bookingState.AppointmentTime:hh\\:mm}\n" +
                                        $"سعر الكشف: {doctor.CurrentFee}\n\n" +
                                        "للتأكيد اكتب 'تأكيد' أو 'إلغاء' للإلغاء:");
                        }
                        return (false, "صيغة الوقت غير صحيحة. الرجاء إدخال الوقت بالصيغة الصحيحة (مثال: 14:30):");

                    case BookingStep.Confirm:
                        if (userInput.Contains("تأكيد"))
                        {
                            // Create appointment
                            var appointment = new Appointment
                            {
                                DoctorID = bookingState.DoctorId,
                                PatientID = bookingState.PatientId,
                                AppointmentDate = bookingState.AppointmentDate,
                                StartTime = bookingState.AppointmentTime,
                                EndTime = bookingState.AppointmentTime.Add(TimeSpan.FromMinutes(30)),
                                Status = "Pending",
                                AppointmentFee = bookingState.Doctor.CurrentFee
                            };

                            _context.Appointments.Add(appointment);
                            await _context.SaveChangesAsync();

                            // Clean up booking state
                            _bookingStates.Remove(userId);

                            return (true, "تم تأكيد الحجز بنجاح! ستصلك رسالة تأكيد على بريدك الإلكتروني وهاتفك المحمول.");
                        }
                        else if (userInput.Contains("إلغاء"))
                        {
                            _bookingStates.Remove(userId);
                            return (true, "تم إلغاء عملية الحجز. هل تريد البحث عن موعد آخر؟");
                        }
                        return (false, "من فضلك اكتب 'تأكيد' للمتابعة أو 'إلغاء' لإلغاء الحجز:");

                    default:
                        return (false, "حدث خطأ في عملية الحجز. الرجاء المحاولة مرة أخرى.");
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error processing appointment booking");
                return (false, "عذراً، حدث خطأ أثناء معالجة الحجز. الرجاء المحاولة مرة أخرى.");
            }
        }

        private async Task<List<TimeSpan>> GetAvailableTimeSlots(int doctorId, DateTime date)
        {
            try
            {
                // Get doctor's working hours and existing appointments
                var doctor = await _context.Doctors
                    .Include(d => d.Clinic)
                    .FirstOrDefaultAsync(d => d.Id == doctorId);

                if (doctor?.Clinic == null)
                    return new List<TimeSpan>();

                var existingAppointments = await _context.Appointments
                    .Where(a => a.DoctorID == doctorId && 
                           a.AppointmentDate.Date == date.Date &&
                           a.Status != "Cancelled")
                    .Select(a => new { a.StartTime, a.EndTime })
                    .ToListAsync();

                // Generate time slots (assuming 30-minute appointments)
                var startTime = TimeSpan.Parse(doctor.Clinic.OpeningTime.ToString());
                var endTime = TimeSpan.Parse(doctor.Clinic.ClosingTime.ToString());
                var slots = new List<TimeSpan>();

                for (var time = startTime; time < endTime; time = time.Add(TimeSpan.FromMinutes(30)))
                {
                    if (!existingAppointments.Any(a => 
                        time >= a.StartTime && 
                        time < a.EndTime))
                    {
                        slots.Add(time);
                    }
                }

                return slots;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error getting available time slots");
                return new List<TimeSpan>();
            }
        }

        public async Task<string> GetFollowUpQuestionsAsync(string specialty)
        {
            if (_followUpQuestions.TryGetValue(specialty, out var questions))
            {
                var response = new StringBuilder();
                response.AppendLine("📋 أسئلة متابعة مهمة:");
                response.AppendLine("──────────────");
                foreach (var question in questions)
                {
                    response.AppendLine($"• {question}");
                }
                return response.ToString();
            }
            return string.Empty;
        }

        public string GetMedicalInformation(string condition)
        {
            if (_medicalInformation.TryGetValue(condition.ToLower(), out var info))
                return info;

            return $"لم أجد معلومات محددة عن \"{condition}\". يرجى استشارة الطبيب للحصول على معلومات دقيقة.";
        }

        public async Task<(bool matched, string response, List<string> suggestedFollowUp)> GetEnhancedMedicalAdviceAsync(string symptoms, string userId)
        {
            try
            {
                // First get the basic medical advice
                var (matched, basicResponse) = await GetMedicalAdviceAsync(symptoms);
                
                if (!matched)
                {
                    return (false, basicResponse, new List<string>());
                }

                // Add personalization if user is known
                string personalizedGreeting = string.Empty;
                if (!string.IsNullOrEmpty(userId))
                {
                    var patient = await _context.Patients.FirstOrDefaultAsync(p => p.ApplicationUserId == userId);
                    if (patient != null)
                    {
                        personalizedGreeting = $"مرحباً {patient.FirstName}، أنا آسف لسماع ذلك. ";
                    }
                    else
                    {
                        personalizedGreeting = "أنا آسف لسماع ذلك. ";
                    }
                }
                else
                {
                    personalizedGreeting = "أنا آسف لسماع ذلك. ";
                }

                // Generate follow-up questions based on symptoms
                var followUpQuestions = await GetDetailedSymptomQuestionsAsync(symptoms);
                
                // Assess urgency level
                var urgencyLevel = AssessUrgencyLevel(symptoms);
                var urgencyAdvice = GetUrgencyLevelText(urgencyLevel);
                
                // Build enhanced response
                var enhancedResponse = new StringBuilder();
                enhancedResponse.AppendLine(personalizedGreeting);
                enhancedResponse.AppendLine(basicResponse);
                enhancedResponse.AppendLine();
                enhancedResponse.AppendLine(urgencyAdvice);
                
                // Detect specialty based on symptoms
                var (specialty, confidence) = await DetectSpecialtyAsync(symptoms);
                if (confidence > 0.6f)
                {
                    enhancedResponse.AppendLine();
                    enhancedResponse.AppendLine($"بناءً على الأعراض التي وصفتها، قد تحتاج إلى استشارة طبيب {specialty}.");
                    
                    // Get recommended doctors for this specialty
                    var recommendedDoctors = await GetRecommendedDoctorsAsync(specialty, userId);
                    if (recommendedDoctors.Any())
                    {
                        enhancedResponse.AppendLine();
                        enhancedResponse.AppendLine("الأطباء المتاحين قريباً:");
                        foreach (var doctor in recommendedDoctors.Take(2))
                        {
                            enhancedResponse.AppendLine($"- د. {doctor.doctorName} - متاح {doctor.nextAvailable.ToString("yyyy-MM-dd")}");
                        }
                        enhancedResponse.AppendLine("هل ترغب في حجز موعد مع أحدهم؟");
                    }
                }

                return (true, enhancedResponse.ToString(), followUpQuestions);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GetEnhancedMedicalAdviceAsync");
                return (false, "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.", new List<string>());
            }
        }

        public async Task<(string preliminaryDiagnosis, List<string> possibleConditions, string urgencyLevel)> GeneratePreliminaryDiagnosisAsync(string symptoms, string medicalHistory)
        {
            try
            {
                var preliminaryDiagnosis = string.Empty;
                var possibleConditions = new List<string>();
                
                // Check symptoms against medical conditions patterns
                foreach (var condition in _medicalConditionsPatterns)
                {
                    foreach (var pattern in condition.Value)
                    {
                        if (Regex.IsMatch(symptoms.ToLower(), pattern.ToLower()))
                        {
                            possibleConditions.Add(condition.Key);
                            break;
                        }
                    }
                }

                // Generate preliminary diagnosis text
                if (possibleConditions.Any())
                {
                    preliminaryDiagnosis = "بناءً على الأعراض التي وصفتها، قد تكون هذه بعض الحالات المحتملة:\n\n";
                    foreach (var condition in possibleConditions)
                    {
                        preliminaryDiagnosis += $"• {condition}: {GetMedicalInformation(condition)}\n\n";
                    }
                    
                    preliminaryDiagnosis += "**تنبيه هام**: هذا تقييم أولي فقط وليس تشخيصاً طبياً. يرجى استشارة الطبيب للحصول على تشخيص دقيق وخطة علاجية مناسبة.";
                }
                else
                {
                    preliminaryDiagnosis = "لم أتمكن من تحديد حالة محتملة بناءً على الأعراض المذكورة. يُرجى تقديم مزيد من التفاصيل أو استشارة الطبيب مباشرة للحصول على تقييم دقيق.";
                }
                
                // Assess urgency
                var urgencyLevel = AssessUrgencyLevel(symptoms);
                var urgencyText = GetUrgencyLevelText(urgencyLevel);
                
                return (preliminaryDiagnosis, possibleConditions, urgencyText);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GeneratePreliminaryDiagnosisAsync");
                return ("حدث خطأ أثناء محاولة التشخيص. يرجى التحدث مع طبيب.", new List<string>(), "غير معروف");
            }
        }

        public async Task<string> GetEmpatheticGreetingAsync(string userId, TimeSpan? timeOfDay = null)
        {
            try
            {
                // Default greetings based on time of day
                timeOfDay ??= DateTime.Now.TimeOfDay;
                string timeGreeting;
                
                if (timeOfDay.Value.Hours >= 5 && timeOfDay.Value.Hours < 12)
                {
                    timeGreeting = "صباح الخير";
                }
                else if (timeOfDay.Value.Hours >= 12 && timeOfDay.Value.Hours < 17)
                {
                    timeGreeting = "مساء الخير";
                }
                else
                {
                    timeGreeting = "مساء الخير";
                }
                
                // If user ID is provided, personalize the greeting
                if (!string.IsNullOrEmpty(userId))
                {
                    var patient = await _context.Patients.FirstOrDefaultAsync(p => p.ApplicationUserId == userId);
                    if (patient != null)
                    {
                        // Check if the patient has upcoming appointments
                        var upcomingAppointment = await _context.Appointments
                            .Where(a => a.PatientID == patient.Id && a.AppointmentDate > DateTime.Now)
                            .OrderBy(a => a.AppointmentDate)
                            .FirstOrDefaultAsync();
                            
                        if (upcomingAppointment != null)
                        {
                            var doctor = await _context.Doctors.FindAsync(upcomingAppointment.DoctorID);
                            var daysUntilAppointment = (upcomingAppointment.AppointmentDate - DateTime.Now).Days;
                            
                            if (daysUntilAppointment <= 1)
                            {
                                return $"{timeGreeting} {patient.FirstName}! أتمنى أن تكون بخير. أود تذكيرك بموعدك غداً مع د. {doctor?.FirstName} {doctor?.LastName}. هل هناك أي شيء آخر يمكنني مساعدتك به اليوم؟";
                            }
                            else if (daysUntilAppointment <= 3)
                            {
                                return $"{timeGreeting} {patient.FirstName}! كيف حالك اليوم؟ لديك موعد قادم مع د. {doctor?.FirstName} {doctor?.LastName} بعد {daysUntilAppointment} أيام. هل يمكنني مساعدتك بأي شيء آخر؟";
                            }
                            else
                            {
                                return $"{timeGreeting} {patient.FirstName}! كيف يمكنني مساعدتك اليوم؟";
                            }
                        }
                        
                        // Check if patient has had a recent appointment
                        var recentAppointment = await _context.Appointments
                            .Where(a => a.PatientID == patient.Id && a.AppointmentDate < DateTime.Now)
                            .OrderByDescending(a => a.AppointmentDate)
                            .FirstOrDefaultAsync();
                            
                        if (recentAppointment != null && (DateTime.Now - recentAppointment.AppointmentDate).TotalDays <= 7)
                        {
                            var doctor = await _context.Doctors.FindAsync(recentAppointment.DoctorID);
                            return $"{timeGreeting} {patient.FirstName}! كيف حالك بعد زيارتك الأخيرة للدكتور {doctor?.FirstName} {doctor?.LastName}؟ هل هناك أي تحسن في حالتك؟";
                        }
                        
                        return $"{timeGreeting} {patient.FirstName}! كيف يمكنني مساعدتك اليوم؟";
                    }
                }
                
                // Default greeting if no personalization is possible
                return $"{timeGreeting}! كيف يمكنني مساعدتك اليوم؟";
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GetEmpatheticGreetingAsync");
                return "مرحباً! كيف يمكنني مساعدتك اليوم؟";
            }
        }

        public async Task<List<string>> GetDetailedSymptomQuestionsAsync(string initialSymptom)
        {
            var followUpQuestions = new List<string>();
            
            // Common questions for all symptoms
            followUpQuestions.Add("منذ متى بدأت تشعر بهذه الأعراض؟");
            followUpQuestions.Add("هل جربت أي أدوية أو علاجات منزلية؟");
            followUpQuestions.Add("هل لديك أي حالات طبية مزمنة أو حساسية؟");
            
            // Specific questions based on symptom categories
            if (Regex.IsMatch(initialSymptom, @"صداع|الم.*راس|وجع.*راس", RegexOptions.IgnoreCase))
            {
                followUpQuestions.Add("هل الصداع في جانب واحد من الرأس أم في كل الرأس؟");
                followUpQuestions.Add("هل تعاني من حساسية للضوء أو الصوت مع الصداع؟");
                followUpQuestions.Add("هل سبق أن أصبت بصداع مماثل من قبل؟");
                followUpQuestions.Add("هل يصاحب الصداع غثيان أو قيء؟");
            }
            else if (Regex.IsMatch(initialSymptom, @"معدة|بطن|اسهال|امساك|قيء|غثيان", RegexOptions.IgnoreCase))
            {
                followUpQuestions.Add("هل تناولت طعاماً قد يكون سبب المشكلة؟");
                followUpQuestions.Add("هل لاحظت أي تغيير في لون البراز؟");
                followUpQuestions.Add("هل يصاحب ألم البطن حمى؟");
                followUpQuestions.Add("هل تشعر بالجفاف؟");
            }
            else if (Regex.IsMatch(initialSymptom, @"سعال|صدر|تنفس|حساسية|ربو", RegexOptions.IgnoreCase))
            {
                followUpQuestions.Add("هل السعال جاف أم مصحوب بالبلغم؟");
                followUpQuestions.Add("هل تعاني من ضيق في التنفس؟");
                followUpQuestions.Add("هل سبق تشخيصك بالربو أو حساسية الصدر؟");
                followUpQuestions.Add("هل تشعر بألم في الصدر عند السعال أو التنفس العميق؟");
            }
            else if (Regex.IsMatch(initialSymptom, @"حمى|ارتفاع.*حرارة|برد|انفلونزا", RegexOptions.IgnoreCase))
            {
                followUpQuestions.Add("كم درجة حرارتك؟");
                followUpQuestions.Add("هل تعاني من قشعريرة أو تعرق؟");
                followUpQuestions.Add("هل تعاني من آلام في العضلات أو المفاصل؟");
                followUpQuestions.Add("هل كنت على اتصال مع شخص مريض مؤخراً؟");
            }
            else if (Regex.IsMatch(initialSymptom, @"جلد|طفح|حكة|حبوب|اكزيما", RegexOptions.IgnoreCase))
            {
                followUpQuestions.Add("هل الطفح الجلدي مصحوب بحكة؟");
                followUpQuestions.Add("هل يظهر الطفح في منطقة محددة أم في كل الجسم؟");
                followUpQuestions.Add("هل استخدمت منتجات جديدة للعناية بالبشرة أو تناولت طعاماً جديداً؟");
                followUpQuestions.Add("هل لديك تاريخ مع الأمراض الجلدية أو الحساسية؟");
            }
            
            return followUpQuestions;
        }

        public async Task<(bool success, string appointmentDetails)> SendAppointmentReminderAsync(string userId, int appointmentId)
        {
            try
            {
                var appointment = await _context.Appointments.FindAsync(appointmentId);
                if (appointment == null)
                {
                    return (false, "لم يتم العثور على الموعد المحدد.");
                }
                
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.ApplicationUserId == userId);
                if (patient == null || appointment.PatientID != patient.Id)
                {
                    return (false, "ليس لديك صلاحية الوصول لهذا الموعد.");
                }
                
                var doctor = await _context.Doctors.FindAsync(appointment.DoctorID);
                if (doctor == null)
                {
                    return (false, "لم يتم العثور على بيانات الطبيب.");
                }
                
                var clinicInfo = await _context.Clinics.FindAsync(doctor.ClinicID);
                
                // Create reminder message
                var reminderMessage = new StringBuilder();
                reminderMessage.AppendLine($"تذكير بموعدك القادم:");
                reminderMessage.AppendLine($"التاريخ: {appointment.AppointmentDate.ToString("yyyy-MM-dd")}");
                reminderMessage.AppendLine($"الوقت: {appointment.AppointmentDate.ToString("HH:mm")}");
                reminderMessage.AppendLine($"الطبيب: د. {doctor.FirstName} {doctor.LastName}");
                
                if (clinicInfo != null)
                {
                    reminderMessage.AppendLine($"العنوان: {clinicInfo.Address}");
                    reminderMessage.AppendLine($"رقم الهاتف: {clinicInfo.PhoneNumber}");
                }
                
                reminderMessage.AppendLine();
                reminderMessage.AppendLine("تعليمات مهمة:");
                reminderMessage.AppendLine("- يرجى الحضور قبل الموعد بـ 15 دقيقة");
                reminderMessage.AppendLine("- إحضار التقارير الطبية السابقة إن وجدت");
                reminderMessage.AppendLine("- إحضار قائمة بالأدوية التي تتناولها حالياً");
                
                // Create notification in the system
                var notification = new Notification
                {
                    UserAccountId = int.Parse(userId),
                    Message = reminderMessage.ToString(),
                    CreatedAt = DateTime.Now,
                    IsRead = false
                };
                
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();
                
                return (true, reminderMessage.ToString());
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in SendAppointmentReminderAsync");
                return (false, "حدث خطأ أثناء إرسال التذكير. يرجى المحاولة مرة أخرى.");
            }
        }

        public async Task<string> GetPatientMedicalHistoryAsync(string userId)
        {
            try
            {
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.ApplicationUserId == userId);
                if (patient == null)
                {
                    return "لم يتم العثور على السجل الطبي للمريض.";
                }
                
                var medicalHistory = new StringBuilder();
                medicalHistory.AppendLine("السجل الطبي:");
                
                // Get past appointments
                var pastAppointments = await _context.Appointments
                    .Where(a => a.PatientID == patient.Id && a.AppointmentDate < DateTime.Now)
                    .OrderByDescending(a => a.AppointmentDate)
                    .Take(5)
                    .ToListAsync();
                
                if (pastAppointments.Any())
                {
                    medicalHistory.AppendLine("\nالزيارات السابقة:");
                    foreach (var appointment in pastAppointments)
                    {
                        var doctor = await _context.Doctors.FindAsync(appointment.DoctorID);
                        medicalHistory.AppendLine($"- {appointment.AppointmentDate.ToString("yyyy-MM-dd")}: د. {doctor?.FirstName} {doctor?.LastName} ({doctor?.Specialization}) - {appointment.Notes ?? "لا توجد ملاحظات"}");
                    }
                }
                else
                {
                    medicalHistory.AppendLine("\nلا توجد زيارات سابقة مسجلة.");
                }
                
                // Add chronic conditions if available
                if (!string.IsNullOrEmpty(patient.MedicalHistory))
                {
                    medicalHistory.AppendLine("\nالسجل الطبي:");
                    medicalHistory.AppendLine(patient.MedicalHistory);
                }
                
                return medicalHistory.ToString();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GetPatientMedicalHistoryAsync");
                return "حدث خطأ أثناء استرجاع السجل الطبي. يرجى المحاولة مرة أخرى.";
            }
        }

        public async Task<(bool success, string message)> RecordSymptomHistoryAsync(string userId, string symptoms, string severity)
        {
            try
            {
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.ApplicationUserId == userId);
                if (patient == null)
                {
                    return (false, "لم يتم العثور على سجل المريض.");
                }
                
                // Create a new chat message to record the symptoms
                var chatBotMessage = new ChatBotMessage
                {
                    UserId = userId,
                    Content = $"Symptoms: {symptoms}, Severity: {severity}",
                    Timestamp = DateTime.Now,
                    Role = "system"
                };
                
                _context.chatBotMessages.Add(chatBotMessage);
                await _context.SaveChangesAsync();
                
                return (true, "تم تسجيل الأعراض بنجاح في سجلك الطبي.");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in RecordSymptomHistoryAsync");
                return (false, "حدث خطأ أثناء تسجيل الأعراض. يرجى المحاولة مرة أخرى.");
            }
        }

        public async Task<List<(string doctorName, int doctorId, DateTime nextAvailable)>> GetRecommendedDoctorsAsync(string specialty, string userId)
        {
            try
            {
                var result = new List<(string doctorName, int doctorId, DateTime nextAvailable)>();
                
                // Get doctors with the specified specialty
                var doctors = await _context.Doctors
                    .Include(d => d.Specialization)
                    .Where(d => d.Specialization.Name == specialty)
                    .ToListAsync();
                    
                if (!doctors.Any())
                {
                    return result;
                }
                
                foreach (var doctor in doctors)
                {
                    // Find next available slot for this doctor
                    var nextAvailableDate = DateTime.Now.Date;
                    var found = false;
                    
                    // Look for the next 14 days
                    for (int i = 0; i < 14 && !found; i++)
                    {
                        var date = nextAvailableDate.AddDays(i);
                        var availableSlots = await GetAvailableTimeSlots(doctor.Id, date);
                        
                        if (availableSlots.Any())
                        {
                            nextAvailableDate = date;
                            found = true;
                            break;
                        }
                    }
                    
                    if (found)
                    {
                        result.Add((
                            doctorName: $"{doctor.FirstName} {doctor.LastName}",
                            doctorId: doctor.Id,
                            nextAvailable: nextAvailableDate
                        ));
                    }
                }
                
                // Sort by earliest available date
                return result.OrderBy(d => d.nextAvailable).ToList();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in GetRecommendedDoctorsAsync");
                return new List<(string, int, DateTime)>();
            }
        }

        public async Task<string> GenerateSafetyInstructionsAsync(string symptoms, string urgencyLevel)
        {
            var safetyInstructions = new StringBuilder();
            
            // Check for emergency conditions
            if (Regex.IsMatch(symptoms, @"صدر|قلب|تنفس|ألم.*حاد|سكتة|نوبة|غيبوبة|فقدان.*وعي", RegexOptions.IgnoreCase) ||
                urgencyLevel.Contains("طوارئ"))
            {
                safetyInstructions.AppendLine("🚨 تعليمات السلامة الفورية:");
                safetyInstructions.AppendLine("• اتصل بالإسعاف على الفور على الرقم 123");
                safetyInstructions.AppendLine("• لا تقم بالقيادة بنفسك إلى المستشفى");
                safetyInstructions.AppendLine("• ابق هادئاً وحافظ على التنفس بانتظام");
                safetyInstructions.AppendLine("• لا تأكل أو تشرب حتى وصول المساعدة الطبية");
            }
            else if (Regex.IsMatch(symptoms, @"حمى|ارتفاع.*حرارة|صداع.*شديد|قيء.*مستمر", RegexOptions.IgnoreCase) ||
                    urgencyLevel.Contains("عاجل"))
            {
                safetyInstructions.AppendLine("⚠️ تعليمات مهمة:");
                safetyInstructions.AppendLine("• راجع أقرب مركز طبي في أقرب وقت ممكن");
                safetyInstructions.AppendLine("• خذ قسطاً من الراحة وتجنب المجهود البدني");
                safetyInstructions.AppendLine("• حافظ على ترطيب جسمك بشرب السوائل بكثرة");
                
                if (Regex.IsMatch(symptoms, @"حمى|ارتفاع.*حرارة", RegexOptions.IgnoreCase))
                {
                    safetyInstructions.AppendLine("• يمكن استخدام خافض للحرارة مثل الباراسيتامول وفقاً للجرعة الموصى بها");
                    safetyInstructions.AppendLine("• ضع كمادات باردة على الجبهة والرقبة للمساعدة في خفض الحرارة");
                }
            }
            else
            {
                safetyInstructions.AppendLine("📋 نصائح عامة:");
                safetyInstructions.AppendLine("• احرص على الراحة الكافية");
                safetyInstructions.AppendLine("• اشرب كميات كافية من الماء");
                safetyInstructions.AppendLine("• تناول غذاءً صحياً ومتوازناً");
                safetyInstructions.AppendLine("• راقب الأعراض وسجلها لمشاركتها مع الطبيب");
                safetyInstructions.AppendLine("• إذا استمرت الأعراض أو ساءت، راجع الطبيب");
            }
            
            return safetyInstructions.ToString();
        }
    }

    public class AppointmentBookingState
    {
        public int DoctorId { get; set; }
        public int PatientId { get; set; }
        public BookingStep CurrentStep { get; set; }
        public DateTime AppointmentDate { get; set; }
        public TimeSpan AppointmentTime { get; set; }
        public Doctors Doctor { get; set; }
    }

    public enum BookingStep
    {
        SelectDate,
        SelectTime,
        Confirm
    }
} 