"""
Whisper backend for Speech-to-Text.
Uses OpenAI's Whisper model via the openai-whisper package.
"""

import time
import os
import sys
from typing import Dict, List
from base import STTBackend, ModelInfo
from progress import report_progress


class WhisperBackend(STTBackend):
    """OpenAI Whisper speech recognition backend."""

    MODELS = {
        'tiny': ModelInfo('tiny', '39MB', '39M', '~15%', ['transcription', 'translation'], 'OpenAI'),
        'tiny.en': ModelInfo('tiny.en', '39MB', '39M', '~15%', ['transcription'], 'OpenAI'),
        'base': ModelInfo('base', '74MB', '74M', '~10%', ['transcription', 'translation'], 'OpenAI'),
        'base.en': ModelInfo('base.en', '74MB', '74M', '~10%', ['transcription'], 'OpenAI'),
        'small': ModelInfo('small', '244MB', '244M', '~8%', ['transcription', 'translation'], 'OpenAI'),
        'small.en': ModelInfo('small.en', '244MB', '244M', '~8%', ['transcription'], 'OpenAI'),
        'medium': ModelInfo('medium', '769MB', '769M', '~6%', ['transcription', 'translation'], 'OpenAI'),
        'medium.en': ModelInfo('medium.en', '769MB', '769M', '~6%', ['transcription'], 'OpenAI'),
        'large': ModelInfo('large', '1.5GB', '1.5B', '~5%', ['transcription', 'translation'], 'OpenAI'),
        'large-v1': ModelInfo('large-v1', '1.5GB', '1.5B', '~5%', ['transcription', 'translation'], 'OpenAI'),
        'large-v2': ModelInfo('large-v2', '1.5GB', '1.5B', '~5%', ['transcription', 'translation'], 'OpenAI'),
        'large-v3': ModelInfo('large-v3', '1.5GB', '1.5B', '5-8%', ['transcription', 'translation'], 'OpenAI'),
        'large-v3-quantized-w4a16': ModelInfo('large-v3-quantized-w4a16', '~400MB', '1.5B', '5-8%', ['transcription', 'translation', 'quantized'], 'RedHat AI'),
        'turbo': ModelInfo('turbo', '809MB', '809M', '10-12%', ['transcription', 'translation'], 'OpenAI'),
    }

    def __init__(self):
        super().__init__()
        self._whisper = None
        self._current_model = None
        self._current_model_name = None
        self._url_patched = False

    def _load_whisper(self):
        """Lazy load whisper module."""
        if self._whisper is None:
            import whisper
            self._whisper = whisper
            self._patch_whisper_urls_if_needed()
        return self._whisper

    def _patch_whisper_urls_if_needed(self):
        """
        Replace CDN URLs with direct blob storage URLs if CDN is unreachable.
        This fixes DNS issues when accessing openaipublic.azureedge.net.
        Fallback: openaipublic.blob.core.windows.net (slower but more reliable)
        """
        if self._url_patched:
            return

        self._url_patched = True

        # Test if CDN is reachable
        cdn_reachable = True
        try:
            import urllib.request
            urllib.request.urlopen('https://openaipublic.azureedge.net/', timeout=5)
        except Exception as e:
            print(f"[INFO] Azure CDN unreachable ({e}), using fallback blob storage URLs", file=sys.stderr)
            cdn_reachable = False

        # If CDN works, no need to patch
        if cdn_reachable:
            print("[INFO] Using primary Azure CDN for Whisper downloads", file=sys.stderr)
            return

        # Patch all model URLs to use blob storage instead of CDN
        if hasattr(self._whisper, '_MODELS'):
            for model_name in list(self._whisper._MODELS.keys()):
                original_url = self._whisper._MODELS[model_name]
                fallback_url = original_url.replace(
                    'openaipublic.azureedge.net',
                    'openaipublic.blob.core.windows.net'
                )
                self._whisper._MODELS[model_name] = fallback_url
            print("[INFO] Whisper URLs patched to use blob storage fallback", file=sys.stderr)

    def _get_model(self, model_name: str):
        """Load or return cached model."""
        if self._current_model_name != model_name:
            # Check if this is the RedHat quantized model
            if model_name == 'large-v3-quantized-w4a16':
                print(f"[INFO] Loading RedHat quantized Whisper model: {model_name}...", file=sys.stderr)

                # Check if model needs to be downloaded
                is_downloading = not self.is_model_installed(model_name)
                if is_downloading:
                    report_progress(15, f'Downloading quantized model {model_name}...', 'downloading')

                try:
                    from transformers import pipeline

                    # Get HuggingFace token for authentication
                    token = self._get_hf_token()

                    self._current_model = pipeline(
                        "automatic-speech-recognition",
                        model="RedHatAI/whisper-large-v3-quantized.w4a16",
                        device=-1,  # CPU by default
                        token=token
                    )

                    if is_downloading:
                        report_progress(30, 'Download complete! Model loaded.', 'loaded')

                except ImportError as e:
                    # Re-raise with original error message to help with debugging
                    raise ImportError(f"Failed to load quantized model: {str(e)}")
                except Exception as e:
                    error_msg = str(e).lower()
                    # Check for authentication errors
                    if '401' in error_msg or '403' in error_msg or 'authentication' in error_msg or 'unauthorized' in error_msg:
                        print(f"Error loading quantized Whisper model {model_name}: Authentication failed")
                        raise Exception(
                            "HuggingFace authentication required. Please add your HuggingFace token in Settings > Advanced Settings > HuggingFace Authentication. "
                            "Get a free token at https://huggingface.co/settings/tokens"
                        )
                    raise
            else:
                whisper = self._load_whisper()
                print(f"[INFO] Loading Whisper model: {model_name}...", file=sys.stderr)
                self._current_model = whisper.load_model(model_name)
            self._current_model_name = model_name
        return self._current_model

    def transcribe(self, audio_path: str, model_name: str = 'base', **kwargs) -> Dict:
        """
        Transcribe audio using Whisper.

        Args:
            audio_path: Path to audio file
            model_name: Whisper model to use (tiny, base, small, medium, large, large-v3, turbo)
            **kwargs: Additional Whisper options (language, task, etc.)

        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()

        try:
            # Report initial progress
            report_progress(0, 'Starting transcription...', 'initializing')

            # Check if model needs to be downloaded (works for ALL models)
            if not self.is_model_installed(model_name):
                model_info = self.MODELS.get(model_name)
                model_size = model_info.size if model_info else '~1GB'
                report_progress(5, f'Model not installed. Downloading {model_name} ({model_size})...', 'downloading')
                print(f"[DOWNLOAD] Model {model_name} not found in cache. Downloading...", file=sys.stderr)

            # Load model
            is_downloading = not self.is_model_installed(model_name)
            if is_downloading:
                report_progress(10, f'Downloading {model_name}...', 'downloading')
            else:
                report_progress(10, f'Loading {model_name} model...', 'loading_model')

            model = self._get_model(model_name)

            if is_downloading:
                report_progress(28, 'Download complete! Model loaded.', 'loaded')

            # Load and convert audio to WAV if needed (M4A not always supported)
            import librosa
            import soundfile as sf
            import tempfile

            report_progress(30, 'Loading audio file...', 'loading_audio')
            print(f"[INFO] Loading audio file: {audio_path}", file=sys.stderr)
            # Load audio with librosa (supports M4A via audioread/ffmpeg)
            audio_data, sample_rate = librosa.load(audio_path, sr=16000, mono=True)

            # Save to temporary WAV file for Whisper
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                temp_wav_path = tmp_file.name
                sf.write(temp_wav_path, audio_data, sample_rate)

            try:
                # Transcribe
                report_progress(50, 'Transcribing audio...', 'transcribing')
                print(f"[INFO] Transcribing with Whisper {model_name}...", file=sys.stderr)

                # Handle quantized model (transformers pipeline) vs native Whisper
                if model_name == 'large-v3-quantized-w4a16':
                    # Transformers pipeline call - enable timestamps for long audio files
                    result = model(temp_wav_path, return_timestamps=True)
                    report_progress(90, 'Processing results...', 'finalizing')
                    processing_time = time.time() - start_time

                    # Extract text and segments from result
                    text = result['text'].strip() if isinstance(result, dict) else str(result).strip()
                    segments = result.get('chunks', []) if isinstance(result, dict) else []

                    return {
                        'text': text,
                        'processing_time': round(processing_time, 2),
                        'segments': segments,
                        'language': 'auto',
                        'model': model_name,
                        'backend': 'whisper'
                    }
                else:
                    # Native Whisper model call
                    result = model.transcribe(temp_wav_path, **kwargs)
                    report_progress(90, 'Processing results...', 'finalizing')
                    processing_time = time.time() - start_time

                    return {
                        'text': result['text'].strip(),
                        'processing_time': round(processing_time, 2),
                        'segments': result.get('segments', []),
                        'language': result.get('language', 'unknown'),
                        'model': model_name,
                        'backend': 'whisper'
                    }
            finally:
                # Clean up temporary file
                if os.path.exists(temp_wav_path):
                    os.unlink(temp_wav_path)

        except Exception as e:
            processing_time = time.time() - start_time
            return {
                'text': '',
                'processing_time': round(processing_time, 2),
                'error': str(e),
                'model': model_name,
                'backend': 'whisper'
            }

    def list_models(self) -> List[Dict]:
        """List all available Whisper models."""
        models = []
        for model_name, model_info in self.MODELS.items():
            model_dict = model_info.to_dict()
            model_dict['installed'] = self.is_model_installed(model_name)
            models.append(model_dict)
        return models

    def is_model_installed(self, model_name: str) -> bool:
        """
        Check if a Whisper model is installed.
        Whisper models are stored in ~/.cache/whisper/
        HuggingFace models (quantized) are stored in ~/.cache/huggingface/hub/
        """
        # Check for RedHat quantized model in HuggingFace cache
        if model_name == 'large-v3-quantized-w4a16':
            hf_cache_dir = os.path.expanduser('~/.cache/huggingface/hub')
            if not os.path.exists(hf_cache_dir):
                return False
            # HuggingFace format: models--RedHatAI--whisper-large-v3-quantized.w4a16
            model_dir_name = "models--RedHatAI--whisper-large-v3-quantized.w4a16"
            model_path = os.path.join(hf_cache_dir, model_dir_name)
            return os.path.exists(model_path)

        # Check for native Whisper models
        cache_dir = os.path.expanduser('~/.cache/whisper')
        if not os.path.exists(cache_dir):
            return False

        # Check for model file
        model_files = {
            'tiny': 'tiny.pt',
            'tiny.en': 'tiny.en.pt',
            'base': 'base.pt',
            'base.en': 'base.en.pt',
            'small': 'small.pt',
            'small.en': 'small.en.pt',
            'medium': 'medium.pt',
            'medium.en': 'medium.en.pt',
            'large': 'large.pt',
            'large-v1': 'large-v1.pt',
            'large-v2': 'large-v2.pt',
            'large-v3': 'large-v3.pt',
            'turbo': 'large-v3-turbo.pt',
        }

        model_file = model_files.get(model_name, f'{model_name}.pt')
        model_path = os.path.join(cache_dir, model_file)

        return os.path.exists(model_path)

    def download_model(self, model_name: str, progress_callback=None) -> None:
        """
        Download a Whisper model.
        Actually, Whisper downloads automatically on first use, so we just trigger a load.
        """
        print(f"[INFO] Downloading Whisper model: {model_name}", file=sys.stderr)
        print("[INFO] (Whisper will download automatically on first transcription)", file=sys.stderr)

        # Pre-load the model to trigger download
        try:
            model = self._get_model(model_name)
            print(f"[INFO] Model {model_name} is ready!", file=sys.stderr)
        except Exception as e:
            print(f"[ERROR] Error downloading model: {e}", file=sys.stderr)
            raise

    def benchmark(self, audio_path: str, model_name: str, reference_text: str) -> Dict:
        """
        Benchmark a model by comparing transcription to reference text.
        Calculates Word Error Rate (WER).

        Args:
            audio_path: Path to audio file
            model_name: Model to benchmark
            reference_text: Ground truth text

        Returns:
            Dictionary with benchmark results including WER
        """
        # Run transcription
        result = self.transcribe(audio_path, model_name)

        if 'error' in result:
            return {
                'success': False,
                'error': result['error'],
                'model': model_name,
                'backend': 'whisper'
            }

        # Calculate WER
        hypothesis = result['text'].strip()
        wer = self._calculate_wer(reference_text, hypothesis)

        return {
            'success': True,
            'model': model_name,
            'backend': 'whisper',
            'reference_text': reference_text,
            'hypothesis_text': hypothesis,
            'wer': round(wer, 2),
            'processing_time': result['processing_time'],
            'language': result.get('language', 'unknown')
        }

    def _calculate_wer(self, reference: str, hypothesis: str) -> float:
        """
        Calculate Word Error Rate (WER) between reference and hypothesis.
        WER = (S + D + I) / N
        where S = substitutions, D = deletions, I = insertions, N = words in reference

        Args:
            reference: Ground truth text
            hypothesis: Transcribed text

        Returns:
            WER as percentage (0-100)
        """
        # Normalize texts
        ref_words = reference.lower().split()
        hyp_words = hypothesis.lower().split()

        # Calculate edit distance using dynamic programming
        r_len = len(ref_words)
        h_len = len(hyp_words)

        # Create DP table
        dp = [[0 for _ in range(h_len + 1)] for _ in range(r_len + 1)]

        # Initialize first row and column
        for i in range(r_len + 1):
            dp[i][0] = i
        for j in range(h_len + 1):
            dp[0][j] = j

        # Fill DP table
        for i in range(1, r_len + 1):
            for j in range(1, h_len + 1):
                if ref_words[i-1] == hyp_words[j-1]:
                    dp[i][j] = dp[i-1][j-1]
                else:
                    substitution = dp[i-1][j-1] + 1
                    insertion = dp[i][j-1] + 1
                    deletion = dp[i-1][j] + 1
                    dp[i][j] = min(substitution, insertion, deletion)

        # Calculate WER
        edit_distance = dp[r_len][h_len]
        if r_len == 0:
            return 100.0 if h_len > 0 else 0.0

        wer = (edit_distance / r_len) * 100
        return wer


if __name__ == '__main__':
    # Test the backend
    backend = WhisperBackend()

    print("Available Whisper models:")
    for model in backend.list_models():
        status = "✓" if model['installed'] else "✗"
        print(f"  {status} {model['name']:15} - {model['size']:8} - WER: {model['wer']}")
