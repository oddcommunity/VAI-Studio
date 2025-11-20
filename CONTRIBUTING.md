# LM Studio for Speech-to-Text Desktop Client

## Vision Statement

Build a desktop application (similar to LM Studio) that allows developers to test, compare, and benchmark local speech-to-text models before implementing them in mobile apps. This tool solves a critical gap: **there is currently no user-friendly desktop client for testing STT models locally.**

## The Problem

You need to test multiple voice-to-text AI models (Whisper, Voxtral, Parakeet, etc.) for:
- **Ability**: Which model works best for your use case (15-20 min voice notes)
- **Speed**: Processing time for long-form audio
- **Accuracy**: Word error rate and transcription quality

**Current Pain Points**:
- LM Studio doesn't support speech-to-text models
- Each model requires different setup (whisper.cpp, transformers, etc.)
- No unified testing interface
- Command-line only options are not user-friendly
- Can't easily compare models side-by-side

## Critical Technical Nuances

### Model Format Reality
**Unlike text LLMs (GGUF/ONNX), STT models DO NOT use a unified format:**

| Model Family | File Format | Inference Engine | Python Library |
|--------------|-------------|------------------|----------------|
| Whisper | `.bin` (proprietary) | whisper.cpp | openai-whisper, faster-whisper |
| Voxtral | GGUF (text part) or HuggingFace | llama.cpp or transformers | transformers, vLLM |
| Parakeet | SafeTensors/PyTorch | ONNX/TensorRT | transformers, nemo_toolkit |
| Wav2Vec | SafeTensors/PyTorch | transformers | transformers |

**Implication**: We CANNOT build a single unified loader. We need a **multi-backend architecture** where each backend handles its own model format.

### Architecture Solution

```
┌─────────────────────────────────────┐
│   Electron Frontend (UI)            │
│   - Drag & drop audio files         │
│   - Model selection                 │
│   - Results display                 │
│   - Comparison view                 │
└─────────────────────────────────────┘
           │ IPC (Inter-Process Communication)
           ▼
┌─────────────────────────────────────┐
│   Node.js Backend (Main Process)    │
│   - Spawn Python processes          │
│   - Manage model state              │
│   - Handle file operations          │
└─────────────────────────────────────┘
           │ subprocess calls
           ▼
┌─────────────────────────────────────┐
│   Python Backend Runners            │
│   ┌───────────┬──────────┬────────┐ │
│   │ Whisper   │ Voxtral  │ Other  │ │
│   │ Backend   │ Backend  │ Models │ │
│   │ (.bin)    │ (HF/GGUF)│        │ │
│   └───────────┴──────────┴────────┘ │
└─────────────────────────────────────┘
```

### Backend Abstraction Layer (Python)

