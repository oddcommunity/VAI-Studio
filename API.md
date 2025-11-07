# VAI Studio Backend API Documentation

**Version**: 3.0.0
**Last Updated**: November 2025

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [IPC API (Electron ↔ Renderer)](#ipc-api)
3. [Python Backend API](#python-backend-api)
4. [Adding Custom Backends](#adding-custom-backends)
5. [Data Structures](#data-structures)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

---

## Architecture Overview

VAI Studio uses a three-tier architecture:

```
┌─────────────────────────────────┐
│   Frontend (Renderer Process)   │
│   - React/Vanilla JS            │
│   - User Interface              │
└─────────────────────────────────┘
           ↕ IPC (contextBridge)
┌─────────────────────────────────┐
│   Electron Main Process         │
│   - IPC Handlers                │
│   - Process Management          │
│   - File System Access          │
└─────────────────────────────────┘
           ↕ subprocess (spawn)
┌─────────────────────────────────┐
│   Python Backend                │
│   - runner.py (main entry)      │
│   - Multiple STT backends       │
│   - Model management            │
└─────────────────────────────────┘
```

### Communication Flow

1. **Frontend** calls `window.electronAPI.methodName(params)`
2. **Electron Main** receives IPC call, spawns Python subprocess
3. **Python** processes request, returns JSON
4. **Electron Main** parses JSON and returns to frontend
5. **Frontend** displays results

---

## IPC API

All IPC methods are exposed via `window.electronAPI` in the renderer process.

### Available Methods

#### 1. `transcribe(options)`

Transcribe an audio file using a specific model.

**Parameters:**
```typescript
{
  audioPath: string;      // Absolute path to audio file
  backend: string;        // Backend name (e.g., "whisper", "voxtral")
  modelName: string;      // Model identifier (e.g., "base", "large-v3")
  task?: string;          // Optional: "transcribe" (default) or "translate"
}
```

**Returns:**
```typescript
{
  success: boolean;
  text?: string;                 // Transcribed text
  processing_time?: number;      // Time in seconds
  segments?: Array<{            // Word-level timestamps (if available)
    start: number;
    end: number;
    text: string;
  }>;
  language?: string;            // Detected language
  error?: string;               // Error message if success=false
}
```

**Example:**
```javascript
const result = await window.electronAPI.transcribe({
  audioPath: '/path/to/audio.mp3',
  backend: 'whisper',
  modelName: 'base',
  task: 'transcribe'
});

if (result.success) {
  console.log('Transcription:', result.text);
  console.log('Time taken:', result.processing_time, 'seconds');
}
```

---

#### 2. `listBackends()`

Get all available STT backends.

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  backends?: Array<{
    id: string;              // Backend identifier
    name: string;            // Display name
    description: string;     // Backend description
    company?: string;        // Company/organization
  }>;
  error?: string;
}
```

**Example:**
```javascript
const result = await window.electronAPI.listBackends();
console.log('Available backends:', result.backends);
// Output: [{ id: 'whisper', name: 'OpenAI Whisper', ... }, ...]
```

---

#### 3. `listModels(options)`

List all models for a specific backend.

**Parameters:**
```typescript
{
  backend: string;  // Backend identifier
}
```

**Returns:**
```typescript
{
  success: boolean;
  models?: Array<{
    name: string;           // Model identifier
    display_name: string;   // Human-readable name
    size: string;           // Model size (e.g., "74MB", "1.5GB")
    params: string;         // Parameter count (e.g., "74M", "1.5B")
    wer?: string;           // Word Error Rate (e.g., "~10%")
    installed: boolean;     // Whether model is downloaded
    features?: string[];    // Supported features
    company?: string;       // Model provider
  }>;
  error?: string;
}
```

**Example:**
```javascript
const result = await window.electronAPI.listModels({ backend: 'whisper' });
result.models.forEach(model => {
  console.log(`${model.display_name}: ${model.size}, WER: ${model.wer}`);
});
```

---

#### 4. `downloadModel(options)`

Download and install a model.

**Parameters:**
```typescript
{
  backend: string;    // Backend identifier
  modelName: string;  // Model to download
}
```

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Progress Updates:**
The main process emits `download-progress` events during download:
```javascript
window.electronAPI.onDownloadProgress((progress) => {
  console.log(`Download: ${progress.percent}%`);
});
```

**Example:**
```javascript
const result = await window.electronAPI.downloadModel({
  backend: 'whisper',
  modelName: 'base'
});

if (result.success) {
  console.log('Model downloaded!');
}
```

---

#### 5. `benchmark(options)`

Run a benchmark test with reference text.

**Parameters:**
```typescript
{
  audioPath: string;       // Path to audio file
  backend: string;         // Backend identifier
  modelName: string;       // Model to test
  referenceText: string;   // Ground truth transcription
}
```

**Returns:**
```typescript
{
  success: boolean;
  hypothesis_text?: string;    // Model's transcription
  reference_text?: string;     // Ground truth
  wer?: number;                // Word Error Rate (0-100)
  processing_time?: number;    // Time in seconds
  language?: string;           // Detected language
  error?: string;
}
```

**Example:**
```javascript
const result = await window.electronAPI.benchmark({
  audioPath: '/samples/test1.wav',
  backend: 'whisper',
  modelName: 'base',
  referenceText: 'The quick brown fox jumps over the lazy dog'
});

console.log(`WER: ${result.wer}%`);
console.log(`Processing time: ${result.processing_time}s`);
```

---

#### 6. File Operations

**Select Audio File:**
```javascript
const result = await window.electronAPI.selectAudioFile();
if (result.success && !result.canceled) {
  console.log('Selected:', result.filePath);
}
```

**Select Multiple Files:**
```javascript
const result = await window.electronAPI.selectMultipleAudioFiles();
console.log('Selected files:', result.filePaths);
```

**Get File Info:**
```javascript
const info = await window.electronAPI.getFileInfo({
  filePath: '/path/to/file.mp3'
});
console.log(`File: ${info.fileName}, Size: ${info.fileSizeMB}MB`);
```

**Export Results:**
```javascript
// Open save dialog
const dialog = await window.electronAPI.saveDialog({
  defaultPath: 'transcription.txt',
  filters: [
    { name: 'Text Files', extensions: ['txt'] },
    { name: 'JSON', extensions: ['json'] }
  ]
});

if (!dialog.canceled) {
  // Export
  await window.electronAPI.exportResult({
    result: transcriptionResult,
    format: 'txt',  // 'txt', 'json', 'srt', 'vtt'
    filePath: dialog.filePath
  });
}
```

---

#### 7. HuggingFace Authentication

**Save Token:**
```javascript
await window.electronAPI.saveHFToken('hf_...');
```

**Get Token:**
```javascript
const result = await window.electronAPI.getHFToken();
console.log('Token:', result.token);
```

**Test Token:**
```javascript
const result = await window.electronAPI.testHFToken('hf_...');
if (result.valid) {
  console.log('Token valid for user:', result.username);
}
```

**Clear Token:**
```javascript
await window.electronAPI.clearHFToken();
```

**Open Token Page:**
```javascript
await window.electronAPI.openHFTokenPage();
```

---

## Python Backend API

The Python backend is organized as a plugin system with a base class and multiple implementations.

### Directory Structure

```
backends/
├── runner.py              # Main entry point
├── base.py                # Abstract base class
├── whisper_backend.py     # OpenAI Whisper implementation
├── voxtral_backend.py     # Mistral Voxtral implementation
├── granite_backend.py     # IBM Granite implementation
├── parakeet_backend.py    # NVIDIA Parakeet implementation
├── canary_backend.py      # NVIDIA Canary implementation
├── wav2vec_backend.py     # Facebook Wav2Vec implementation
├── groq_backend.py        # Groq Cloud API implementation
├── assemblyai_backend.py  # AssemblyAI Cloud API implementation
├── deepgram_backend.py    # Deepgram Cloud API implementation
└── requirements.txt       # Python dependencies
```

### Command-Line Interface

The Python backend is invoked via command-line:

```bash
python backends/runner.py <command> [args...]
```

**Available Commands:**

1. **list-backends**
   ```bash
   python backends/runner.py list-backends
   ```
   Returns JSON array of available backends.

2. **list-models**
   ```bash
   python backends/runner.py list-models <backend>
   ```
   Returns JSON array of models for the specified backend.

3. **transcribe**
   ```bash
   python backends/runner.py transcribe <backend> <audio_path> <model_name> [task]
   ```
   Transcribes audio and returns JSON result.

4. **download**
   ```bash
   python backends/runner.py download <backend> <model_name>
   ```
   Downloads the specified model.

5. **benchmark**
   ```bash
   python backends/runner.py benchmark <backend> <audio_path> <model_name> <reference_text>
   ```
   Runs benchmark and returns WER + metrics.

### Progress Reporting

Backends can report progress by printing to stderr:

```python
import json
import sys

progress = {
    'type': 'progress',
    'percent': 45.2,
    'message': 'Processing audio...'
}
print(f"PROGRESS:{json.dumps(progress)}", file=sys.stderr, flush=True)
```

The Electron main process listens for `PROGRESS:` prefix and emits events to the renderer.

---

## Adding Custom Backends

### Step 1: Create Backend Class

Create a new file `backends/mybackend_backend.py`:

```python
from base import STTBackend
import time
import json

class MyBackend(STTBackend):
    """Custom STT backend implementation"""

    def get_info(self):
        """Return backend metadata"""
        return {
            'id': 'mybackend',
            'name': 'My Custom Backend',
            'description': 'A custom speech-to-text backend',
            'company': 'My Company'
        }

    def list_models(self):
        """List available models"""
        return [
            {
                'name': 'model-small',
                'display_name': 'Small Model',
                'size': '100MB',
                'params': '100M',
                'wer': '~8%',
                'installed': self._is_model_installed('model-small'),
                'features': ['transcription'],
                'company': 'My Company'
            },
            {
                'name': 'model-large',
                'display_name': 'Large Model',
                'size': '1GB',
                'params': '1B',
                'wer': '~5%',
                'installed': self._is_model_installed('model-large'),
                'features': ['transcription', 'translation'],
                'company': 'My Company'
            }
        ]

    def transcribe(self, audio_path, model_name, task='transcribe'):
        """
        Transcribe audio file

        Args:
            audio_path: Path to audio file
            model_name: Model identifier
            task: 'transcribe' or 'translate'

        Returns:
            dict with keys: text, processing_time, segments, language
        """
        start_time = time.time()

        # Your transcription logic here
        # Load model, process audio, etc.

        # Report progress (optional)
        self._report_progress(25, 'Loading model...')

        # ... your code ...

        self._report_progress(75, 'Transcribing audio...')

        # ... your code ...

        result_text = "Transcribed text goes here"

        return {
            'text': result_text,
            'processing_time': time.time() - start_time,
            'segments': [],  # Optional: word-level timestamps
            'language': 'en'
        }

    def download_model(self, model_name):
        """Download and install a model"""
        # Your download logic here
        # Use self._report_progress() to update progress
        pass

    def _is_model_installed(self, model_name):
        """Check if model is already downloaded"""
        # Your logic to check if model exists locally
        return False

    def _report_progress(self, percent, message):
        """Report progress to parent process"""
        import sys
        progress = {
            'type': 'progress',
            'percent': percent,
            'message': message
        }
        print(f"PROGRESS:{json.dumps(progress)}", file=sys.stderr, flush=True)
```

### Step 2: Register Backend

Add your backend to `backends/runner.py`:

```python
from mybackend_backend import MyBackend

BACKENDS = {
    'whisper': WhisperBackend(),
    'voxtral': VoxtralBackend(),
    'mybackend': MyBackend(),  # Add this line
    # ... other backends
}
```

### Step 3: Test Your Backend

```bash
# List models
python backends/runner.py list-models mybackend

# Transcribe
python backends/runner.py transcribe mybackend /path/to/audio.mp3 model-small

# Download model
python backends/runner.py download mybackend model-small
```

### Step 4: Use in App

Your backend is now available in the VAI Studio UI!

```javascript
// Frontend code
const result = await window.electronAPI.transcribe({
  audioPath: '/path/to/audio.mp3',
  backend: 'mybackend',
  modelName: 'model-small'
});
```

---

## Data Structures

### Transcription Result

```typescript
interface TranscriptionResult {
  success: boolean;
  text?: string;                    // Full transcription
  processing_time?: number;         // Seconds
  segments?: Segment[];             // Word-level timestamps
  language?: string;                // ISO language code
  error?: string;                   // If success=false
}

interface Segment {
  start: number;     // Start time in seconds
  end: number;       // End time in seconds
  text: string;      // Segment text
}
```

### Model Info

```typescript
interface ModelInfo {
  name: string;              // Model identifier (e.g., "base")
  display_name: string;      // Human-readable name
  size: string;              // File size (e.g., "74MB")
  params: string;            // Parameter count (e.g., "74M")
  wer?: string;              // Word Error Rate (e.g., "~10%")
  installed: boolean;        // Download status
  features?: string[];       // ['transcription', 'translation', 'summarization']
  company?: string;          // Model provider
}
```

### Backend Info

```typescript
interface BackendInfo {
  id: string;            // Backend identifier
  name: string;          // Display name
  description: string;   // Description
  company?: string;      // Company/organization
}
```

### Benchmark Result

```typescript
interface BenchmarkResult {
  success: boolean;
  hypothesis_text?: string;   // Model output
  reference_text?: string;    // Ground truth
  wer?: number;               // Word Error Rate (0-100)
  processing_time?: number;   // Seconds
  language?: string;          // Detected language
  error?: string;
}
```

---

## Error Handling

### Python Backend Errors

All Python backends should return JSON with error information:

```python
try:
    result = do_transcription()
    return {'success': True, 'text': result}
except Exception as e:
    return {
        'success': False,
        'error': str(e),
        'error_type': type(e).__name__
    }
```

### IPC Error Handling

The Electron main process wraps all IPC calls:

```javascript
ipcMain.handle('transcribe', async (event, options) => {
  try {
    const result = await runPythonCommand([...]);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});
```

### Frontend Error Handling

Always check `success` field:

```javascript
const result = await window.electronAPI.transcribe(options);

if (result.success) {
  console.log('Success:', result.text);
} else {
  console.error('Error:', result.error);
  showToast(result.error, 'error');
}
```

---

## Examples

### Example 1: Simple Transcription

```javascript
async function transcribeFile(filePath) {
  const result = await window.electronAPI.transcribe({
    audioPath: filePath,
    backend: 'whisper',
    modelName: 'base'
  });

  if (result.success) {
    console.log('Transcription:', result.text);
    console.log('Time:', result.processing_time, 'seconds');
  } else {
    console.error('Error:', result.error);
  }
}

// Usage
transcribeFile('/Users/me/audio.mp3');
```

### Example 2: Batch Processing

```javascript
async function batchTranscribe(files, backend, model) {
  const results = [];

  for (let i = 0; i < files.length; i++) {
    console.log(`Processing ${i + 1}/${files.length}...`);

    const result = await window.electronAPI.transcribe({
      audioPath: files[i].path,
      backend: backend,
      modelName: model
    });

    results.push({
      file: files[i].name,
      result: result
    });
  }

  return results;
}

// Usage
const files = [
  { path: '/audio1.mp3', name: 'audio1.mp3' },
  { path: '/audio2.mp3', name: 'audio2.mp3' }
];

const results = await batchTranscribe(files, 'whisper', 'base');
console.log('Batch results:', results);
```

### Example 3: Model Comparison

```javascript
async function compareModels(audioPath, models) {
  const results = [];

  for (const model of models) {
    const result = await window.electronAPI.transcribe({
      audioPath: audioPath,
      backend: model.backend,
      modelName: model.name
    });

    results.push({
      model: `${model.backend}/${model.name}`,
      text: result.text,
      time: result.processing_time,
      success: result.success
    });
  }

  return results;
}

// Usage
const models = [
  { backend: 'whisper', name: 'base' },
  { backend: 'whisper', name: 'large-v3' },
  { backend: 'voxtral', name: 'Voxtral-Mini-3B-2507' }
];

const comparison = await compareModels('/test.mp3', models);
comparison.forEach(r => {
  console.log(`${r.model}: ${r.time}s - ${r.text.substring(0, 50)}...`);
});
```

### Example 4: Custom Python Backend (Complete)

**File: `backends/custom_backend.py`**

```python
from base import STTBackend
import time
import requests

class CustomBackend(STTBackend):
    """Example custom backend using an external API"""

    def get_info(self):
        return {
            'id': 'custom',
            'name': 'Custom API Backend',
            'description': 'Uses external STT API',
            'company': 'Custom Company'
        }

    def list_models(self):
        return [
            {
                'name': 'api-v1',
                'display_name': 'API Model v1',
                'size': 'Cloud',
                'params': 'N/A',
                'wer': '~7%',
                'installed': True,
                'features': ['transcription'],
                'company': 'Custom Company'
            }
        ]

    def transcribe(self, audio_path, model_name, task='transcribe'):
        start = time.time()

        # Read audio file
        with open(audio_path, 'rb') as f:
            audio_data = f.read()

        # Call external API
        response = requests.post(
            'https://api.example.com/transcribe',
            files={'audio': audio_data},
            data={'model': model_name}
        )

        result = response.json()

        return {
            'text': result['transcription'],
            'processing_time': time.time() - start,
            'language': result.get('language', 'en')
        }

    def download_model(self, model_name):
        # Cloud-based models don't need downloading
        return {'success': True, 'message': 'Cloud model, no download needed'}
```

**Register in `runner.py`:**

```python
from custom_backend import CustomBackend

BACKENDS = {
    # ... existing backends
    'custom': CustomBackend()
}
```

**Use in app:**

```javascript
const result = await window.electronAPI.transcribe({
  audioPath: '/my-audio.mp3',
  backend: 'custom',
  modelName: 'api-v1'
});
```

---

## Performance Tips

### 1. Model Caching

Models are cached after first load. Subsequent transcriptions are faster:

```javascript
// First call: ~5-10s (loads model)
await transcribe({ backend: 'whisper', modelName: 'base', ... });

// Second call: ~1-2s (model cached in memory)
await transcribe({ backend: 'whisper', modelName: 'base', ... });
```

### 2. GPU Acceleration

Most backends support GPU acceleration:

```python
# In your backend
import torch
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
```

GPU is automatically detected and used if available.

### 3. Parallel Processing

For batch processing, run multiple backends in parallel:

```javascript
const promises = files.map(file =>
  window.electronAPI.transcribe({
    audioPath: file.path,
    backend: 'whisper',
    modelName: 'base'
  })
);

const results = await Promise.all(promises);
```

### 4. Audio Preprocessing

Convert audio to optimal format before transcription:

- **Format**: WAV
- **Sample Rate**: 16kHz
- **Channels**: Mono
- **Bit Depth**: 16-bit

```bash
# Using ffmpeg
ffmpeg -i input.mp3 -ar 16000 -ac 1 -sample_fmt s16 output.wav
```

---

## Security Considerations

### 1. File Access

Only user-selected files can be accessed (via dialog):

```javascript
// Safe: User selects file
const result = await window.electronAPI.selectAudioFile();
await window.electronAPI.transcribe({ audioPath: result.filePath, ... });

// Unsafe: Direct path access (not allowed from renderer)
// window.electronAPI.transcribe({ audioPath: '/etc/passwd', ... }); // ❌
```

### 2. Token Storage

HuggingFace tokens are encrypted using OS-level encryption:

- **macOS**: Keychain
- **Windows**: Data Protection API (DPAPI)
- **Linux**: Secret Service API

### 3. Subprocess Isolation

Python processes run in isolated environments with limited permissions.

### 4. Content Security Policy

Strict CSP prevents XSS attacks:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self';">
```

---

## Troubleshooting

### Issue: "Python process failed"

**Cause**: Python not found or venv not activated

**Solution**:
```bash
cd backends
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Issue: "Model not found"

**Cause**: Model not downloaded

**Solution**:
```javascript
await window.electronAPI.downloadModel({
  backend: 'whisper',
  modelName: 'base'
});
```

### Issue: "Out of memory"

**Cause**: Model too large for available RAM

**Solution**: Use a smaller model:
- Whisper: `tiny` (39M) or `base` (74M) instead of `large-v3` (1.5B)
- Voxtral: `Mini-3B` (3B) instead of `Small-24B` (24B)

### Issue: "Transcription too slow"

**Solutions**:
1. Enable GPU acceleration (install CUDA/cuDNN)
2. Use faster models (Whisper Turbo, Parakeet TDT)
3. Reduce audio quality (16kHz mono)

---

## Contributing

Want to contribute a new backend? Check out:
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [GitHub Issues](https://github.com/oddcommunity/VAI-Studio/issues)
- [Discussions](https://github.com/oddcommunity/VAI-Studio/discussions)

---

## License

VAI Studio is open source under the MIT License.

---

## Support

- **Documentation**: https://github.com/oddcommunity/VAI-Studio
- **Issues**: https://github.com/oddcommunity/VAI-Studio/issues
- **Email**: support@vai-studio.com

---

**Last Updated**: November 2025
**API Version**: 3.0.0
