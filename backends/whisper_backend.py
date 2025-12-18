"""
Whisper backend for Speech-to-Text.
Uses OpenAI's Whisper model via the openai-whisper package.
"""

import time
import os
import sys
import hashlib
from typing import Dict, List
import soundfile as sf
from base import STTBackend, ModelInfo
from progress import report_progress


def download_with_progress(url: str, dest_path: str, model_name: str, fallback_url: str = None):
    """
    Download a file with live progress reporting.
    This replaces whisper's internal download to give real-time progress.
    Tries primary URL first, falls back to fallback_url if provided.
    """
    import urllib.request

    # Create temp file in same directory for atomic rename
    dest_dir = os.path.dirname(dest_path)
    os.makedirs(dest_dir, exist_ok=True)

    temp_path = dest_path + '.downloading'
    urls_to_try = [url]
    if fallback_url:
        urls_to_try.append(fallback_url)

    last_error = None
    for try_url in urls_to_try:
        try:
            print(f"[INFO] Trying download from: {try_url[:60]}...", file=sys.stderr)

            # Get file size and start download
            request = urllib.request.Request(try_url, headers={'User-Agent': 'VAI-Studio/3.0'})
            with urllib.request.urlopen(request, timeout=30) as response:
                total_size = int(response.headers.get('content-length', 0))

                # Download with progress
                downloaded = 0
                block_size = 64 * 1024  # 64KB blocks for smoother progress
                last_progress = -1

                with open(temp_path, 'wb') as f:
                    while True:
                        block = response.read(block_size)
                        if not block:
                            break
                        f.write(block)
                        downloaded += len(block)

                        # Report progress (scale to 10-25% range for download phase)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            # Map 0-100% download to 10-25% overall progress
                            overall_progress = 10 + (percent * 0.15)
                            int_progress = int(overall_progress)

                            # Only report when progress changes (reduce spam)
                            if int_progress != last_progress:
                                last_progress = int_progress
                                mb_downloaded = downloaded / (1024 * 1024)
                                mb_total = total_size / (1024 * 1024)
                                report_progress(
                                    overall_progress,
                                    f'Downloading {model_name}: {mb_downloaded:.1f}/{mb_total:.1f} MB',
                                    'downloading'
                                )

            # Atomic rename
            os.rename(temp_path, dest_path)
            report_progress(25, f'Download complete! Loading {model_name}...', 'loading')
            return True

        except Exception as e:
            last_error = e
            print(f"[WARN] Download failed from {try_url[:40]}...: {e}", file=sys.stderr)
            # Clean up temp file on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            # Try next URL
            continue

    # All URLs failed
    raise last_error if last_error else Exception("Download failed")


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

    # Model filename mapping
    MODEL_FILES = {
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

    def __init__(self):
        super().__init__()
        self._whisper = None
        self._current_model = None
        self._current_model_name = None
        self._url_patched = False

    def _get_bundled_model_path(self, model_name: str) -> str:
        """Get path to bundled model if it exists."""
        resources_path = os.environ.get('VAI_RESOURCES_PATH', '')
        if not resources_path:
            return None
        model_file = self.MODEL_FILES.get(model_name)
        if not model_file:
            return None
        bundled_path = os.path.join(resources_path, 'models', 'whisper', model_file)
        if os.path.exists(bundled_path):
            print(f"[INFO] Found bundled model: {bundled_path}", file=sys.stderr)
            return bundled_path
        return None

    def _load_whisper(self):
        """Lazy load whisper module."""
        if self._whisper is None:
            import whisper
            self._whisper = whisper
            self._patch_whisper_urls_if_needed()
        return self._whisper

    def _patch_whisper_urls_if_needed(self):
        """
        No longer pre-tests CDN - we handle fallback during actual download.
        This method is kept for compatibility but doesn't modify URLs.
        """
        if self._url_patched:
            return
        self._url_patched = True
        print("[INFO] Whisper backend initialized (CDN with blob fallback)", file=sys.stderr)

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

                # Check for bundled model first
                bundled_path = self._get_bundled_model_path(model_name)
                if bundled_path:
                    # Load from bundled path - no download needed
                    report_progress(26, f'Loading bundled {model_name} model...', 'loading')
                    print(f"[INFO] Loading from bundled path: {bundled_path}", file=sys.stderr)
                    self._current_model = whisper.load_model(bundled_path)
                elif not self.is_model_installed(model_name):
                    # Download with live progress reporting
                    self._download_model_with_progress(model_name)
                    # Now load the model (will use cached file)
                    report_progress(26, f'Loading {model_name} model...', 'loading')
                    self._current_model = whisper.load_model(model_name)
                else:
                    # Load from cache
                    report_progress(26, f'Loading {model_name} model...', 'loading')
                    self._current_model = whisper.load_model(model_name)
            self._current_model_name = model_name
        return self._current_model

    def _download_model_with_progress(self, model_name: str):
        """Download a Whisper model with live progress reporting."""
        whisper = self._load_whisper()

        # Get the download URL from whisper's model registry
        if not hasattr(whisper, '_MODELS') or model_name not in whisper._MODELS:
            print(f"[WARN] Model {model_name} not in whisper._MODELS, falling back to default download", file=sys.stderr)
            return

        cdn_url = whisper._MODELS[model_name]
        # Create blob storage fallback URL
        blob_url = cdn_url.replace('openaipublic.azureedge.net', 'openaipublic.blob.core.windows.net')

        # Determine cache path
        cache_dir = os.path.expanduser('~/.cache/whisper')
        os.makedirs(cache_dir, exist_ok=True)

        # Use class constant for model file naming
        model_file = self.MODEL_FILES.get(model_name, f'{model_name}.pt')
        dest_path = os.path.join(cache_dir, model_file)

        print(f"[INFO] Downloading {model_name} (CDN with blob fallback)...", file=sys.stderr)

        # Use our custom download function with progress - tries CDN first, then blob
        download_with_progress(cdn_url, dest_path, model_name, fallback_url=blob_url)

        print(f"[INFO] Download complete: {dest_path}", file=sys.stderr)

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

            # Check if model needs to be downloaded
            is_downloading = not self.is_model_installed(model_name)
            if is_downloading:
                model_info = self.MODELS.get(model_name)
                model_size = model_info.size if model_info else '~1GB'
                report_progress(5, f'Downloading {model_name} ({model_size})...', 'downloading')
            else:
                report_progress(10, f'Loading {model_name} model...', 'loading_model')

            # _get_model handles download with progress if needed
            model = self._get_model(model_name)

            if is_downloading:
                report_progress(28, 'Model loaded!', 'loaded')

            # Audio is already converted to WAV (16kHz mono) by Electron (via ffmpeg-static)
            # Load audio with soundfile (no ffmpeg needed!)
            report_progress(30, 'Loading audio file...', 'loading_audio')
            print(f"[INFO] Loading audio file with soundfile: {audio_path}", file=sys.stderr)

            # Read WAV file directly with soundfile
            # Returns: (audio_data, sample_rate) where audio_data is float32 numpy array
            audio_data, sample_rate = sf.read(audio_path, dtype='float32')
            print(f"[INFO] Audio loaded: {len(audio_data)} samples at {sample_rate}Hz", file=sys.stderr)

            # Transcribe using numpy array (bypasses whisper's ffmpeg call!)
            report_progress(50, 'Transcribing audio...', 'transcribing')
            print(f"[INFO] Transcribing with Whisper {model_name} (numpy array input)...", file=sys.stderr)

            # Handle quantized model (transformers pipeline) vs native Whisper
            if model_name == 'large-v3-quantized-w4a16':
                # Transformers pipeline accepts numpy array directly
                result = model(audio_data, return_timestamps=True)
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
                # Native Whisper model accepts numpy array directly
                # This bypasses whisper's load_audio() which calls ffmpeg!
                result = model.transcribe(audio_data, **kwargs)
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
        Checks in order: bundled models, ~/.cache/whisper/, ~/.cache/huggingface/hub/
        """
        # Check for bundled model first
        bundled_path = self._get_bundled_model_path(model_name)
        if bundled_path:
            return True

        # Check for RedHat quantized model in HuggingFace cache
        if model_name == 'large-v3-quantized-w4a16':
            hf_cache_dir = os.path.expanduser('~/.cache/huggingface/hub')
            if not os.path.exists(hf_cache_dir):
                return False
            # HuggingFace format: models--RedHatAI--whisper-large-v3-quantized.w4a16
            model_dir_name = "models--RedHatAI--whisper-large-v3-quantized.w4a16"
            model_path = os.path.join(hf_cache_dir, model_dir_name)
            return os.path.exists(model_path)

        # Check for native Whisper models in cache
        cache_dir = os.path.expanduser('~/.cache/whisper')
        if not os.path.exists(cache_dir):
            return False

        model_file = self.MODEL_FILES.get(model_name, f'{model_name}.pt')
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
