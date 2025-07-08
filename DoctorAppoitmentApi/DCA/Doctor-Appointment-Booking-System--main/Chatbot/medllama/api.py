from flask import Flask, request, jsonify
import os
import json
import logging
import traceback
from medllama_arabic import MedLLamaArabic, MedLLamaConfig
import threading

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Initialize MedLLama model with default configuration
model = None
model_lock = threading.Lock()

def initialize_model():
    """Initialize the MedLLama model in a separate thread."""
    global model
    
    with model_lock:
        if model is None:
            logger.info("Initializing MedLLama Arabic model...")
            try:
                model_config = MedLLamaConfig()
                model = MedLLamaArabic(model_config)
                model.load_model()
                logger.info("MedLLama Arabic model initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing model: {str(e)}")
                logger.error(traceback.format_exc())
                model = None

@app.before_first_request
def before_first_request():
    """Initialize model before the first request."""
    threading.Thread(target=initialize_model).start()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    with model_lock:
        model_status = "loaded" if model is not None else "not_loaded"
        
    return jsonify({
        "status": "healthy", 
        "model_status": model_status
    })

@app.route('/classify', methods=['POST'])
def classify():
    """Process a medical query and return a response."""
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

        with model_lock:
            if model is None:
                return jsonify({"error": "النموذج قيد التحميل، يرجى المحاولة بعد قليل"}), 503
            
            response = model.generate_response(symptom)
        
        result = {"reply": response}
        logger.info(f"Sending response: {result}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/generate', methods=['POST'])
def generate():
    """Generate a response to a medical query."""
    try:
        data = request.json
        logger.info(f"Received generate request")
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        question = data.get('question')
        max_new_tokens = data.get('max_new_tokens', 256)
        
        if not question:
            return jsonify({"error": "يرجى إرسال السؤال في المفتاح 'question'"}), 400

        with model_lock:
            if model is None:
                return jsonify({"error": "النموذج قيد التحميل، يرجى المحاولة بعد قليل"}), 503
            
            response = model.generate_response(question, max_new_tokens=max_new_tokens)
        
        result = {
            "question": question,
            "response": response
        }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing generate request: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/batch', methods=['POST'])
def batch_process():
    """Process multiple medical queries in batch."""
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        questions = data.get('questions', [])
        
        if not questions or not isinstance(questions, list):
            return jsonify({"error": "يرجى إرسال قائمة من الأسئلة في المفتاح 'questions'"}), 400

        results = []
        
        with model_lock:
            if model is None:
                return jsonify({"error": "النموذج قيد التحميل، يرجى المحاولة بعد قليل"}), 503
            
            for question in questions:
                response = model.generate_response(question)
                results.append({
                    "question": question,
                    "response": response
                })
        
        return jsonify({"results": results})
        
    except Exception as e:
        logger.error(f"Error processing batch request: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/finetune', methods=['POST'])
def finetune():
    """Start a fine-tuning job."""
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        train_data_path = data.get('train_data_path')
        output_dir = data.get('output_dir')
        batch_size = data.get('batch_size', 4)
        epochs = data.get('epochs', 3)
        learning_rate = data.get('learning_rate', 3e-4)
        
        if not train_data_path or not output_dir:
            return jsonify({"error": "يرجى تحديد مسار بيانات التدريب ومسار الإخراج"}), 400

        # Start fine-tuning in a separate thread
        def start_finetuning():
            try:
                with model_lock:
                    if model is None:
                        initialize_model()
                    
                    model.finetune(
                        train_data_path=train_data_path,
                        output_dir=output_dir,
                        batch_size=batch_size,
                        epochs=epochs,
                        learning_rate=learning_rate
                    )
            except Exception as e:
                logger.error(f"Fine-tuning error: {str(e)}")
                logger.error(traceback.format_exc())
        
        threading.Thread(target=start_finetuning).start()
        
        return jsonify({
            "status": "Fine-tuning job started",
            "train_data_path": train_data_path,
            "output_dir": output_dir,
            "parameters": {
                "batch_size": batch_size,
                "epochs": epochs,
                "learning_rate": learning_rate
            }
        })
        
    except Exception as e:
        logger.error(f"Error starting fine-tuning: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Initialize model during startup
    threading.Thread(target=initialize_model).start()
    app.run(debug=True, host='0.0.0.0', port=5001) 