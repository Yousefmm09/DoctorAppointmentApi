import os
import sys
import json
import logging
import requests
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('medllama_integration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class MedLLamaIntegration:
    """A class to integrate MedLLama Arabic with the existing chatbot system."""
    
    def __init__(self, medllama_api_url="http://localhost:5001", fallback_to_existing=True):
        """
        Initialize the MedLLama integration.
        
        Args:
            medllama_api_url: URL to the MedLLama API server
            fallback_to_existing: Whether to fall back to the existing chatbot if MedLLama fails
        """
        self.medllama_api_url = medllama_api_url
        self.fallback_to_existing = fallback_to_existing
        self.health_check_successful = False
        
        # Try an initial health check
        self._check_medllama_health()
    
    def _check_medllama_health(self):
        """Check if MedLLama API is healthy."""
        try:
            response = requests.get(f"{self.medllama_api_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.health_check_successful = data.get("model_status") == "loaded"
                if self.health_check_successful:
                    logger.info("MedLLama API health check successful")
                else:
                    logger.warning("MedLLama API is up but model is not loaded yet")
            else:
                logger.warning(f"MedLLama API health check failed with status {response.status_code}")
                self.health_check_successful = False
        except Exception as e:
            logger.error(f"MedLLama API health check error: {str(e)}")
            self.health_check_successful = False
            
        return self.health_check_successful
    
    def is_arabic_text(self, text):
        """Check if the text contains Arabic characters."""
        # Arabic Unicode range (simplified check)
        return any('\u0600' <= c <= '\u06FF' for c in text)
    
    def is_medical_query(self, text):
        """Determine if the query is medical-related."""
        # Arabic medical keywords
        medical_keywords = [
            "مرض", "طبيب", "صحة", "علاج", "دواء", "صداع", "ألم", "وجع", "حمى", "حرارة",
            "سعال", "التهاب", "عملية", "فحص", "مستشفى", "عيادة", "تحليل", "أشعة", "صيدلية",
            "جراحة", "قلب", "رئة", "كبد", "كلى", "معدة", "أمعاء", "سكري", "ضغط"
        ]
        
        # Check if any keywords are present
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in medical_keywords)
    
    def process_query(self, query, user_id=None, include_suggestions=False):
        """
        Process a user query using MedLLama or fall back to the existing system.
        
        Args:
            query: The user's query text
            user_id: Optional user ID for context
            include_suggestions: Whether to include suggested follow-up questions
            
        Returns:
            dict: Response with answer and optional suggestions
        """
        # Check if we should use MedLLama
        use_medllama = self.health_check_successful and self.is_arabic_text(query) and self.is_medical_query(query)
        
        if use_medllama:
            try:
                # Try using MedLLama
                response = requests.post(
                    f"{self.medllama_api_url}/generate",
                    json={"question": query},
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result = {
                        "response": data.get("response", "لم أستطع فهم استفسارك. هل يمكنك توضيح سؤالك؟"),
                        "source": "medllama"
                    }
                    
                    # Log the successful response
                    logger.info(f"MedLLama response for query: {query[:50]}...")
                    self._log_interaction(query, result["response"], "medllama", user_id)
                    
                    return result
                else:
                    logger.warning(f"MedLLama API returned status {response.status_code}")
                    if self.fallback_to_existing:
                        return self._fallback_to_existing(query, user_id, include_suggestions)
            except Exception as e:
                logger.error(f"Error using MedLLama API: {str(e)}")
                if self.fallback_to_existing:
                    return self._fallback_to_existing(query, user_id, include_suggestions)
        
        # Either not suitable for MedLLama or we need to fall back
        return self._fallback_to_existing(query, user_id, include_suggestions)
    
    def _fallback_to_existing(self, query, user_id=None, include_suggestions=False):
        """Fall back to the existing chatbot system."""
        try:
            # Use the existing chatbot API
            from app import classify_symptom
            
            result = {
                "response": classify_symptom(query),
                "source": "existing_chatbot"
            }
            
            # Log the fallback
            logger.info(f"Fallback response for query: {query[:50]}...")
            self._log_interaction(query, result["response"], "existing_chatbot", user_id)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in fallback: {str(e)}")
            # If everything fails, return a generic response
            return {
                "response": "عذراً، لم أستطع فهم سؤالك حالياً. يرجى المحاولة مرة أخرى أو التواصل مع طبيب.",
                "source": "generic_fallback"
            }
    
    def _log_interaction(self, query, response, source, user_id=None):
        """Log the interaction to a file for analysis."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "response": response,
            "source": source,
            "user_id": user_id
        }
        
        log_file = "medllama_interactions.jsonl"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

# Example usage as a standalone module
if __name__ == "__main__":
    # Test the integration
    integration = MedLLamaIntegration()
    
    # Test with an Arabic medical query
    test_query = "أعاني من صداع شديد منذ ثلاثة أيام، ماذا أفعل؟"
    result = integration.process_query(test_query)
    
    print(f"Query: {test_query}")
    print(f"Response source: {result['source']}")
    print(f"Response: {result['response']}") 