```python
# backends/base.py
from abc import ABC, abstractmethod
from typing import Dict, List

class STTBackend(ABC):
    """Base class for all STT backends"""

    @abstractmethod
    def transcribe(self, audio_path: str, model_name: str) -> Dict:
        """
        Returns: {
            'text': str,
            'processing_time': float,
            'segments': List[Dict],  # optional
            'language': str,  # optional
        }
        """
        pass

    @abstractmethod
    def list_models(self) -> List[Dict]:
        """
        Returns: [{
            'name': str,
            'size': str,  # e.g., "74MB", "1.5GB"
            'params': str,  # e.g., "39M", "1.5B"
            'installed': bool,
        }]
        """
        pass

    @abstractmethod
    def download_model(self, model_name: str) -> None:
        """Download and install a model"""
        pass

# backends/whisper_backend.py
import whisper
import time

class WhisperBackend(STTBackend):
    def transcribe(self, audio_path: str, model_name: str) -> Dict:
        start = time.time()
        model = whisper.load_model(model_name)
        result = model.transcribe(audio_path)

        return {
            'text': result['text'],
            'processing_time': time.time() - start,
            'segments': result.get('segments', []),
            'language': result.get('language', 'unknown')
        }

    def list_models(self) -> List[Dict]:
        models = [
            {'name': 'tiny', 'size': '39MB', 'params': '39M', 'wer': '~15%'},
            {'name': 'base', 'size': '74MB', 'params': '74M', 'wer': '~10%'},
            {'name': 'small', 'size': '244MB', 'params': '244M', 'wer': '~8%'},
            {'name': 'medium', 'size': '769MB', 'params': '769M', 'wer': '~6%'},
            {'name': 'large-v3', 'size': '1.5GB', 'params': '1.5B', 'wer': '~5-8%'},
            {'name': 'turbo', 'size': '809MB', 'params': '809M', 'wer': '~10-12%'},
        ]
        # Check which are installed
        for model in models:
            model['installed'] = self._is_installed(model['name'])
        return models

# backends/voxtral_backend.py
from transformers import VoxtralForConditionalGeneration, AutoProcessor
import torch

class VoxtralBackend(STTBackend):
    def transcribe(self, audio_path: str, model_name: str) -> Dict:
        start = time.time()

        device = "cuda" if torch.cuda.is_available() else "cpu"
        repo_id = f"mistralai/{model_name}"

        processor = AutoProcessor.from_pretrained(repo_id)
        model = VoxtralForConditionalGeneration.from_pretrained(
            repo_id,
            torch_dtype=torch.bfloat16,
            device_map=device
        )

        conversation = [{
            "role": "user",
            "content": [
                {"type": "audio", "path": audio_path},
                {"type": "text", "text": "Transcribe this audio."}
            ]
        }]

        inputs = processor.apply_chat_template(conversation)
        outputs = model.generate(**inputs, max_new_tokens=500)
        result = processor.batch_decode(outputs, skip_special_tokens=True)[0]

        return {
            'text': result,
            'processing_time': time.time() - start,
            'language': 'auto-detected'
        }

    def list_models(self) -> List[Dict]:
        return [
            {
                'name': 'Voxtral-Mini-3B-2507',
                'size': '~6GB',
                'params': '3B',
                'wer': '6.68%',
                'features': ['transcription', 'summarization', 'Q&A']
            },
            {
                'name': 'Voxtral-Small-24B-2507',
                'size': '~48GB',
                'params': '24B',
                'wer': '6.31%',
                'features': ['transcription', 'summarization', 'Q&A']
            }
        ]

# main runner script
# backends/runner.py
import sys
import json
from whisper_backend import WhisperBackend
from voxtral_backend import VoxtralBackend

def main():
    command = sys.argv[1]  # 'transcribe', 'list_models', 'download'
    backend_type = sys.argv[2]  # 'whisper', 'voxtral'

    backends = {
        'whisper': WhisperBackend(),
        'voxtral': VoxtralBackend(),
    }

    backend = backends[backend_type]

    if command == 'transcribe':
        audio_path = sys.argv[3]
        model_name = sys.argv[4]
        result = backend.transcribe(audio_path, model_name)
        print(json.dumps(result))

    elif command == 'list_models':
        models = backend.list_models()
        print(json.dumps(models))

    elif command == 'download':
        model_name = sys.argv[3]
        backend.download_model(model_name)

if __name__ == '__main__':
    main()
```

## Electron Application Structure

```
localvoiceAI/
├── package.json
├── electron/
│   ├── main.js                 # Electron main process
│   ├── preload.js             # Bridge between main and renderer
│   └── ipc-handlers.js        # IPC message handlers
├── src/                       # Frontend (React/Vue/vanilla JS)
│   ├── index.html
│   ├── app.js
│   ├── components/
│   │   ├── AudioDropZone.js
│   │   ├── ModelSelector.js
│   │   ├── TranscriptionView.js
│   │   └── ComparisonView.js
│   └── styles/
│       └── main.css
├── backends/                  # Python STT backends
│   ├── requirements.txt
│   ├── base.py
│   ├── whisper_backend.py
│   ├── voxtral_backend.py
│   └── runner.py
└── build/                     # Electron packager output
    ├── mac/
    ├── win/
    └── linux/
```

## Version Roadmap

---

## VERSION 1.0 - MVP (Target: 1-2 Days)

**Goal**: Basic functional tool for testing Whisper models on your own computer

### Features
- ✅ Drag and drop audio files (WAV, MP3, M4A)
- ✅ Support Whisper models (tiny, base, small, medium, large-v3, turbo)
- ✅ Display transcription results
- ✅ Show processing time
- ✅ Basic model selection dropdown

