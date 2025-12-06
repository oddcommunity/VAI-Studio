"""
Granite backend for Speech-to-Text.
Uses IBM Granite Speech models via HuggingFace transformers.
Two-pass architecture: ASR + LLM-based refinement for high accuracy.

NOTE: Granite Speech requires special handling with AutoProcessor and
AutoModelForSpeechSeq2Seq - it does NOT work with the simple pipeline() API.
"""

import time
import os
from typing import Dict, List
from base import STTBackend, ModelInfo
from progress import report_progress


class GraniteBackend(STTBackend):
    """IBM Granite speech recognition backend - multilingual with LLM refinement."""

    MODELS = {
        'granite-speech-3.3-8b': ModelInfo(
            'granite-speech-3.3-8b',
            '~6-7GB',
            '8B',
            '5.85%',
            ['transcription', 'multilingual', 'llm-refinement', 'en', 'es', 'fr', 'de', 'pt'],
            'IBM'
        ),
    }

    # Supported languages
    LANGUAGES = {
        'auto': 'Automatic detection',
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'pt': 'Portuguese'
    }

    def __init__(self):
        super().__init__()
        self._processor = None
        self._model = None
        self._tokenizer = None
        self._current_model_name = None
        self._device = None

    def _load_model(self, model_name: str):
        """Load or return cached Granite model and processor."""
        if self._current_model_name != model_name:
            is_downloading = not self.is_model_installed(model_name)

            if is_downloading:
                report_progress(10, f'Downloading {model_name}...', 'downloading')
            else:
                report_progress(10, f'Loading {model_name} model...', 'loading_model')

            print(f"Loading Granite model: {model_name}...")

            try:
                import torch
                from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq

                model_id = f"ibm-granite/{model_name}"

                if is_downloading:
                    report_progress(15, 'Downloading model files from HuggingFace...', 'downloading')

                # Get HuggingFace token for authentication
                token = self._get_hf_token()

                # Determine device
                self._device = "cuda" if torch.cuda.is_available() else "cpu"
                print(f"Using device: {self._device}")

                # Load processor
                report_progress(20, 'Loading processor...', 'loading_model')
                self._processor = AutoProcessor.from_pretrained(model_id, token=token)
                self._tokenizer = self._processor.tokenizer

                # Load model with appropriate dtype
                report_progress(25, 'Loading model weights...', 'loading_model')
                dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
                self._model = AutoModelForSpeechSeq2Seq.from_pretrained(
                    model_id,
                    device_map=self._device,
                    torch_dtype=dtype,
                    token=token
                )

                self._current_model_name = model_name

                if is_downloading:
                    report_progress(30, 'Download complete! Model loaded.', 'loaded')
                else:
                    report_progress(30, 'Model loaded successfully', 'loaded')

                print(f"Granite model {model_name} loaded successfully!")

            except ImportError as e:
                missing_lib = str(e)
                if 'torch' in missing_lib:
                    raise ImportError(
                        "PyTorch not found. Install with: pip install torch torchaudio"
                    )
                elif 'transformers' in missing_lib:
                    raise ImportError(
                        "transformers library not found. Install with: "
                        "pip install transformers>=4.52.4"
                    )
                elif 'peft' in missing_lib.lower():
                    raise ImportError(
                        "peft library required for Granite Speech. Install with: pip install peft"
                    )
                raise

            except Exception as e:
                error_msg = str(e).lower()
                # Check for authentication errors
                if '401' in error_msg or '403' in error_msg or 'authentication' in error_msg or 'unauthorized' in error_msg:
                    print(f"Error loading Granite model {model_name}: Authentication failed")
                    raise Exception(
                        "HuggingFace authentication required. Please add your HuggingFace token in Settings > Advanced Settings > HuggingFace Authentication. "
                        "Get a free token at https://huggingface.co/settings/tokens"
                    )
                print(f"Error loading Granite model {model_name}: {e}")
                raise

        return self._processor, self._model, self._tokenizer

    def transcribe(self, audio_path: str, model_name: str = 'granite-speech-3.3-8b', **kwargs) -> Dict:
        """
        Transcribe audio using Granite Speech.

        Args:
            audio_path: Path to audio file
            model_name: Granite model to use
            **kwargs: Additional options
                - language: Language code (en, es, fr, de, pt, auto)

        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()

        try:
            import torch
            import torchaudio

            report_progress(0, 'Starting transcription...', 'initializing')

            # Get language parameter
            language = kwargs.get('language', 'auto')

            # Check if model needs to be downloaded
            if not self.is_model_installed(model_name):
                model_size = self.MODELS.get(model_name, ModelInfo('unknown', '~6GB', '', '', [], '')).size
                report_progress(5, f'Model not installed. Downloading {model_name} ({model_size})...', 'downloading')
                print(f"[DOWNLOAD] Model {model_name} not found in cache. Downloading...")

            # Load model (will download if needed)
            processor, model, tokenizer = self._load_model(model_name)

            # Load audio file
            report_progress(35, 'Loading audio file...', 'loading_audio')
            print(f"Loading audio file: {audio_path}")

            # Granite requires 16kHz mono audio
            wav, sr = torchaudio.load(audio_path)

            # Resample if needed
            if sr != 16000:
                print(f"Resampling from {sr}Hz to 16000Hz")
                resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)
                wav = resampler(wav)
                sr = 16000

            # Convert to mono if stereo
            if wav.shape[0] > 1:
                wav = wav.mean(dim=0, keepdim=True)

            # Normalize audio
            wav = wav / wav.abs().max() if wav.abs().max() > 0 else wav

            # Ensure shape is (1, samples)
            if wav.dim() == 1:
                wav = wav.unsqueeze(0)

            report_progress(50, 'Transcribing audio...', 'transcribing')
            print(f"Transcribing with Granite {model_name}...")
            if language and language != 'auto':
                print(f"Language: {self.LANGUAGES.get(language, language)}")

            # Create chat template for transcription
            system_prompt = (
                "Knowledge Cutoff Date: April 2024.\n"
                "Today's Date: December 5, 2025.\n"
                "You are Granite, developed by IBM. You are a helpful AI assistant."
            )
            user_prompt = "<|audio|>can you transcribe the speech into a written format?"

            chat = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]

            prompt = tokenizer.apply_chat_template(chat, tokenize=False, add_generation_prompt=True)

            # Process audio and text through the processor
            report_progress(60, 'Processing with model...', 'transcribing')
            model_inputs = processor(
                prompt,
                wav,
                device=self._device,
                return_tensors="pt"
            ).to(self._device)

            # Generate transcription
            report_progress(70, 'Generating transcription...', 'transcribing')
            model_outputs = model.generate(
                **model_inputs,
                max_new_tokens=500,
                do_sample=False,
                num_beams=1
            )

            # Decode output (transformers includes input IDs in response)
            num_input_tokens = model_inputs["input_ids"].shape[-1]
            new_tokens = torch.unsqueeze(model_outputs[0, num_input_tokens:], dim=0)
            output_text = tokenizer.batch_decode(
                new_tokens, add_special_tokens=False, skip_special_tokens=True
            )

            processing_time = time.time() - start_time

            report_progress(90, 'Processing results...', 'finalizing')

            # Extract text
            text = output_text[0] if output_text else ""

            return {
                'success': True,
                'text': text.strip(),
                'processing_time': round(processing_time, 2),
                'segments': [],  # Granite doesn't provide word-level timestamps
                'language': language,
                'model': model_name,
                'backend': 'granite'
            }

        except Exception as e:
            processing_time = time.time() - start_time
            error_msg = str(e)

            # Provide helpful error messages
            if 'torchaudio' in error_msg.lower():
                error_msg = "torchaudio not found. Install with: pip install torchaudio"
            elif 'peft' in error_msg.lower():
                error_msg = "peft library required. Install with: pip install peft"

            return {
                'success': False,
                'text': '',
                'processing_time': round(processing_time, 2),
                'error': error_msg,
                'model': model_name,
                'backend': 'granite'
            }

    def list_models(self) -> List[Dict]:
        """List all available Granite models."""
        models = []
        for model_name, model_info in self.MODELS.items():
            model_dict = model_info.to_dict()
            model_dict['installed'] = self.is_model_installed(model_name)
            # Add language support info
            model_dict['languages'] = list(self.LANGUAGES.keys())
            models.append(model_dict)
        return models

    def is_model_installed(self, model_name: str) -> bool:
        """
        Check if a Granite model is installed.
        Granite models are cached by HuggingFace in ~/.cache/huggingface/hub/
        """
        cache_dir = os.path.expanduser('~/.cache/huggingface/hub')
        if not os.path.exists(cache_dir):
            return False

        # Check for model directory
        # HuggingFace stores models as: models--ibm-granite--granite-speech-3.3-8b
        model_dir_name = f"models--ibm-granite--{model_name}"
        model_path = os.path.join(cache_dir, model_dir_name)

        return os.path.exists(model_path)

    def download_model(self, model_name: str, progress_callback=None) -> None:
        """
        Download a Granite model.
        HuggingFace transformers downloads automatically on first use.
        """
        print(f"Downloading Granite model: {model_name}")
        print("(Model will download automatically on first transcription)")
        print(f"Note: {self.MODELS[model_name].size} download size")

        # Pre-load the model to trigger download
        try:
            self._load_model(model_name)
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
                'backend': 'granite'
            }

        # Calculate WER
        hypothesis = result['text'].strip()
        wer = self._calculate_wer(reference_text, hypothesis)

        return {
            'success': True,
            'model': model_name,
            'backend': 'granite',
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
    backend = GraniteBackend()

    print("Available Granite models:")
    for model in backend.list_models():
        status = "✓" if model['installed'] else "✗"
        languages = ', '.join(model.get('languages', []))
        print(f"  {status} {model['name']:25} - {model['size']:8} - WER: {model['wer']}")
        print(f"      Languages: {languages}")
