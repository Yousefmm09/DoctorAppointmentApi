"""
MedLLama Arabic - Medical Large Language Model with Arabic support
================================================================

This package provides integration for MedLLama with Arabic language support
for medical question answering and dialogue in Arabic.
"""

__version__ = '0.1.0'

from .medllama_arabic import MedLLamaArabic, MedLLamaConfig, ArabicMedicalDataset
from .data_collection import ArabicMedicalDataCollector

# Easy access to main components
__all__ = [
    'MedLLamaArabic',
    'MedLLamaConfig',
    'ArabicMedicalDataset',
    'ArabicMedicalDataCollector',
]