### Todo List - Version 1.0

#### Day 1: Setup & Core Functionality (4-6 hours)

- [ ] **Project Setup**
  - [ ] Initialize npm project (`npm init`)
  - [ ] Install Electron dependencies
    ```bash
    npm install electron electron-builder
    npm install --save-dev electron-rebuild
    ```
  - [ ] Create basic folder structure (electron/, src/, backends/)
  - [ ] Set up Python virtual environment
    ```bash
    cd backends
    python3 -m venv venv
    source venv/bin/activate  # or venv\Scripts\activate on Windows
    pip install openai-whisper
    ```

- [ ] **Electron Main Process** (`electron/main.js`)
  - [ ] Create basic Electron window (800x600)
  - [ ] Enable developer tools
  - [ ] Set up window ready event
  - [ ] Configure security (nodeIntegration: false, contextIsolation: true)

- [ ] **Frontend UI** (`src/index.html`)
  - [ ] Create drag-and-drop zone for audio files
  - [ ] Add model selection dropdown (hardcode Whisper models)
  - [ ] Create transcription display area
  - [ ] Add basic styling (can be minimal)

- [ ] **Python Backend** (`backends/whisper_backend.py`)
  - [ ] Implement WhisperBackend class
  - [ ] Create `transcribe()` method
  - [ ] Create `list_models()` method
  - [ ] Create runner.py to handle command-line calls

- [ ] **IPC Communication** (`electron/ipc-handlers.js`)
  - [ ] Set up handler for 'transcribe-audio' event
  - [ ] Spawn Python subprocess with audio file path
  - [ ] Capture Python output (JSON)
  - [ ] Send result back to renderer

#### Day 2: Integration & Testing (4-6 hours)

- [ ] **File Handling**
  - [ ] Implement file dialog for selecting audio
  - [ ] Validate file types (WAV, MP3, M4A)
  - [ ] Copy uploaded file to temp directory
  - [ ] Pass file path to Python backend

- [ ] **Process Management**
  - [ ] Add loading indicator during transcription
  - [ ] Handle Python process errors
  - [ ] Display error messages in UI
  - [ ] Add cancel button to stop processing

- [ ] **Results Display**
  - [ ] Show transcribed text in scrollable area
  - [ ] Display processing time
  - [ ] Show audio file name and duration
  - [ ] Add copy-to-clipboard button

- [ ] **Testing**
  - [ ] Test with 1-minute audio file
  - [ ] Test with 5-minute audio file
  - [ ] Test with 15-minute audio file (your use case)
  - [ ] Test error cases (invalid file, missing model)

- [ ] **Documentation**
  - [ ] Write README with setup instructions
  - [ ] Document how to run the app (`npm start`)
  - [ ] List required dependencies

### Success Criteria for V1
- ✅ Can drag-drop or select an audio file
- ✅ Can choose a Whisper model
- ✅ Transcription completes successfully
- ✅ Results are displayed in UI
- ✅ Processing time is shown
- ✅ Works on your development machine

---

## VERSION 2.0 - Multi-Backend & Comparison (Target: 1 Week)

**Goal**: Support multiple STT model families and enable side-by-side comparison

### Features
- ✅ Support Voxtral models (Mini, Small)
- ✅ Support additional models (Parakeet, Canary, etc.)
- ✅ Side-by-side model comparison
- ✅ Performance metrics (WER estimate, speed)
- ✅ Model download manager
- ✅ Batch processing (multiple files)

### Todo List - Version 2.0

#### Days 1-2: Multi-Backend Architecture

- [ ] **Backend Abstraction**
  - [ ] Create abstract base class (`backends/base.py`)
  - [ ] Refactor WhisperBackend to inherit from base
  - [ ] Implement VoxtralBackend class
  - [ ] Add backend registry/factory pattern
  - [ ] Update runner.py to support multiple backends

- [ ] **Model Management**
  - [ ] Create model info database (JSON file)
    - Model name, size, params, WER, features
  - [ ] Implement model detection (check if installed)
  - [ ] Add model download functionality
  - [ ] Show download progress in UI

