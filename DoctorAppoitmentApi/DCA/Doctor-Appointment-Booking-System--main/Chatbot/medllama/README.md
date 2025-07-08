# المساعد الطبي الذكي MedLLama Arabic

هذا المشروع هو تكامل لنموذج MedLLama مع دعم اللغة العربية لمشروع نظام حجز مواعيد الأطباء.

## المميزات

- دعم كامل للغة العربية في الاستفسارات والإجابات الطبية
- تكامل مع نظام المحادثة الحالي مع خاصية الرجوع للنظام القديم عند الحاجة
- واجهة برمجية REST API سهلة الاستخدام
- مكون React جاهز للاستخدام في واجهة المستخدم
- دعم للتدريب المخصص على بيانات طبية عربية
- إمكانية استخدام نموذج مصغر مع تقنية LoRA للكفاءة

## متطلبات النظام

- Python 3.8+
- CUDA (للتسريع باستخدام GPU) - اختياري ولكن موصى به
- Node.js (للواجهة الأمامية)
- 4GB+ RAM (8GB+ موصى به)

## خطوات التثبيت

### 1. إعداد البيئة

```bash
# إنشاء بيئة Python افتراضية
python -m venv medllama-env

# تفعيل البيئة الافتراضية
# في Windows
medllama-env\Scripts\activate
# في Linux/macOS
source medllama-env/bin/activate

# تثبيت المتطلبات
cd DoctorAppoitmentApi/DCA/Doctor-Appointment-Booking-System--main/Chatbot/medllama
pip install -r requirements.txt
```

### 2. تجهيز بيانات التدريب

يمكنك استخدام سكربت `data_collection.py` لإنشاء بيانات تدريبية:

```bash
python data_collection.py
```

سيقوم هذا بإنشاء مجموعة بيانات تدريبية اصطناعية في مجلد `data`.

### 3. تشغيل واجهة API

```bash
python api.py
```

سيتم تشغيل الخادم على المنفذ 5001.

### 4. دمج المكون في الواجهة الأمامية

قم بإضافة `MedLLamaChat.jsx` إلى مشروع React الخاص بك واستخدمه في الصفحة المناسبة:

```jsx
import MedLLamaChat from './components/MedLLamaChat';

function App() {
  return (
    <div className="container mx-auto p-4">
      <h1>المساعد الطبي</h1>
      <div className="h-[600px]">
        <MedLLamaChat userId="user123" />
      </div>
    </div>
  );
}
```

## تدريب النموذج

لتدريب النموذج على بيانات طبية عربية مخصصة:

```bash
# باستخدام واجهة API
curl -X POST http://localhost:5001/finetune \
  -H "Content-Type: application/json" \
  -d '{
    "train_data_path": "path/to/your/train_data.json",
    "output_dir": "path/to/output_model",
    "batch_size": 4,
    "epochs": 3,
    "learning_rate": 3e-4
  }'

# أو باستخدام Python مباشرة
python -c "
from medllama_arabic import MedLLamaArabic, MedLLamaConfig
model = MedLLamaArabic()
model.prepare_for_training()
model.finetune('path/to/your/train_data.json', 'path/to/output_model')
"
```

## استخدام النموذج مباشرة

يمكنك استخدام النموذج مباشرة في كود Python الخاص بك:

```python
from medllama_arabic import MedLLamaArabic

# تحميل النموذج
model = MedLLamaArabic()
model.load_model()

# توليد إجابة
question = "ما هي أعراض ارتفاع ضغط الدم؟"
response = model.generate_response(question)
print(response)
```

## تكامل مع النظام الحالي

لاستخدام MedLLama مع نظام المحادثة الحالي:

```python
from medllama_integration import MedLLamaIntegration

# إنشاء كائن التكامل
integration = MedLLamaIntegration()

# معالجة استفسار المستخدم
result = integration.process_query(
    query="أعاني من صداع شديد منذ يومين، ما العلاج المناسب؟", 
    user_id="user123"
)

print(f"Response source: {result['source']}")  # medllama أو existing_chatbot
print(f"Response: {result['response']}")
```

## ملاحظات هامة

1. تأكد من وجود مفتاح API صالح لـ Hugging Face إذا كنت تستخدم نماذج مقيدة.
2. للحصول على أفضل أداء، يُفضل استخدام GPU مع ذاكرة 8GB أو أكثر.
3. يمكن تعديل إعدادات النموذج من خلال `MedLLamaConfig` للتحكم في استخدام الذاكرة والأداء.
4. للتكامل مع واجهة C#، استخدم الواجهة البرمجية REST API المضمنة.

## المساهمة

نرحب بالمساهمات والاقتراحات لتحسين أداء النموذج مع اللغة العربية. يمكنك المساهمة من خلال:

1. إضافة بيانات تدريبية طبية عربية جديدة
2. تحسين خوارزميات معالجة اللغة العربية
3. تحسين واجهة المستخدم
4. اقتراح تقنيات تدريب أفضل

## الترخيص

هذا المشروع مرخص تحت رخصة MIT. 