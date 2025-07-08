from flask import Flask, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import logging
import os
import json

# Import the original chatbot functionality
from chatbot import get_response

# Import MedLLama integration if available
try:
    from medllama.medllama_integration import MedLLamaIntegration
    MEDLLAMA_AVAILABLE = True
    medllama_integration = MedLLamaIntegration()
except ImportError:
    MEDLLAMA_AVAILABLE = False
    medllama_integration = None
    logging.warning("MedLLama integration not available. Using only the basic chatbot.")

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

def classify_symptom(symptom):
    """Classify a symptom using the simple model."""
    try:
        x = vectorizer.transform([symptom])
        prediction = model.predict(x)[0]
        return prediction
    except Exception as e:
        logger.error(f"Error classifying symptom: {str(e)}")
        return "لا يمكن تصنيف العرض، يرجى استشارة الطبيب"

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

        # Try using MedLLama if available
        if MEDLLAMA_AVAILABLE:
            user_id = data.get('userId')
            include_suggestions = data.get('includeSuggestions', False)
            
            result = medllama_integration.process_query(symptom, user_id, include_suggestions)
            
            response = {
                "reply": result["response"],
                "source": result["source"]
            }
            
            logger.info(f"Sending MedLLama response: {response}")
            return jsonify(response)
        else:
            # Fall back to original chatbot
            prediction = classify_symptom(symptom)
            
            response = {"reply": prediction}
            logger.info(f"Sending response: {response}")
            return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """Enhanced chat endpoint that supports both MedLLama and legacy chatbot."""
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        message = data.get('message')
        if not message:
            return jsonify({"error": "يرجى إرسال الرسالة في المفتاح 'message'"}), 400
            
        user_id = data.get('userId')
        include_suggestions = data.get('includeSuggestions', False)
        
        if MEDLLAMA_AVAILABLE:
            result = medllama_integration.process_query(message, user_id, include_suggestions)
            
            # Format response
            response = {
                "response": result["response"],
                "source": result["source"]
            }
            
            return jsonify(response)
        else:
            # Use legacy chatbot
            simple_response = get_response(message)
            
            return jsonify({
                "response": simple_response,
                "source": "legacy_chatbot"
            })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            "error": "حدث خطأ أثناء معالجة طلبك", 
            "details": str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    status = {
        "status": "healthy",
        "medllama_available": MEDLLAMA_AVAILABLE
    }
    
    if MEDLLAMA_AVAILABLE:
        status["medllama_health"] = medllama_integration._check_medllama_health()
    
    return jsonify(status), 200

if __name__ == '__main__':
    logger.info("Starting Flask application")
    logger.info(f"MedLLama integration: {'Available' if MEDLLAMA_AVAILABLE else 'Not available'}")
    app.run(debug=True, host='0.0.0.0') 