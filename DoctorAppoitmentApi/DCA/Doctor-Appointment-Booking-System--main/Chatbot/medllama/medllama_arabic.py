import os
import torch
import json
import logging
from dataclasses import dataclass
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model
from tqdm import tqdm
from torch.utils.data import Dataset, DataLoader
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class MedLLamaConfig:
    """Configuration class for MedLLama models."""
    base_model: str = "meta-llama/Llama-2-7b-chat-hf"  # Could be replaced with an Arabic or multilingual base
    lora_r: int = 8
    lora_alpha: int = 16
    lora_dropout: float = 0.05
    use_4bit: bool = True
    bnb_4bit_compute_dtype: torch.dtype = torch.float16
    bnb_4bit_quant_type: str = "nf4"
    device_map: str = "auto"
    target_modules: list = None
    max_length: int = 512
    arabic_prompt_template: str = """
<SYS>
أنت مساعد طبي ذكي متخصص في الإجابة على الأسئلة الطبية باللغة العربية. أنت تقدم معلومات دقيقة وموثوقة.
<</SYS>

{instruction}
"""

class ArabicMedicalDataset(Dataset):
    """Dataset for Arabic medical data."""
    
    def __init__(self, data_path, tokenizer, max_length=512):
        self.tokenizer = tokenizer
        self.max_length = max_length
        
        # Load data
        logger.info(f"Loading data from {data_path}")
        with open(data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        
        logger.info(f"Loaded {len(self.data)} examples")
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        
        # Format the prompt using the Arabic prompt template
        prompt = MedLLamaConfig().arabic_prompt_template.format(instruction=item["question"])
        
        # Tokenize
        encoded_prompt = self.tokenizer(prompt, truncation=True, max_length=self.max_length - len(item["answer"]))
        encoded_answer = self.tokenizer(item["answer"], truncation=True, max_length=len(item["answer"]))
        
        # Create input_ids and labels
        input_ids = encoded_prompt["input_ids"] + encoded_answer["input_ids"]
        attention_mask = encoded_prompt["attention_mask"] + encoded_answer["attention_mask"]
        labels = [-100] * len(encoded_prompt["input_ids"]) + encoded_answer["input_ids"]
        
        # Pad or truncate
        if len(input_ids) < self.max_length:
            padding_length = self.max_length - len(input_ids)
            input_ids = input_ids + [self.tokenizer.pad_token_id] * padding_length
            attention_mask = attention_mask + [0] * padding_length
            labels = labels + [-100] * padding_length
        else:
            input_ids = input_ids[:self.max_length]
            attention_mask = attention_mask[:self.max_length]
            labels = labels[:self.max_length]
            
        return {
            "input_ids": torch.tensor(input_ids),
            "attention_mask": torch.tensor(attention_mask),
            "labels": torch.tensor(labels)
        }

class MedLLamaArabic:
    """Class for handling MedLLama models with Arabic support."""
    
    def __init__(self, config=None):
        self.config = config or MedLLamaConfig()
        self.tokenizer = None
        self.model = None
        
    def load_model(self):
        """Load the MedLLama model."""
        logger.info(f"Loading model from {self.config.base_model}")
        
        # Setup quantization config if enabled
        if self.config.use_4bit:
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=self.config.bnb_4bit_compute_dtype,
                bnb_4bit_quant_type=self.config.bnb_4bit_quant_type,
                bnb_4bit_use_double_quant=False
            )
        else:
            quantization_config = None
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.config.base_model,
            use_fast=True
        )
        
        # Ensure padding token exists
        if self.tokenizer.pad_token_id is None:
            self.tokenizer.pad_token_id = self.tokenizer.eos_token_id
            
        # Load model
        self.model = AutoModelForCausalLM.from_pretrained(
            self.config.base_model,
            quantization_config=quantization_config,
            device_map=self.config.device_map
        )
        
        logger.info("Model loaded successfully")
        return self.model, self.tokenizer
    
    def prepare_for_training(self):
        """Prepare the model for LoRA fine-tuning."""
        if self.model is None:
            self.load_model()
        
        # Set target modules if not specified
        if not self.config.target_modules:
            self.config.target_modules = ["q_proj", "v_proj"]
            
        # Configure LoRA
        peft_config = LoraConfig(
            r=self.config.lora_r,
            lora_alpha=self.config.lora_alpha,
            target_modules=self.config.target_modules,
            lora_dropout=self.config.lora_dropout,
            bias="none",
            task_type="CAUSAL_LM"
        )
        
        # Apply LoRA adapter
        logger.info("Applying LoRA adapter")
        self.model = get_peft_model(self.model, peft_config)
        
        # Print trainable parameters
        self.model.print_trainable_parameters()
        
        return self.model
    
    def finetune(self, train_data_path, output_dir, batch_size=4, epochs=3, learning_rate=3e-4):
        """Fine-tune the model on Arabic medical data."""
        from transformers import Trainer, TrainingArguments
        
        if self.model is None:
            self.prepare_for_training()
        
        # Create dataset
        dataset = ArabicMedicalDataset(train_data_path, self.tokenizer, max_length=self.config.max_length)
        
        # Setup training arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            per_device_train_batch_size=batch_size,
            num_train_epochs=epochs,
            learning_rate=learning_rate,
            fp16=True,
            logging_dir=f"{output_dir}/logs",
            logging_steps=10,
            save_strategy="epoch",
            optim="adamw_torch"
        )
        
        # Initialize trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=dataset,
            tokenizer=self.tokenizer
        )
        
        # Train
        logger.info("Starting fine-tuning")
        trainer.train()
        
        # Save model
        logger.info(f"Saving model to {output_dir}")
        trainer.save_model(output_dir)
        self.tokenizer.save_pretrained(output_dir)
        
        return self.model
    
    def generate_response(self, question, max_new_tokens=256):
        """Generate a response in Arabic for a medical question."""
        if self.model is None:
            self.load_model()
            
        # Format prompt
        prompt = self.config.arabic_prompt_template.format(instruction=question)
        
        # Tokenize
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        # Generate
        with torch.no_grad():
            outputs = self.model.generate(
                input_ids=inputs["input_ids"],
                attention_mask=inputs["attention_mask"],
                max_new_tokens=max_new_tokens,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=self.tokenizer.pad_token_id
            )
        
        # Decode and return
        response = self.tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        return response.strip()
    
    def process_batch(self, data_dir, output_file):
        """Process a batch of medical queries from files."""
        if self.model is None:
            self.load_model()
        
        results = []
        
        # Get all files
        for filename in os.listdir(data_dir):
            if filename.endswith('.txt'):
                filepath = os.path.join(data_dir, filename)
                
                # Read query
                with open(filepath, 'r', encoding='utf-8') as f:
                    query = f.read().strip()
                
                # Generate response
                response = self.generate_response(query)
                
                # Save result
                results.append({
                    "query": query,
                    "response": response,
                    "source_file": filename
                })
        
        # Write results
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
            
        return results

