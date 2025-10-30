"""
Wav2Vec-BERT backend for Speech-to-Text.
Uses Facebook's Wav2Vec2-BERT models via HuggingFace transformers.
Optimized for low-resource languages and code-switching scenarios.
"""

import time
import os
from typing import Dict, List
from base import STTBackend, ModelInfo


class Wav2VecBERTBackend(STTBackend):
    """Facebook Wav2Vec2-BERT speech recognition backend - low-resource language optimization."""

    MODELS = {
        'wav2vec2-base-960h': ModelInfo(
            'wav2vec2-base-960h',
            '~360MB',
            '~95M',
            '~8-10%',
            ['transcription', 'english', 'librispeech'],
            'Meta'
        ),
        'wav2vec2-large-960h-lv60-self': ModelInfo(
            'wav2vec2-large-960h-lv60-self',
            '~1.2GB',
            '~300M',
            '~6-8%',
            ['transcription', 'english', 'high-accuracy'],
            'Meta'
        ),
        'wav2vec2-large-xlsr-53-english': ModelInfo(
            'wav2vec2-large-xlsr-53-english',
            '~1.2GB',
            '~300M',
            '~6-8%',
            ['transcription', 'multilingual', 'english', 'fine-tuned'],
            'Meta'
        ),
    }

    def __init__(self):
        super().__init__()
        self._pipeline = None
        self._current_model = None
        self._current_model_name = None

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

    def _get_pipeline(self, model_name: str):
        """Load or return cached model pipeline."""
        if self._current_model_name != model_name:
            print(f"Loading Wav2Vec2 model: {model_name}...")
            pipeline_fn = self._load_transformers()

            # Determine the correct model repository
            if model_name == 'wav2vec2-large-xlsr-53-english':
                model_id = f"jonatasgrosman/{model_name}"
            else:
                model_id = f"facebook/{model_name}"

            try:
                self._current_model = pipeline_fn(
                    "automatic-speech-recognition",
                    model=model_id,
                    device=-1  # CPU by default, use 0 for CUDA
                )
                self._current_model_name = model_name
                print(f"Wav2Vec2 model {model_name} loaded successfully!")
            except Exception as e:
                print(f"Error loading Wav2Vec2 model {model_name}: {e}")
                raise

        return self._current_model

    def transcribe(self, audio_path: str, model_name: str = 'wav2vec2-base-960h', **kwargs) -> Dict:
        """
        Transcribe audio using Wav2Vec2.

        Args:
            audio_path: Path to audio file
            model_name: Wav2Vec2 model to use
            **kwargs: Additional options (currently unused)

        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()

        try:
            # Load model pipeline
            pipe = self._get_pipeline(model_name)

            # Load and convert audio to WAV if needed (M4A not always supported)
            import librosa
            import soundfile as sf
            import tempfile
            import os

            print(f"Loading audio file: {audio_path}")
            # Load audio with librosa (supports M4A via audioread/ffmpeg)
            audio_data, sample_rate = librosa.load(audio_path, sr=16000, mono=True)

            # Save to temporary WAV file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                temp_wav_path = tmp_file.name
                sf.write(temp_wav_path, audio_data, sample_rate)

            try:
                # Transcribe
                print(f"Transcribing with Wav2Vec2 {model_name}...")
                result = pipe(temp_wav_path)

                processing_time = time.time() - start_time

                # Extract text from result
                text = result['text'] if isinstance(result, dict) else result

                return {
                    'text': text.strip(),
                    'processing_time': round(processing_time, 2),
                    'language': 'auto',  # Wav2Vec2 auto-detects language
                    'model': model_name,
                    'backend': 'wav2vec_bert'
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
                'backend': 'wav2vec_bert'
            }

    def list_models(self) -> List[Dict]:
        """List all available Wav2Vec2 models."""
        models = []
        for model_name, model_info in self.MODELS.items():
            model_dict = model_info.to_dict()
            model_dict['installed'] = self.is_model_installed(model_name)
            models.append(model_dict)
        return models

    def is_model_installed(self, model_name: str) -> bool:
        """
        Check if a Wav2Vec2 model is installed.
        Models are cached by HuggingFace in ~/.cache/huggingface/hub/
        """
        cache_dir = os.path.expanduser('~/.cache/huggingface/hub')
        if not os.path.exists(cache_dir):
            return False

        # Check for model directory
        # HuggingFace stores models as: models--facebook--wav2vec2-base-960h or models--jonatasgrosman--...
        if model_name == 'wav2vec2-large-xlsr-53-english':
            model_dir_name = f"models--jonatasgrosman--{model_name}"
        else:
            model_dir_name = f"models--facebook--{model_name}"

        model_path = os.path.join(cache_dir, model_dir_name)

        return os.path.exists(model_path)

    def download_model(self, model_name: str, progress_callback=None) -> None:
        """
        Download a Wav2Vec2 model.
        HuggingFace transformers downloads automatically on first use.
        """
        print(f"Downloading Wav2Vec2 model: {model_name}")
        print("(Model will download automatically on first transcription)")

        # Pre-load the model to trigger download
        try:
            pipe = self._get_pipeline(model_name)
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
                'backend': 'wav2vec_bert'
            }

        # Calculate WER
        hypothesis = result['text'].strip()
        wer = self._calculate_wer(reference_text, hypothesis)

        return {
            'success': True,
            'model': model_name,
            'backend': 'wav2vec_bert',
            'reference_text': reference_text,
            'hypothesis_text': hypothesis,
            'wer': round(wer, 2),
            'processing_time': result['processing_time'],
            'language': result.get('language', 'auto')
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
    backend = Wav2VecBERTBackend()

    print("Available Wav2Vec2 models:")
    for model in backend.list_models():
        status = "✓" if model['installed'] else "✗"
        print(f"  {status} {model['name']:35} - {model['size']:8} - WER: {model['wer']}")