- [ ] **UI Updates**
  - [ ] Group models by backend in dropdown
  - [ ] Add backend selector (Whisper, Voxtral, etc.)
  - [ ] Display model info (size, params, WER) on hover
  - [ ] Add "Install Model" button for uninstalled models

#### Days 3-4: Comparison Features

- [ ] **Comparison Mode**
  - [ ] Add "Compare Models" checkbox
  - [ ] Allow selection of 2-3 models simultaneously
  - [ ] Run transcriptions in parallel (or sequential)
  - [ ] Display results side-by-side in split view

- [ ] **Performance Metrics**
  - [ ] Calculate and display:
    - Processing time
    - Audio duration
    - Real-time factor (RTF = processing_time / audio_duration)
  - [ ] Estimate accuracy (if reference text provided)
  - [ ] Show resource usage (memory, CPU/GPU)

- [ ] **Enhanced Results View**
  - [ ] Tabbed interface for multiple results
  - [ ] Highlight differences between transcriptions
  - [ ] Show timestamps for segments (if available)
  - [ ] Export comparison as JSON or CSV

#### Day 5: Polish & Testing

- [ ] **User Experience**
  - [ ] Add settings panel (model paths, GPU settings)
  - [ ] Implement recent files list
  - [ ] Add keyboard shortcuts (Cmd+O for open, etc.)
  - [ ] Improve loading states and progress bars

- [ ] **Error Handling**
  - [ ] Graceful handling of out-of-memory errors
  - [ ] Better error messages for missing dependencies
  - [ ] Fallback to CPU if GPU unavailable
  - [ ] Retry logic for failed downloads

- [ ] **Testing**
  - [ ] Test all supported models
  - [ ] Test comparison mode with 2-3 models
  - [ ] Test with various audio formats
  - [ ] Performance testing with long audio (20+ min)

### Success Criteria for V2
- ✅ Can switch between Whisper and Voxtral backends
- ✅ Can compare 2-3 models side-by-side
- ✅ Model download works reliably
- ✅ Performance metrics are accurate
- ✅ Handles errors gracefully

---

## VERSION 3.0 - Production Ready & Shareable (Target: 2-3 Weeks)

**Goal**: Polished application that others can download and use (like LM Studio)

### Features
- ✅ Professional UI/UX
- ✅ Installer packages (DMG, EXE, AppImage)
- ✅ Auto-updates
- ✅ Advanced features (batch processing, export formats)
- ✅ Cloud API integration (optional)
- ✅ Benchmarking suite
- ✅ Plugin system for community backends

### Todo List - Version 3.0

#### Week 1: Advanced Features

- [ ] **Batch Processing**
  - [ ] Support multiple file upload
  - [ ] Queue management system
  - [ ] Process files sequentially or in parallel
  - [ ] Aggregate results view

- [ ] **Export Functionality**
  - [ ] Export as plain text (.txt)
  - [ ] Export as JSON (with metadata)
  - [ ] Export as SRT subtitles
  - [ ] Export as VTT (WebVTT)
  - [ ] Export comparison reports (PDF/HTML)

- [ ] **Advanced Settings**
  - [ ] GPU selection (if multiple GPUs)
  - [ ] Quantization options (int8, fp16, fp32)
  - [ ] Language selection
  - [ ] Custom model paths
  - [ ] Prompt templates for Voxtral

- [ ] **Benchmarking Suite**
  - [ ] Built-in test audio samples
  - [ ] Reference transcriptions for accuracy testing
  - [ ] Automated WER calculation
  - [ ] Generate benchmark reports
  - [ ] Compare against historical benchmarks

#### Week 2: Packaging & Distribution

- [ ] **Application Packaging**
  - [ ] Configure electron-builder for all platforms
  - [ ] Include Python runtime in package (pyinstaller or similar)
  - [ ] Bundle required models (tiny/base for quick start)
  - [ ] Create installer scripts
  - [ ] Code signing (macOS/Windows)

- [ ] **Cross-Platform Testing**
  - [ ] Test on macOS (Intel and Apple Silicon)
  - [ ] Test on Windows 10/11
  - [ ] Test on Linux (Ubuntu, Fedora)
  - [ ] Fix platform-specific bugs

- [ ] **Auto-Update System**
  - [ ] Integrate electron-updater
  - [ ] Set up update server (GitHub Releases)
  - [ ] Implement update notifications
  - [ ] Test update workflow

