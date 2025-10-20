#!/usr/bin/env python3
"""
CLI runner for STT backends.
Called by Electron via subprocess with JSON output.
"""

import sys
import json
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from whisper_backend import WhisperBackend
from voxtral_backend import VoxtralBackend


# Registry of available backends
BACKENDS = {
    'whisper': WhisperBackend,
    'voxtral': VoxtralBackend,
}


def print_json(data):
    """Print data as JSON and flush."""
    print(json.dumps(data, indent=2))
    sys.stdout.flush()


def print_error(message):
    """Print error as JSON."""
    print_json({'error': message, 'success': False})


def main():
    if len(sys.argv) < 2:
        print_error("Usage: runner.py <command> [args...]")
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == 'list-backends':
            # List all available backends
            backends_info = {}
            for name, BackendClass in BACKENDS.items():
                try:
                    backend = BackendClass()
                    backends_info[name] = {
                        'name': name,
                        'models': backend.list_models(),
                        'available': True
                    }
                except Exception as e:
                    backends_info[name] = {
                        'name': name,
                        'available': False,
                        'error': str(e)
                    }

            print_json({
                'success': True,
                'backends': backends_info
            })

        elif command == 'list-models':
            # List models for a specific backend
            if len(sys.argv) < 3:
                print_error("Usage: runner.py list-models <backend>")
                sys.exit(1)

            backend_name = sys.argv[2]

            if backend_name not in BACKENDS:
                print_error(f"Unknown backend: {backend_name}")
                sys.exit(1)

            backend = BACKENDS[backend_name]()
            models = backend.list_models()

            print_json({
                'success': True,
                'backend': backend_name,
                'models': models
            })

        elif command == 'transcribe':
            # Transcribe audio file
            if len(sys.argv) < 5:
                print_error("Usage: runner.py transcribe <backend> <audio_path> <model_name>")
                sys.exit(1)

            backend_name = sys.argv[2]
            audio_path = sys.argv[3]
            model_name = sys.argv[4]

            # Optional arguments
            task = sys.argv[5] if len(sys.argv) > 5 else 'transcribe'

            if backend_name not in BACKENDS:
                print_error(f"Unknown backend: {backend_name}")
                sys.exit(1)

            if not os.path.exists(audio_path):
                print_error(f"Audio file not found: {audio_path}")
                sys.exit(1)

            # Create backend and transcribe
            backend = BACKENDS[backend_name]()

            print(f"[INFO] Transcribing: {audio_path}", file=sys.stderr)
            print(f"[INFO] Backend: {backend_name}", file=sys.stderr)
            print(f"[INFO] Model: {model_name}", file=sys.stderr)

            if backend_name == 'voxtral':
                result = backend.transcribe(audio_path, model_name, task=task)
            else:
                result = backend.transcribe(audio_path, model_name)

            result['success'] = 'error' not in result
            print_json(result)

        elif command == 'download':
            # Download a model
            if len(sys.argv) < 4:
                print_error("Usage: runner.py download <backend> <model_name>")
                sys.exit(1)

            backend_name = sys.argv[2]
            model_name = sys.argv[3]

            if backend_name not in BACKENDS:
                print_error(f"Unknown backend: {backend_name}")
                sys.exit(1)

            backend = BACKENDS[backend_name]()

            print(f"[INFO] Downloading model: {model_name}", file=sys.stderr)
            backend.download_model(model_name)

            print_json({
                'success': True,
                'backend': backend_name,
                'model': model_name,
                'message': 'Model download initiated'
            })

        elif command == 'benchmark':
            # Run benchmark
            if len(sys.argv) < 6:
                print_error("Usage: runner.py benchmark <backend> <audio_path> <model_name> <reference_text>")
                sys.exit(1)

            backend_name = sys.argv[2]
            audio_path = sys.argv[3]
            model_name = sys.argv[4]
            reference_text = sys.argv[5]

            if backend_name not in BACKENDS:
                print_error(f"Unknown backend: {backend_name}")
                sys.exit(1)

            if not os.path.exists(audio_path):
                print_error(f"Audio file not found: {audio_path}")
                sys.exit(1)

            backend = BACKENDS[backend_name]()

            print(f"[INFO] Running benchmark: {audio_path}", file=sys.stderr)
            print(f"[INFO] Backend: {backend_name}", file=sys.stderr)
            print(f"[INFO] Model: {model_name}", file=sys.stderr)
            print(f"[INFO] Reference: {reference_text}", file=sys.stderr)

            result = backend.benchmark(audio_path, model_name, reference_text)

            result['success'] = 'error' not in result
            print_json(result)

        else:
            print_error(f"Unknown command: {command}")
            print_error("Available commands: list-backends, list-models, transcribe, download, benchmark")
            sys.exit(1)

    except Exception as e:
        import traceback
        print_error(f"Error: {str(e)}")
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
