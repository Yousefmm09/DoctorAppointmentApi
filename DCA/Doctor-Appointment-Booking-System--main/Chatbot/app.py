from flask import Flask, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# بيانات تدريب
texts = [
    "عندي سخونية وصداع",
    "ألم في المعدة",
    "كحة مستمرة وصعوبة في التنفس",
    "ألم في الأذن",
    "طفح جلدي وحكة",
    "صداع نصفي مع دوخة"
]

labels = [
    "إنفلونزا",
    "مشاكل هضمية",
    "التهاب رئوي",
    "مشاكل أذن",
    "حساسية",
    "صداع نصفي"
]

# تحويل النصوص لأرقام
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(texts)

# بناء نموذج التصنيف
model = LogisticRegression()
model.fit(X, labels)

@app.route('/classify', methods=['POST'])
def classify():
    try:
        data = request.json
        logger.info(f"Received request: {data}")
        
        if not data:
            logger.warning("No JSON data received")
            return jsonify({"error": "No JSON data received"}), 400
            
        symptom = data.get('symptom')
        if not symptom:
            logger.warning("No symptom provided in request")
            return jsonify({"error": "يرجى إرسال العرض في المفتاح 'symptom'"}), 400

        x = vectorizer.transform([symptom])
        prediction = model.predict(x)[0]
        
        response = {"reply": prediction}
        logger.info(f"Sending response: {response}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    logger.info("Starting Flask application")
    app.run(debug=True)