- [ ] **Documentation**
  - [ ] User guide (getting started)
  - [ ] Model comparison guide
  - [ ] Troubleshooting FAQ
  - [ ] Video tutorials (optional)

#### Week 3: Polish & Community Features

- [ ] **UI/UX Polish**
  - [ ] Professional design (hire designer or use template)
  - [ ] Dark mode support
  - [ ] Animations and transitions
  - [ ] Accessibility features (screen reader support)
  - [ ] Internationalization (i18n) setup

- [ ] **Cloud API Integration** (Optional)
  - [ ] Support OpenAI Whisper API
  - [ ] Support AssemblyAI
  - [ ] Support Deepgram
  - [ ] Cost tracking for API usage
  - [ ] Compare local vs cloud results

- [ ] **Plugin System**
  - [ ] Define plugin API spec
  - [ ] Create plugin loader
  - [ ] Example plugin implementation
  - [ ] Plugin marketplace (future)

- [ ] **Telemetry & Analytics** (Optional, Privacy-Focused)
  - [ ] Anonymous usage statistics
  - [ ] Crash reporting (Sentry or similar)
  - [ ] Opt-in only
  - [ ] Privacy policy

- [ ] **Beta Testing & Feedback**
  - [ ] Release beta to 10-20 users
  - [ ] Collect feedback via GitHub issues
  - [ ] Iterate on UI/UX based on feedback
  - [ ] Fix critical bugs

#### Final Steps

- [ ] **Marketing & Launch**
  - [ ] Create landing page
  - [ ] Write launch blog post
  - [ ] Submit to ProductHunt, HackerNews
  - [ ] Create demo video
  - [ ] Social media announcements

- [ ] **Community Setup**
  - [ ] GitHub repository (public)
  - [ ] Discord or Slack community
  - [ ] Contribution guidelines
  - [ ] Roadmap for future versions

### Success Criteria for V3
- ✅ Professional, polished UI
- ✅ Works out-of-the-box on all platforms
- ✅ Easy installation (drag to Applications, run installer)
- ✅ Auto-updates work reliably
- ✅ Positive user feedback from beta testers
- ✅ Ready for public distribution

---

## Technical Implementation Details

### IPC (Inter-Process Communication) Pattern

```javascript
// electron/main.js
const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

ipcMain.handle('transcribe-audio', async (event, { audioPath, backend, modelName }) => {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(__dirname, '../backends/venv/bin/python');
    const scriptPath = path.join(__dirname, '../backends/runner.py');

    const process = spawn(pythonPath, [
      scriptPath,
      'transcribe',
      backend,
      audioPath,
      modelName
    ]);

    let result = '';
    let error = '';

    process.stdout.on('data', (data) => {
      result += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(result);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse result: ' + e.message));
        }
      } else {
        reject(new Error(error || 'Python process failed'));
      }
    });
  });
});
```

### Frontend Example (Vanilla JS)

```javascript
// src/app.js
const dropZone = document.getElementById('drop-zone');
const modelSelect = document.getElementById('model-select');
const transcribeBtn = document.getElementById('transcribe-btn');
const resultDiv = document.getElementById('result');

let selectedFile = null;

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  selectedFile = e.dataTransfer.files[0];
  dropZone.textContent = `Selected: ${selectedFile.name}`;
});

transcribeBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('Please select an audio file');
    return;
  }

  const backend = 'whisper';  // or get from UI
  const modelName = modelSelect.value;

  resultDiv.textContent = 'Processing...';

  try {
    const result = await window.electronAPI.transcribeAudio({
      audioPath: selectedFile.path,
      backend,
      modelName
    });

    resultDiv.textContent = result.text;
    console.log(`Processed in ${result.processing_time}s`);
  } catch (error) {
    resultDiv.textContent = `Error: ${error.message}`;
  }
});
```

