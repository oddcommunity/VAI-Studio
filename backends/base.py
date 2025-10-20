"""
Base class for all Speech-to-Text backends.
Provides a unified interface for different STT model families.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional
import time


class STTBackend(ABC):
    """Abstract base class for Speech-to-Text backends."""

    def __init__(self):
        self.name = self.__class__.__name__.replace('Backend', '')

    @abstractmethod
    def transcribe(self, audio_path: str, model_name: str, **kwargs) -> Dict:
        """
        Transcribe audio file to text.

        Args:
            audio_path: Path to audio file
            model_name: Name of model to use
            **kwargs: Additional backend-specific options

        Returns:
            Dictionary with:
                - text (str): Transcribed text
                - processing_time (float): Time taken in seconds
                - segments (list, optional): List of timestamped segments
                - language (str, optional): Detected language
                - model (str): Model name used
                - backend (str): Backend name
        """
        pass

    @abstractmethod
    def list_models(self) -> List[Dict]:
        """
        List available models for this backend.

        Returns:
            List of dictionaries with:
                - name (str): Model name
                - size (str): Model size (e.g., "74MB", "1.5GB")
                - params (str): Parameter count (e.g., "39M", "1.5B")
                - wer (str): Word Error Rate estimate
                - installed (bool): Whether model is currently installed
                - features (list, optional): Supported features
        """
        pass

    @abstractmethod
    def is_model_installed(self, model_name: str) -> bool:
        """Check if a specific model is installed."""
        pass

    def download_model(self, model_name: str, progress_callback=None) -> None:
        """
        Download and install a model.

        Args:
            model_name: Name of model to download
            progress_callback: Optional callback for progress updates
        """
        raise NotImplementedError(
            f"{self.name} backend does not support model downloads. "
            "Models will be downloaded automatically on first use."
        )

    def get_info(self) -> Dict:
        """Get information about this backend."""
        return {
            'name': self.name,
            'models': self.list_models(),
            'description': self.__doc__ or 'No description available'
        }

    def benchmark(self, audio_path: str, model_name: str) -> Dict:
        """
        Run transcription and return detailed benchmark metrics.

        Args:
            audio_path: Path to audio file
            model_name: Name of model to use

        Returns:
            Dictionary with metrics including RTF (Real-Time Factor)
        """
        import os

        # Get audio duration (rough estimate from file size)
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        # Rough estimate: 1MB per minute for typical audio
        estimated_audio_duration = file_size_mb * 60

        # Run transcription
        result = self.transcribe(audio_path, model_name)

        # Calculate Real-Time Factor (RTF)
        # RTF = processing_time / audio_duration
        # RTF < 1 means faster than real-time
        rtf = result['processing_time'] / max(estimated_audio_duration, 1)

        result['benchmark'] = {
            'rtf': round(rtf, 3),
            'estimated_audio_duration': round(estimated_audio_duration, 2),
            'throughput': round(estimated_audio_duration / result['processing_time'], 2)
            if result['processing_time'] > 0 else 0
        }

        return result


class ModelInfo:
    """Helper class to store model information."""

    def __init__(self, name: str, size: str, params: str, wer: str,
                 features: Optional[List[str]] = None):
        self.name = name
        self.size = size
        self.params = params
        self.wer = wer
        self.features = features or []
        self.installed = False

    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'size': self.size,
            'params': self.params,
            'wer': self.wer,
            'features': self.features,
            'installed': self.installed
        }
