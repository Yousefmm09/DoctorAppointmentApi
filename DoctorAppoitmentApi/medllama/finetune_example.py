#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Example script for fine-tuning MedLLama on Arabic medical data.
This demonstrates the complete workflow from data preparation to model fine-tuning.
"""

import os
import logging
import argparse
from datetime import datetime
from medllama_arabic import MedLLamaArabic, MedLLamaConfig
from data_collection import ArabicMedicalDataCollector, main as create_data

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'finetune_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Fine-tune MedLLama on Arabic medical data")
    
    parser.add_argument(
        "--data_dir", 
        type=str, 
        default="./data",
        help="Directory to store training data"
    )
    
    parser.add_argument(
        "--output_dir", 
        type=str, 
        default="./finetuned_model",
        help="Directory to save the fine-tuned model"
    )
    
    parser.add_argument(
        "--base_model", 
        type=str, 
        default="meta-llama/Llama-2-7b-chat-hf",
        help="Base model to use for fine-tuning"
    )
    
    parser.add_argument(
        "--num_samples", 
        type=int, 
        default=200,
        help="Number of synthetic samples to generate for training"
    )
    
    parser.add_argument(
        "--batch_size", 
        type=int, 
        default=4,
        help="Batch size for training"
    )
    
    parser.add_argument(
        "--epochs", 
        type=int, 
        default=3,
        help="Number of training epochs"
    )
    
    parser.add_argument(
        "--learning_rate", 
        type=float, 
        default=3e-4,
        help="Learning rate for training"
    )
    
    parser.add_argument(
        "--use_4bit", 
        action="store_true",
        help="Whether to use 4-bit quantization"
    )
    
    parser.add_argument(
        "--skip_data_generation", 
        action="store_true",
        help="Skip data generation step (use existing data)"
    )
    
    return parser.parse_args()

def prepare_training_data(data_dir, num_samples, skip_data_generation=False):
    """Prepare training data for fine-tuning."""
    os.makedirs(data_dir, exist_ok=True)
    train_path = os.path.join(data_dir, "medical_train.json")
    test_path = os.path.join(data_dir, "medical_test.json")
    
    if skip_data_generation and os.path.exists(train_path) and os.path.exists(test_path):
        logger.info(f"Using existing training data found at {train_path} and {test_path}")
        return train_path, test_path
    
    logger.info(f"Generating {num_samples} samples of Arabic medical training data")
    collector = ArabicMedicalDataCollector(data_dir)
    data = collector.generate_synthetic_data(num_samples)
    
    # Add some existing project data if available
    try:
        project_data = collector.process_project_database()
        if project_data:
            logger.info(f"Added {len(project_data)} samples from project database")
            data.extend(project_data)
    except Exception as e:
        logger.warning(f"Could not process project database: {str(e)}")
    
    train_path, test_path = collector.create_train_test_split(data)
    logger.info(f"Training data saved to {train_path}")
    logger.info(f"Testing data saved to {test_path}")
    
    return train_path, test_path

def finetune_model(args, train_data_path):
    """Fine-tune the MedLLama model on Arabic medical data."""
    logger.info(f"Fine-tuning model {args.base_model} on {train_data_path}")
    
    # Configure model
    config = MedLLamaConfig(
        base_model=args.base_model,
        use_4bit=args.use_4bit
    )
    
    # Initialize model
    model = MedLLamaArabic(config)
    
    # Prepare for training with LoRA
    model.prepare_for_training()
    
    # Start fine-tuning
    logger.info(f"Starting fine-tuning with batch_size={args.batch_size}, epochs={args.epochs}")
    output_dir = os.path.join(args.output_dir, f"medllama_arabic_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    os.makedirs(output_dir, exist_ok=True)
    
    model.finetune(
        train_data_path=train_data_path,
        output_dir=output_dir,
        batch_size=args.batch_size,
        epochs=args.epochs,
        learning_rate=args.learning_rate
    )
    
    logger.info(f"Fine-tuning completed. Model saved to {output_dir}")
    return output_dir

def test_finetuned_model(model_path, test_data_path):
    """Test the fine-tuned model on the test dataset."""
    import json
    import random
    
    logger.info(f"Testing fine-tuned model from {model_path} on {test_data_path}")
    
    # Load test data
    with open(test_data_path, 'r', encoding='utf-8') as f:
        test_data = json.load(f)
    
    # Sample a few test examples
    test_samples = random.sample(test_data, min(5, len(test_data)))
    
    # Initialize model with fine-tuned weights
    config = MedLLamaConfig(base_model=model_path)
    model = MedLLamaArabic(config)
    model.load_model()
    
    # Test on samples
    results = []
    for i, sample in enumerate(test_samples):
        question = sample["question"]
        logger.info(f"Test {i+1}: {question}")
        
        # Generate response
        response = model.generate_response(question)
        
        results.append({
            "question": question,
            "expected": sample["answer"],
            "generated": response
        })
        
        logger.info(f"Expected: {sample['answer']}")
        logger.info(f"Generated: {response}")
        logger.info("-" * 40)
    
    # Save results
    results_path = os.path.join(os.path.dirname(model_path), "test_results.json")
    with open(results_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        
    logger.info(f"Test results saved to {results_path}")
    return results

def main():
    """Main function to run the fine-tuning workflow."""
    args = parse_args()
    
    # Step 1: Prepare training data
    train_data_path, test_data_path = prepare_training_data(
        args.data_dir, 
        args.num_samples, 
        args.skip_data_generation
    )
    
    # Step 2: Fine-tune model
    finetuned_model_path = finetune_model(args, train_data_path)
    
    # Step 3: Test fine-tuned model
    test_finetuned_model(finetuned_model_path, test_data_path)
    
    logger.info("Fine-tuning workflow completed successfully.")

if __name__ == "__main__":
    main()
