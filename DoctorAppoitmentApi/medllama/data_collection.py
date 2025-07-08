import os
import json
import re
import logging
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm
import random

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ArabicMedicalDataCollector:
    """Class for collecting and processing Arabic medical data."""
    
    def __init__(self, output_dir):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
    def clean_text(self, text):
        """Clean and normalize Arabic text."""
        if not text:
            return ""
            
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Normalize Arabic text
        text = re.sub(r'[إأآا]', 'ا', text)
        text = re.sub(r'[ىي]', 'ي', text)
        text = re.sub(r'ة', 'ه', text)
        
        return text.strip()
    
    def extract_from_existing_database(self, source_file, max_samples=None):
        """Extract data from an existing database or file."""
        logger.info(f"Extracting data from {source_file}")
        
        if not os.path.exists(source_file):
            logger.error(f"Source file {source_file} does not exist")
            return []
        
        data = []
        
        try:
            with open(source_file, 'r', encoding='utf-8') as f:
                content = json.load(f)
                
                # Determine the structure of the content
                if isinstance(content, list):
                    for item in tqdm(content[:max_samples] if max_samples else content):
                        if isinstance(item, dict):
                            # Try to find question and answer fields
                            question = item.get('question') or item.get('query') or item.get('سؤال')
                            answer = item.get('answer') or item.get('response') or item.get('جواب')
                            
                            if question and answer:
                                data.append({
                                    "question": self.clean_text(question),
                                    "answer": self.clean_text(answer)
                                })
                elif isinstance(content, dict):
                    # Process dictionary structure
                    for key, value in content.items():
                        if isinstance(value, str):
                            # Assume key is question and value is answer
                            data.append({
                                "question": self.clean_text(key),
                                "answer": self.clean_text(value)
                            })
                        elif isinstance(value, dict):
                            # Try to find question and answer fields
                            question = value.get('question') or value.get('query') or value.get('سؤال')
                            answer = value.get('answer') or value.get('response') or value.get('جواب')
                            
                            if question and answer:
                                data.append({
                                    "question": self.clean_text(question),
                                    "answer": self.clean_text(answer)
                                })
        except Exception as e:
            logger.error(f"Error processing {source_file}: {e}")
            
        logger.info(f"Extracted {len(data)} QA pairs from {source_file}")
        return data
    
    def generate_synthetic_data(self, n_samples=100):
        """Generate synthetic medical Q&A pairs in Arabic."""
        logger.info(f"Generating {n_samples} synthetic medical QA pairs")
        
        # Sample medical questions and answers in Arabic
        questions = [
            "ما هي أعراض مرض السكري؟",
            "كيف أتعامل مع ارتفاع ضغط الدم؟",
            "ما هي فوائد المشي اليومي للصحة؟",
            "كيف أحافظ على صحة القلب؟",
            "ما هي أسباب الصداع المستمر؟",
            "كيف أتعامل مع حساسية الأنف؟",
            "ما هي طرق علاج السمنة؟",
            "كيف أعرف أنني مصاب بفقر الدم؟",
            "ما هي أعراض التهاب المفاصل؟",
            "كيف أتعامل مع الأرق وقلة النوم؟",
            "ما هي طرق الوقاية من أمراض القلب؟",
            "كيف أميز بين نزلة البرد والإنفلونزا؟"
        ]
        
        # General template answers
        answer_templates = [
            "هذه الحالة تتميز بالأعراض التالية: {symptoms}. ينصح {recommendations}.",
            "للتعامل مع هذه الحالة، يجب {instructions}. من المهم أيضاً {additional_advice}.",
            "{condition_name} هو {definition}. الأعراض الشائعة تشمل {symptoms}. العلاج يتضمن {treatment}.",
            "يمكن الوقاية من هذه الحالة عن طريق {prevention}. في حال ظهور أعراض مثل {symptoms}، يجب استشارة الطبيب."
        ]
        
        # Medical terms and phrases in Arabic
        symptoms = [
            "الصداع المستمر", "ارتفاع درجة الحرارة", "آلام المفاصل", "فقدان الشهية", 
            "التعب والإرهاق", "الدوخة", "صعوبة في التنفس", "خفقان القلب",
            "اضطرابات النوم", "آلام البطن", "الغثيان", "العطش المستمر"
        ]
        
        recommendations = [
            "بشرب كميات كافية من الماء", "بممارسة الرياضة بانتظام", "بتناول غذاء صحي متوازن", 
            "بالحصول على قسط كافٍ من النوم", "بتجنب التوتر والضغوط النفسية", "باستشارة الطبيب في أقرب وقت"
        ]
        
        treatments = [
            "تناول الأدوية الموصوفة من الطبيب", "الراحة التامة", "العلاج الطبيعي", 
            "تغيير نمط الحياة", "التدخل الجراحي في الحالات المتقدمة", "العلاج السلوكي المعرفي"
        ]
        
        condition_names = [
            "ارتفاع ضغط الدم", "السكري", "التهاب المفاصل", "الربو", "القلق والاكتئاب", 
            "قرحة المعدة", "التهاب الكبد", "فقر الدم", "اضطرابات الغدة الدرقية", "الصداع النصفي"
        ]
        
        data = []
        
        # Generate synthetic QA pairs
        for _ in tqdm(range(n_samples)):
            question = random.choice(questions)
            template = random.choice(answer_templates)
            
            # Fill in template with random medical terms
            answer = template.format(
                symptoms=', '.join(random.sample(symptoms, k=random.randint(2, 4))),
                recommendations=random.choice(recommendations),
                instructions=random.choice(recommendations),
                additional_advice=random.choice(recommendations),
                condition_name=random.choice(condition_names),
                definition="حالة طبية شائعة تؤثر على " + random.choice(["القلب", "الرئتين", "الكبد", "الكلى", "الجهاز الهضمي", "الدماغ"]),
                treatment=', '.join(random.sample(treatments, k=random.randint(2, 3))),
                prevention=random.choice(recommendations)
            )
            
            data.append({
                "question": question,
                "answer": answer
            })
            
        logger.info(f"Generated {len(data)} synthetic QA pairs")
        return data
    
    def save_dataset(self, data, filename):
        """Save the collected data to a JSON file."""
        output_path = os.path.join(self.output_dir, filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        logger.info(f"Saved {len(data)} QA pairs to {output_path}")
        return output_path
    
    def create_train_test_split(self, data, train_ratio=0.8, output_prefix="medical"):
        """Split the data into training and testing sets."""
        random.shuffle(data)
        
        split_idx = int(len(data) * train_ratio)
        train_data = data[:split_idx]
        test_data = data[split_idx:]
        
        train_path = self.save_dataset(train_data, f"{output_prefix}_train.json")
        test_path = self.save_dataset(test_data, f"{output_prefix}_test.json")
        
        return train_path, test_path
    
    def process_project_database(self, db_connection=None):
        """Extract medical data from the project's database."""
        # This is a placeholder - implement the actual database extraction
        # based on your project's database schema
        logger.warning("Database extraction not implemented. Generating synthetic data instead.")
        return self.generate_synthetic_data(100)

def main():
    # Example usage
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    collector = ArabicMedicalDataCollector(output_dir)
    
    # Generate synthetic data
    data = collector.generate_synthetic_data(200)
    
    # Split into train/test sets
    train_path, test_path = collector.create_train_test_split(data)
    
    logger.info(f"Training data saved to {train_path}")
    logger.info(f"Testing data saved to {test_path}")

if __name__ == "__main__":
    main()