### Preload Script (Security Bridge)

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  transcribeAudio: (params) => ipcRenderer.invoke('transcribe-audio', params),
  listModels: (backend) => ipcRenderer.invoke('list-models', { backend }),
  downloadModel: (backend, modelName) => ipcRenderer.invoke('download-model', { backend, modelName }),
});
```

## Packaging Configuration

```json
// package.json
{
  "name": "localvoice-ai",
  "version": "1.0.0",
  "description": "LM Studio for Speech-to-Text",
  "main": "electron/main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.localvoiceai.app",
    "productName": "LocalVoiceAI",
    "files": [
      "electron/**/*",
      "src/**/*",
      "backends/**/*"
    ],
    "extraResources": [
      {
        "from": "backends/venv",
        "to": "backends/venv",
        "filter": ["**/*"]
      }
    ],
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": ["dmg", "zip"],
      "icon": "assets/icon.icns"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Development"
    }
  },
  "dependencies": {
    "electron": "^28.0.0"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0"
  }
}
```

## Model Comparison Data (from Research)

### Recommended Models for Testing

| Model | WER | Params | Size | Speed | Mobile Ready | Built-in Summary |
|-------|-----|--------|------|-------|--------------|------------------|
| **Voxtral Mini** | 6.68% | 3B | ~6GB | Medium | ✅ Yes | ✅ Yes |
| **Whisper Large V3** | 6.77% | 1.5B | 1.5GB | Fast | ✅ Yes | ❌ No |
| **Whisper Turbo** | 10-12% | 809M | 809MB | Very Fast | ✅ Yes | ❌ No |
| **Parakeet TDT** | 6.05% | 600M | ~1.2GB | Very Fast | ✅ Yes | ❌ No |
| **Canary Qwen** | 5.63% | 2.5B | ~5GB | Medium | ⚠️ Maybe | ❌ No |
| Whisper Base | ~10% | 74M | 74MB | Very Fast | ✅ Yes | ❌ No |
| Whisper Tiny | ~15% | 39M | 39MB | Instant | ✅ Yes | ❌ No |

### For Your PrivateLead Use Case (15-20 min voice notes):

**Primary Recommendation**: **Voxtral Mini**
- Best accuracy + built-in summarization
- Single pass for transcription + summary
- No need for separate Llama.cpp on mobile

**Fallback**: **Whisper Large V3 Turbo**
- Proven, stable, well-documented
- Smaller size, better mobile compatibility
- Requires separate summarization step

## Next Steps

### Immediate Actions (This Week)

1. **Environment Setup** (Today)
   - [ ] Install Node.js and npm
   - [ ] Install Python 3.9+
   - [ ] Clone this repository
   - [ ] Review this Claude.md file

2. **Start Version 1.0** (Tomorrow)
   - [ ] Follow Day 1 todo list
   - [ ] Get basic Electron window running
   - [ ] Test Python subprocess communication

3. **Record Test Audio** (This Week)
   - [ ] Record 2-3 voice notes (15-20 min each)
   - [ ] Convert to WAV format (16kHz, mono)
   - [ ] Use these for testing all models

### Decision Points

**Before starting V1**:
- [ ] Choose UI framework (Vanilla JS, React, Vue) - Recommend vanilla for speed
- [ ] Decide on Python distribution method (bundled venv vs user install)

**After V1 complete**:
- [ ] Evaluate: Did it save you time testing models?
- [ ] Decision: Continue to V2 or pivot based on learnings

**After V2 complete**:
- [ ] Evaluate: Is this useful for others?
- [ ] Decision: Build V3 for public release or keep private

## Resources & References

### Key Technologies
- **Electron**: https://www.electronjs.org/docs/latest/
- **Electron Builder**: https://www.electron.build/
- **Whisper**: https://github.com/openai/whisper
- **Voxtral**: https://huggingface.co/mistralai/Voxtral-Mini-3B-2507

### Inspiration
- **LM Studio**: https://lmstudio.ai (for UI/UX reference)
- **Ollama**: https://ollama.ai (for model management patterns)

### Community
- **Discord**: (Create one for V3)
- **GitHub**: (Public repo for V3)

---

## Summary

This project solves a real problem: **no desktop tool exists for easily testing local STT models.** By building this in phases (V1 → V2 → V3), you can:

1. **Immediately** solve your own need (test models for PrivateLead)
2. **Quickly** expand to support multiple models
3. **Eventually** release a tool that helps the entire developer community

**Start with V1, iterate based on real usage, and scale if validated.**
