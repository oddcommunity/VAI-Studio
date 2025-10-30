"""
Canary backend for Speech-to-Text.
Uses NVIDIA Canary Qwen models - hybrid SALM architecture (Speech-Augmented Language Model).
Highest accuracy with built-in speaker diarization and punctuation.

Note: Canary models are best used with NVIDIA NeMo toolkit for full feature support.
This implementation uses HuggingFace transformers as a simplified alternative.
For production use with diarization, consider installing: pip install nemo_toolkit[asr]
"""

import time
import os
from typing import Dict, List
from base import STTBackend, ModelInfo


class CanaryBackend(STTBackend):
    """NVIDIA Canary speech recognition backend - highest accuracy with diarization."""

    MODELS = {
        'canary-qwen-2.5b': ModelInfo(
            'canary-qwen-2.5b',
            '~5GB',
            '2.5B',
            '5.63%',
            ['transcription', 'diarization', 'punctuation', 'multilingual', 'code-switching'],
            'NVIDIA'
        ),
        'canary-1b': ModelInfo(
            'canary-1b',
            '~2GB',
            '1B',
            '~6%',
            ['transcription', 'diarization', 'multilingual'],
            'NVIDIA'
        ),
    }

    def __init__(self):
        super().__init__()
        self._pipeline = None
        self._current_model = None
        self._current_model_name = None
        self._nemo_available = self._check_nemo_available()

    def _check_nemo_available(self) -> bool:
        """Check if NeMo toolkit is available."""
        try:
            import nemo.collections.asr as nemo_asr
            return True
        except ImportError:
            return False

    def _load_transformers(self):
        """Lazy load transformers module."""
        try:
            from transformers import pipeline
            return pipeline
        except ImportError:
            raise ImportError(
                "transformers library not found. Install with: "
                "pip install transformers --break-system-packages"
            )

    def _load_nemo(self):
        """Lazy load NeMo module."""
        try:
            import nemo.collections.asr as nemo_asr
            return nemo_asr
        except ImportError:
            raise ImportError(
                "NeMo toolkit not found. For full Canary features (diarization), install with: "
                "pip install nemo_toolkit[asr] --break-system-packages"
            )

    def _get_pipeline_transformers(self, model_name: str):
        """Load model using HuggingFace transformers (simplified)."""
        if self._current_model_name != model_name:
            print(f"Loading Canary model via transformers: {model_name}...")
            pipeline_fn = self._load_transformers()

            model_id = f"nvidia/{model_name}"

            try:
                self._current_model = pipeline_fn(
                    "automatic-speech-recognition",
                    model=model_id,
                    device=-1  # CPU by default, use 0 for CUDA
                )
                self._current_model_name = model_name
                print(f"Canary model {model_name} loaded successfully via transformers!")
                print("Note: Using simplified mode. Install NeMo for full diarization features.")
            except Exception as e:
                print(f"Error loading Canary model {model_name} via transformers: {e}")
                print("Tip: Try installing NeMo toolkit for better compatibility")
                raise

        return self._current_model

    def _get_pipeline_nemo(self, model_name: str):
        """Load model using NVIDIA NeMo (full features)."""
        if self._current_model_name != model_name:
            print(f"Loading Canary model via NeMo: {model_name}...")
            nemo_asr = self._load_nemo()

            model_id = f"nvidia/{model_name}"

            try:
                self._current_model = nemo_asr.models.ASRModel.from_pretrained(model_id)
                self._current_model_name = model_name
                print(f"Canary model {model_name} loaded successfully via NeMo!")
                print("Full diarization and punctuation features available.")
            except Exception as e:
                print(f"Error loading Canary model {model_name} via NeMo: {e}")
                raise

        return self._current_model

    def transcribe(self, audio_path: str, model_name: str = 'canary-qwen-2.5b', **kwargs) -> Dict:
        """
        Transcribe audio using Canary.

        Args:
            audio_path: Path to audio file
            model_name: Canary model to use
            **kwargs: Additional options
                - diarize: Enable speaker diarization (requires NeMo)

        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()

        try:
            # Check if diarization is requested
            diarize = kwargs.get('diarize', False)

            if self._nemo_available and diarize:
                # Use NeMo for full features
                return self._transcribe_nemo(audio_path, model_name, **kwargs)
            else:
                # Use transformers for basic transcription
                return self._transcribe_transformers(audio_path, model_name, **kwargs)

        except Exception as e:
            processing_time = time.time() - start_time
            return {
                'text': '',
                'processing_time': round(processing_time, 2),
                'error': str(e),
                'model': model_name,
                'backend': 'canary'
            }

    def _transcribe_transformers(self, audio_path: str, model_name: str, **kwargs) -> Dict:
        """Transcribe using HuggingFace transformers (basic mode)."""
        start_time = time.time()

        # Load model pipeline
        pipe = self._get_pipeline_transformers(model_name)

        # Load and convert audio to WAV if needed (M4A not always supported)
        import librosa
        import soundfile as sf
        import tempfile

        print(f"Loading audio file: {audio_path}")
        # Load audio with librosa (supports M4A via audioread/ffmpeg)
        audio_data, sample_rate = librosa.load(audio_path, sr=16000, mono=True)

        # Save to temporary WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            temp_wav_path = tmp_file.name
            sf.write(temp_wav_path, audio_data, sample_rate)

        try:
            # Transcribe
            print(f"Transcribing with Canary {model_name} (transformers mode)...")
            result = pipe(temp_wav_path)

            processing_time = time.time() - start_time

            # Extract text from result
            text = result['text'] if isinstance(result, dict) else result

            return {
                'text': text.strip(),
                'processing_time': round(processing_time, 2),
                'language': 'auto',  # Canary auto-detects language
                'model': model_name,
                'backend': 'canary',
                'mode': 'transformers'
            }
        finally:
            # Clean up temporary file
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)

    def _transcribe_nemo(self, audio_path: str, model_name: str, **kwargs) -> Dict:
        """Transcribe using NeMo (full features mode with diarization)."""
        start_time = time.time()

        # Load model via NeMo
        model = self._get_pipeline_nemo(model_name)

        # Load and convert audio to WAV if needed (M4A not always supported)
        import librosa
        import soundfile as sf
        import tempfile

        print(f"Loading audio file: {audio_path}")
        # Load audio with librosa (supports M4A via audioread/ffmpeg)
        audio_data, sample_rate = librosa.load(audio_path, sr=16000, mono=True)

        # Save to temporary WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            temp_wav_path = tmp_file.name
            sf.write(temp_wav_path, audio_data, sample_rate)

        try:
            # Transcribe with diarization
            print(f"Transcribing with Canary {model_name} (NeMo mode with diarization)...")

            transcription = model.transcribe(
                [temp_wav_path],
                return_hypotheses=True
            )[0]

            processing_time = time.time() - start_time

            # Extract text and metadata
            text = transcription.text if hasattr(transcription, 'text') else str(transcription)

            result = {
                'text': text.strip(),
                'processing_time': round(processing_time, 2),
                'language': 'auto',
                'model': model_name,
                'backend': 'canary',
                'mode': 'nemo'
            }

            # Check for speaker labels (diarization)
            if hasattr(transcription, 'speaker_labels'):
                result['speakers'] = transcription.speaker_labels
                print(f"Detected {len(set(transcription.speaker_labels))} speakers")

            return result
        finally:
            # Clean up temporary file
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)

    def list_models(self) -> List[Dict]:
        """List all available Canary models."""
        models = []
        for model_name, model_info in self.MODELS.items():
            model_dict = model_info.to_dict()
            model_dict['installed'] = self.is_model_installed(model_name)
            model_dict['nemo_available'] = self._nemo_available
            models.append(model_dict)
        return models

    def is_model_installed(self, model_name: str) -> bool:
        """
        Check if a Canary model is installed.
        Models are cached by HuggingFace in ~/.cache/huggingface/hub/
        """
        cache_dir = os.path.expanduser('~/.cache/huggingface/hub')
        if not os.path.exists(cache_dir):
            return False

        # Check for model directory (transformers cache)
        model_dir_name = f"models--nvidia--{model_name}"
        model_path = os.path.join(cache_dir, model_dir_name)

        if os.path.exists(model_path):
            return True

        # Also check NeMo cache if available
        nemo_cache_dir = os.path.expanduser('~/.cache/torch/NeMo')
        if os.path.exists(nemo_cache_dir):
            # Check for NeMo model
            for item in os.listdir(nemo_cache_dir):
                if model_name in item:
                    return True

        return False

    def download_model(self, model_name: str, progress_callback=None) -> None:
        """
        Download a Canary model.
        Models download automatically on first use.
        """
        print(f"Downloading Canary model: {model_name}")
        print(f"Size: {self.MODELS[model_name].size}")
        print("(Model will download automatically on first transcription)")

        if self._nemo_available:
            print("NeMo detected - will use NeMo for full features")
        else:
            print("Using transformers mode - install NeMo for diarization: pip install nemo_toolkit[asr]")

        # Pre-load the model to trigger download
        try:
            if self._nemo_available:
                model = self._get_pipeline_nemo(model_name)
            else:
                pipe = self._get_pipeline_transformers(model_name)
            print(f"Model {model_name} is ready!")
        except Exception as e:
            print(f"Error downloading model: {e}")
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
                'backend': 'canary'
            }

        # Calculate WER
        hypothesis = result['text'].strip()
        wer = self._calculate_wer(reference_text, hypothesis)

        return {
            'success': True,
            'model': model_name,
            'backend': 'canary',
            'reference_text': reference_text,
            'hypothesis_text': hypothesis,
            'wer': round(wer, 2),
            'processing_time': result['processing_time'],
            'language': result.get('language', 'auto'),
            'mode': result.get('mode', 'transformers')
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
    backend = CanaryBackend()

    print("Available Canary models:")
    print(f"NeMo available: {backend._nemo_available}")
    print()
    for model in backend.list_models():
        status = "✓" if model['installed'] else "✗"
        print(f"  {status} {model['name']:25} - {model['size']:8} - WER: {model['wer']}")
        print(f"      Features: {', '.join(model['features'])}")
