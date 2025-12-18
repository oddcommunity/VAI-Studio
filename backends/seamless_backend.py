"""
Seamless backend for Speech-to-Text.
Uses Meta's SeamlessM4T models via HuggingFace transformers.
State-of-the-art multilingual speech recognition supporting 100+ languages.
"""

import time
import os
import sys
from typing import Dict, List
from base import STTBackend, ModelInfo
from progress import report_progress


class SeamlessBackend(STTBackend):
    """Meta Seamless (SeamlessM4T) speech recognition backend - multilingual ASR."""

    MODELS = {
        'seamless-m4t-v2-large': ModelInfo(
            'seamless-m4t-v2-large',
            '~9GB',
            '2.3B',
            '~5%',
            ['transcription', 'translation', 'multilingual', '100+ languages'],
            'Meta'
        ),
        'seamless-m4t-medium': ModelInfo(
            'seamless-m4t-medium',
            '~4GB',
            '1.2B',
            '~7%',
            ['transcription', 'translation', 'multilingual', '100+ languages'],
            'Meta'
        ),
    }

    # Supported languages (subset of 100+)
    SUPPORTED_LANGUAGES = [
        'auto', 'eng', 'spa', 'fra', 'deu', 'ita', 'por', 'pol', 'tur', 'rus',
        'nld', 'ces', 'ara', 'zho', 'jpn', 'kor', 'hin', 'vie', 'tha', 'ind'
    ]

    def __init__(self):
        super().__init__()
        self._processor = None
        self._current_model = None
        self._current_model_name = None

    def _load_transformers(self):
        """Lazy load transformers modules for Seamless."""
        try:
            from transformers import AutoProcessor, SeamlessM4Tv2Model
            import torch
            import torchaudio
            return AutoProcessor, SeamlessM4Tv2Model, torch, torchaudio
        except ImportError as e:
            raise ImportError(
                f"transformers library not found or missing components: {e}. "
                "Install with: pip install transformers torch torchaudio --break-system-packages"
            )

    def _get_model(self, model_name: str):
        """Load or return cached Seamless model using transformers."""
        if self._current_model_name != model_name:
            is_downloading = not self.is_model_installed(model_name)

            if is_downloading:
                report_progress(10, f'Downloading {model_name}...', 'downloading')
            else:
                report_progress(10, f'Loading {model_name} model...', 'loading_model')

            print(f"[INFO] Loading Seamless model: {model_name}...", file=sys.stderr)
            AutoProcessor, SeamlessM4Tv2Model, torch, _ = self._load_transformers()

            # Map model names to HuggingFace model IDs
            model_ids = {
                'seamless-m4t-v2-large': 'facebook/seamless-m4t-v2-large',
                'seamless-m4t-medium': 'facebook/hf-seamless-m4t-medium',
            }
            model_id = model_ids.get(model_name, f'facebook/{model_name}')

            try:
                if is_downloading:
                    report_progress(15, 'Downloading model files from HuggingFace...', 'downloading')

                # Get HuggingFace token for authentication
                token = self._get_hf_token()

                # Load Seamless model using transformers
                self._processor = AutoProcessor.from_pretrained(model_id, token=token)
                self._current_model = SeamlessM4Tv2Model.from_pretrained(
                    model_id,
                    torch_dtype=torch.float32,
                    token=token
                )
                self._current_model_name = model_name

                if is_downloading:
                    report_progress(30, 'Download complete! Model loaded.', 'loaded')
                else:
                    report_progress(30, 'Model loaded successfully', 'loaded')

                print(f"[INFO] Seamless model {model_name} loaded successfully!", file=sys.stderr)
            except Exception as e:
                error_msg = str(e).lower()
                # Check for authentication errors
                if '401' in error_msg or '403' in error_msg or 'authentication' in error_msg or 'unauthorized' in error_msg:
                    print(f"[ERROR] Error loading Seamless model {model_name}: Authentication failed", file=sys.stderr)
                    raise Exception(
                        "HuggingFace authentication required. Please add your HuggingFace token in Settings > Advanced Settings > HuggingFace Authentication. "
                        "Get a free token at https://huggingface.co/settings/tokens"
                    )
                print(f"[ERROR] Error loading Seamless model {model_name}: {e}", file=sys.stderr)
                raise

        return self._current_model, self._processor

    def transcribe(self, audio_path: str, model_name: str = 'seamless-m4t-v2-large', **kwargs) -> Dict:
        """
        Transcribe audio using Seamless.

        Args:
            audio_path: Path to audio file
            model_name: Seamless model to use
            **kwargs: Additional options:
                - language: Target language code (e.g., 'eng', 'spa', 'fra')

        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()
        target_language = kwargs.get('language', 'eng')

        try:
            report_progress(0, 'Starting transcription...', 'initializing')

            # Check if model needs to be downloaded
            if not self.is_model_installed(model_name):
                model_size = self.MODELS.get(model_name, ModelInfo('unknown', '~5GB', '', '', [], '')).size
                report_progress(5, f'Model not installed. Downloading {model_name} ({model_size})...', 'downloading')
                print(f"[DOWNLOAD] Model {model_name} not found in cache. Downloading...", file=sys.stderr)

            # Load transformers model and processor
            model, processor = self._get_model(model_name)

            # Load audio file
            report_progress(35, 'Loading audio file...', 'loading_audio')
            print(f"[INFO] Transcribing with Seamless {model_name}...", file=sys.stderr)

            _, _, torch, torchaudio = self._load_transformers()

            # Load audio with torchaudio
            waveform, sample_rate = torchaudio.load(audio_path)

            # Resample to 16kHz if needed (Seamless expects 16kHz)
            if sample_rate != 16000:
                resampler = torchaudio.transforms.Resample(sample_rate, 16000)
                waveform = resampler(waveform)

            # Convert to mono if stereo
            if waveform.shape[0] > 1:
                waveform = waveform.mean(dim=0, keepdim=True)

            # Process audio with the processor
            report_progress(50, 'Transcribing audio...', 'transcribing')

            # Prepare inputs for speech-to-text
            audio_inputs = processor(
                audios=waveform.squeeze().numpy(),
                sampling_rate=16000,
                return_tensors="pt"
            )

            # Run inference - generate text from speech
            with torch.no_grad():
                output_tokens = model.generate(
                    **audio_inputs,
                    tgt_lang=target_language,
                    generate_speech=False,  # We only want text output
                )

            # Decode the output tokens
            transcription = processor.decode(
                output_tokens[0].tolist()[0],
                skip_special_tokens=True
            )

            processing_time = time.time() - start_time

            report_progress(90, 'Processing results...', 'finalizing')

            return {
                'text': transcription.strip(),
                'processing_time': round(processing_time, 2),
                'language': target_language,
                'model': model_name,
                'backend': 'seamless'
            }

        except Exception as e:
            processing_time = time.time() - start_time
            print(f"[ERROR] Seamless transcription error: {e}", file=sys.stderr)
            return {
                'text': '',
                'processing_time': round(processing_time, 2),
                'error': str(e),
                'model': model_name,
                'backend': 'seamless'
            }

    def list_models(self) -> List[Dict]:
        """List all available Seamless models."""
        models = []
        for model_name, model_info in self.MODELS.items():
            model_dict = model_info.to_dict()
            model_dict['installed'] = self.is_model_installed(model_name)
            model_dict['languages'] = self.SUPPORTED_LANGUAGES
            models.append(model_dict)
        return models

    def is_model_installed(self, model_name: str) -> bool:
        """
        Check if a Seamless model is installed.
        Seamless models are cached by HuggingFace in ~/.cache/huggingface/hub/
        """
        cache_dir = os.path.expanduser('~/.cache/huggingface/hub')
        if not os.path.exists(cache_dir):
            return False

        # Map model names to HuggingFace cache directory names
        cache_names = {
            'seamless-m4t-v2-large': 'models--facebook--seamless-m4t-v2-large',
            'seamless-m4t-medium': 'models--facebook--hf-seamless-m4t-medium',
        }

        model_dir_name = cache_names.get(model_name, f"models--facebook--{model_name}")
        model_path = os.path.join(cache_dir, model_dir_name)

        return os.path.exists(model_path)

    def download_model(self, model_name: str, progress_callback=None) -> None:
        """
        Download a Seamless model.
        Models download automatically from HuggingFace on first use.
        """
        print(f"[INFO] Downloading Seamless model: {model_name}", file=sys.stderr)
        print("[INFO] (Model will download automatically on first transcription)", file=sys.stderr)

        # Pre-load the model to trigger download
        try:
            model, processor = self._get_model(model_name)
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
                'backend': 'seamless'
            }

        # Calculate WER
        hypothesis = result['text'].strip()
        wer = self._calculate_wer(reference_text, hypothesis)

        return {
            'success': True,
            'model': model_name,
            'backend': 'seamless',
            'reference_text': reference_text,
            'hypothesis_text': hypothesis,
            'wer': round(wer, 2),
            'processing_time': result['processing_time'],
            'language': result.get('language', 'eng')
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
    backend = SeamlessBackend()

    print("Available Seamless models:")
    for model in backend.list_models():
        status = "✓" if model['installed'] else "✗"
        print(f"  {status} {model['name']:30} - {model['size']:8} - WER: {model['wer']}")
