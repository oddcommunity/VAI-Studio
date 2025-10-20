"""
Voxtral backend for Speech-to-Text.
Uses Mistral's Voxtral model via transformers.
"""

import time
import os
from typing import Dict, List
from base import STTBackend, ModelInfo


class VoxtralBackend(STTBackend):
    """Mistral Voxtral speech recognition backend."""

    MODELS = {
        'Voxtral-Mini-3B-2507': ModelInfo(
            'Voxtral-Mini-3B-2507',
            '~6GB',
            '3B',
            '6.68%',
            ['transcription', 'summarization', 'Q&A']
        ),
        'Voxtral-Small-24B-2507': ModelInfo(
            'Voxtral-Small-24B-2507',
            '~48GB',
            '24B',
            '6.31%',
            ['transcription', 'summarization', 'Q&A']
        ),
    }

    def __init__(self):
        super().__init__()
        self._transformers = None
        self._torch = None
        self._current_model = None
        self._current_processor = None
        self._current_model_name = None

    def _load_modules(self):
        """Lazy load required modules."""
        if self._transformers is None:
            from transformers import VoxtralForConditionalGeneration, AutoProcessor
            import torch
            self._transformers = (VoxtralForConditionalGeneration, AutoProcessor)
            self._torch = torch
        return self._transformers, self._torch

    def _get_model_and_processor(self, model_name: str):
        """Load or return cached model and processor."""
        if self._current_model_name != model_name:
            (VoxtralForConditionalGeneration, AutoProcessor), torch = self._load_modules()

            print(f"Loading Voxtral model: {model_name}...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Using device: {device}")

            repo_id = f"mistralai/{model_name}"

            try:
                self._current_processor = AutoProcessor.from_pretrained(repo_id)
                self._current_model = VoxtralForConditionalGeneration.from_pretrained(
                    repo_id,
                    torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
                    device_map=device
                )
                self._current_model_name = model_name
            except Exception as e:
                print(f"Error loading Voxtral model: {e}")
                raise

        return self._current_model, self._current_processor

    def transcribe(self, audio_path: str, model_name: str = 'Voxtral-Mini-3B-2507',
                   task: str = 'transcribe', prompt: str = None, **kwargs) -> Dict:
        """
        Transcribe audio using Voxtral.

        Args:
            audio_path: Path to audio file
            model_name: Voxtral model to use
            task: Type of task ('transcribe', 'summarize', 'qa')
            prompt: Custom prompt for the model
            **kwargs: Additional options

        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()

        try:
            model, processor = self._get_model_and_processor(model_name)
            _, torch = self._load_modules()

            # Build conversation based on task
            if prompt is None:
                if task == 'summarize':
                    prompt = "Transcribe this audio and provide a detailed summary."
                elif task == 'qa':
                    prompt = kwargs.get('question', "What is this audio about?")
                else:  # transcribe
                    prompt = "Transcribe this audio."

            conversation = [{
                "role": "user",
                "content": [
                    {"type": "audio", "path": audio_path},
                    {"type": "text", "text": prompt}
                ]
            }]

            print(f"Processing with Voxtral {model_name}...")
            print(f"Task: {task}")

            # Process
            inputs = processor.apply_chat_template(conversation)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.bfloat16 if device == "cuda" else torch.float32
            inputs = inputs.to(device, dtype=dtype)

            # Generate
            outputs = model.generate(**inputs, max_new_tokens=500)

            # Decode
            result_text = processor.batch_decode(
                outputs[:, inputs.input_ids.shape[1]:],
                skip_special_tokens=True
            )[0]

            processing_time = time.time() - start_time

            return {
                'text': result_text.strip(),
                'processing_time': round(processing_time, 2),
                'task': task,
                'model': model_name,
                'backend': 'voxtral',
                'device': device
            }

        except Exception as e:
            processing_time = time.time() - start_time
            return {
                'text': '',
                'processing_time': round(processing_time, 2),
                'error': str(e),
                'model': model_name,
                'backend': 'voxtral'
            }

    def list_models(self) -> List[Dict]:
        """List all available Voxtral models."""
        models = []
        for model_name, model_info in self.MODELS.items():
            model_dict = model_info.to_dict()
            model_dict['installed'] = self.is_model_installed(model_name)
            models.append(model_dict)
        return models

    def is_model_installed(self, model_name: str) -> bool:
        """
        Check if a Voxtral model is installed.
        Models are cached in ~/.cache/huggingface/hub/
        """
        cache_dir = os.path.expanduser('~/.cache/huggingface/hub')
        if not os.path.exists(cache_dir):
            return False

        # Check for model directory
        # HuggingFace uses format: models--mistralai--Voxtral-Mini-3B-2507
        model_dir_name = f"models--mistralai--{model_name}"
        model_path = os.path.join(cache_dir, model_dir_name)

        return os.path.exists(model_path)

    def download_model(self, model_name: str, progress_callback=None) -> None:
        """
        Download a Voxtral model.
        Models download automatically from HuggingFace on first use.
        """
        print(f"Downloading Voxtral model: {model_name}")
        print("(Large model - may take several minutes)")

        try:
            # Pre-load the model to trigger download
            model, processor = self._get_model_and_processor(model_name)
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
        result = self.transcribe(audio_path, model_name, task='transcribe')

        if 'error' in result:
            return {
                'success': False,
                'error': result['error'],
                'model': model_name,
                'backend': 'voxtral'
            }

        # Calculate WER
        hypothesis = result['text'].strip()
        wer = self._calculate_wer(reference_text, hypothesis)

        return {
            'success': True,
            'model': model_name,
            'backend': 'voxtral',
            'reference_text': reference_text,
            'hypothesis_text': hypothesis,
            'wer': round(wer, 2),
            'processing_time': result['processing_time'],
            'task': result.get('task', 'transcribe')
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
    backend = VoxtralBackend()

    print("Available Voxtral models:")
    for model in backend.list_models():
        status = "✓" if model['installed'] else "✗"
        print(f"  {status} {model['name']:30} - {model['size']:8} - WER: {model['wer']}")
        print(f"      Features: {', '.join(model['features'])}")
