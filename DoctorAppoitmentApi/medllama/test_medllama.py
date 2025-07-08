#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test script to verify MedLLama Arabic integration is working correctly.
Run this script to test both direct model usage and the API.
"""

import os
import sys
import json
import logging
import argparse
import time
import requests
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sample Arabic medical questions
SAMPLE_QUESTIONS = [
    "ما هي أعراض ارتفاع ضغط الدم؟",
    "كيف أعرف إذا كنت مصاب بالسكري؟",
    "ما هو العلاج المناسب للصداع النصفي؟",
    "هل هناك تمارين تساعد في تخفيف آلام الظهر؟",
    "متى يجب زيارة الطبيب إذا كان لدي كحة مستمرة؟"
]

def test_direct_model():
    """Test direct model usage without API."""
    try:
        from medllama_arabic import MedLLamaArabic, MedLLamaConfig
        
        logger.info("Testing direct model usage...")
        
        # Create a config with smaller model for testing
        config = MedLLamaConfig(
            base_model="meta-llama/Llama-2-7b-chat-hf",  # Can be changed to any available model
            use_4bit=True
        )
        
        # Initialize and load model
        model = MedLLamaArabic(config)
        model.load_model()
        
        # Test with sample questions
        for i, question in enumerate(SAMPLE_QUESTIONS[:2]):  # Test with first 2 questions only
            logger.info(f"Question {i+1}: {question}")
            
            start_time = time.time()
            response = model.generate_response(question)
            elapsed_time = time.time() - start_time
            
            logger.info(f"Response: {response}")
            logger.info(f"Generation time: {elapsed_time:.2f} seconds")
            logger.info("-" * 50)
        
        logger.info("Direct model test completed successfully!")
        return True
    except Exception as e:
        logger.error(f"Error testing direct model: {str(e)}")
        logger.exception(e)
        return False

def test_api(api_url="http://localhost:5001"):
    """Test the MedLLama API."""
    logger.info(f"Testing MedLLama API at {api_url}...")
    
    # Test health endpoint
    try:
        logger.info("Testing health endpoint...")
        response = requests.get(f"{api_url}/health", timeout=5)
        if response.status_code == 200:
            logger.info(f"Health check response: {response.json()}")
        else:
            logger.error(f"Health check failed with status code {response.status_code}")
            return False
    except requests.RequestException as e:
        logger.error(f"Error connecting to API: {str(e)}")
        logger.info("Is the API server running? Try starting it with 'python api.py'")
        return False
    
    # Test generation endpoint with sample questions
    for i, question in enumerate(SAMPLE_QUESTIONS[:3]):  # Test with first 3 questions
        try:
            logger.info(f"Testing generate endpoint with question {i+1}: {question}")
            
            start_time = time.time()
            response = requests.post(
                f"{api_url}/generate",
                json={"question": question},
                timeout=30
            )
            elapsed_time = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Response: {result.get('response')}")
                logger.info(f"Generation time: {elapsed_time:.2f} seconds")
            else:
                logger.error(f"Generate endpoint failed with status code {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
        except requests.RequestException as e:
            logger.error(f"Error calling generate endpoint: {str(e)}")
            return False
        
        logger.info("-" * 50)
    
    logger.info("API test completed successfully!")
    return True

def test_integration():
    """Test the integration with the main chatbot app."""
    logger.info("Testing integration with main chatbot app...")
    
    app_url = "http://localhost:5000"  # Default port for the main app
    
    try:
        # Test the chat endpoint
        for i, question in enumerate(SAMPLE_QUESTIONS[:2]):
            logger.info(f"Testing chatbot integration with question {i+1}: {question}")
            
            response = requests.post(
                f"{app_url}/chat",
                json={
                    "message": question,
                    "userId": f"test_user_{i}",
                    "includeSuggestions": True
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Response: {result.get('response')}")
                logger.info(f"Source: {result.get('source')}")
                
                # Check if MedLLama was used
                if result.get('source') == 'medllama':
                    logger.info("MedLLama integration successful!")
                else:
                    logger.warning(f"Response came from {result.get('source')}, not MedLLama")
            else:
                logger.error(f"Chat endpoint failed with status code {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
            
            logger.info("-" * 50)
        
        logger.info("Integration test completed!")
        return True
    except requests.RequestException as e:
        logger.error(f"Error testing integration: {str(e)}")
        logger.info("Is the main app running? Try starting it with 'python app.py'")
        return False

def parse_args():
    parser = argparse.ArgumentParser(description="Test MedLLama Arabic integration")
    parser.add_argument("--api-only", action="store_true", help="Test only the API, not the direct model")
    parser.add_argument("--model-only", action="store_true", help="Test only the direct model, not the API")
    parser.add_argument("--integration", action="store_true", help="Test integration with main chatbot")
    parser.add_argument("--api-url", default="http://localhost:5001", help="MedLLama API URL")
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()
    
    # If no specific test is requested, run all tests
    run_api_test = not args.model_only
    run_model_test = not args.api_only
    run_integration_test = args.integration
    
    if args.model_only and args.api_only:
        logger.error("Cannot specify both --api-only and --model-only")
        sys.exit(1)
    
    # Show configuration
    logger.info("MedLLama Arabic Test")
    logger.info("=====================")
    logger.info(f"Running direct model test: {run_model_test}")
    logger.info(f"Running API test: {run_api_test}")
    logger.info(f"Running integration test: {run_integration_test}")
    logger.info(f"API URL: {args.api_url}")
    logger.info("=====================")
    
    # Run tests
    success = True
    
    if run_model_test:
        logger.info("\n=== Testing Direct Model Usage ===\n")
        model_success = test_direct_model()
        success = success and model_success
    
    if run_api_test:
        logger.info("\n=== Testing MedLLama API ===\n")
        api_success = test_api(args.api_url)
        success = success and api_success
    
    if run_integration_test:
        logger.info("\n=== Testing Integration with Main App ===\n")
        integration_success = test_integration()
        success = success and integration_success
    
    # Summary
    logger.info("\n=== Test Summary ===\n")
    if success:
        logger.info("All tests passed successfully!")
        sys.exit(0)
    else:
        logger.error("Some tests failed. Check logs for details.")
        sys.exit(1)