# Helper function to create sample Arabic medical dataset
def create_sample_dataset(output_path, n_samples=50):
    """Create a sample dataset with Arabic medical Q&A pairs."""
    sample_data = []
    
    # Example medical Q&A in Arabic
    examples = [
        {
            "question": "ما هي أعراض ارتفاع ضغط الدم؟",
            "answer": "أعراض ارتفاع ضغط الدم تشمل: الصداع، خاصة في مؤخرة الرأس، الدوخة، طنين الأذن، اضطرابات الرؤية، التعب، خفقان القلب. لكن في كثير من الحالات قد لا تظهر أعراض واضحة، لذا يسمى أحيانًا بـ'القاتل الصامت'."
        },
        {
            "question": "ما هو علاج السكري من النوع الثاني؟",
            "answer": "علاج السكري من النوع الثاني يشمل: تعديل نمط الحياة (نظام غذائي صحي، ممارسة الرياضة، الحفاظ على وزن صحي)، الأدوية الفموية مثل الميتفورمين، حقن الأنسولين في الحالات المتقدمة، المراقبة المنتظمة لمستوى السكر في الدم، والفحوصات الدورية للكشف عن المضاعفات."
        },
        {
            "question": "كيف أتعامل مع نوبة الربو؟",
            "answer": "للتعامل مع نوبة الربو: استخدم البخاخ الموسع للشعب الهوائية، خذ أنفاسًا بطيئة وعميقة، حافظ على الهدوء، تجنب مسببات الحساسية، اجلس في وضعية مستقيمة، واطلب المساعدة الطبية إذا لم تتحسن الأعراض بسرعة. من المهم مراجعة الطبيب لتعديل خطة العلاج."
        }
    ]
    
    # Generate sample data
    for i in range(n_samples):
        example = examples[i % len(examples)]
        sample_data.append({
            "question": example["question"],
            "answer": example["answer"]
        })
    
    # Write to file
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(sample_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Created sample dataset with {n_samples} examples at {output_path}")
    return sample_data

if __name__ == "__main__":
    # Example usage
    print("MedLLama Arabic module. Import to use in your application.")