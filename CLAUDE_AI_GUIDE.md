# Claude AI Assistant Guide - LocalVoice AI Project

**Purpose**: This document provides context and guidance for Claude Code AI assistants working on the LocalVoice AI project.

**Last Updated**: 2025-10-20

---

## Project Overview

**LocalVoice AI** is a desktop application (similar to LM Studio) for testing and comparing speech-to-text (STT) models **locally** on your machine. No cloud services, no subscriptions, no data leaving your computer.

Think of it as "LM Studio but for STT models" - a tool for developers to test different speech recognition models before implementing them in production applications.

---

## Current Status

### Version 3.0 - Production Ready ✅

**Status**: 100% Complete - 96/100 Production Score

**Core Features**:
- Multi-backend support (Whisper + Voxtral)
- 15 AI models (13 Whisper + 2 Voxtral)
- Model download manager with progress tracking
- Advanced settings panel with persistence
- Export to TXT/JSON/SRT/VTT formats
- Batch processing with queue management
- Benchmarking suite with real WER calculation
- Auto-update system (electron-updater)
- Beautiful dark mode UI with 30+ animations

**Production Testing**: ✅ Verified with real iPhone m4a audio (151KB file, 3.67 seconds processing time)

---

## Active Development: Alternative STT Model Integration

### Current Work (October 2025)

**Goal**: Integrate 4 additional STT model families beyond Whisper and Voxtral

**Models Under Development**:
1. **NVIDIA Parakeet TDT 0.6B V2** - Ultra-fast (RTF 3386), 6.05% WER ⭐ Priority 1
2. **IBM Granite Speech 3.3** - Multilingual (5 languages), 5.85% WER - Priority 2
3. **Facebook Wav2Vec-BERT** - Low-resource languages, 6-8% WER - Priority 3
4. **NVIDIA Canary Qwen 2.5B** - Best accuracy (5.63% WER), with diarization - Priority 4

**Excluded**: AssemblyAI Universal-2 (cloud-only, no local deployment)

**Reference Document**: See `HANDOFF_STT_MODELS.md` for complete research findings and implementation plan

---

## Architecture Quick Reference

### Technology Stack

**Frontend**:
- HTML, CSS, JavaScript (vanilla, no framework)
- Electron 38.3.0 for desktop app

**Backend**:
- Node.js (main process) - Electron app logic
- Python 3.8+ (subprocess) - STT model inference
- IPC communication between Electron and Python

**STT Engines**:
- OpenAI Whisper / Faster Whisper (13 models)
- Mistral Voxtral (2 models)
- NVIDIA NeMo Toolkit (Parakeet, Canary - in development)
- HuggingFace Transformers (Granite, Wav2Vec-BERT - in development)

**Other Dependencies**:
- ffmpeg (audio processing)
- PyTorch (model inference)
- electron-updater (auto-updates)

---

### Project Structure

```
localvoiceAI/
├── electron/                    # Electron main process
│   └── main.js                 # IPC handlers, Python subprocess management
├── src/                        # Frontend (renderer process)
│   ├── index.html             # Main UI
│   └── app.js                 # UI logic, event handlers
├── backends/                   # Python STT backends
│   ├── base.py                # Abstract base class for all backends
│   ├── whisper_backend.py     # Whisper implementation
│   ├── voxtral_backend.py     # Voxtral implementation
│   └── runner.py              # CLI entry point for Electron subprocess calls
├── assets/                     # Icons, images
├── node_modules/               # NPM dependencies
├── package.json               # NPM config
├── README.md                  # User-facing documentation
├── HANDOFF_STT_MODELS.md      # STT model integration research & plan
└── CLAUDE_AI_GUIDE.md         # This file (AI assistant reference)
```

---

### Multi-Backend Architecture

**Problem**: STT models don't use unified formats (unlike LLMs with GGUF)
- Whisper uses `.bin` files (whisper.cpp)
- Voxtral uses HuggingFace checkpoints (transformers)
- Parakeet/Canary use NVIDIA NeMo (nemo_toolkit)
- Each needs different inference engines

**Solution**: Backend abstraction layer

```
┌─────────────────────────────────────┐
│   Electron Frontend (UI)            │
│   - File selection, model dropdown  │
│   - Transcription display           │
│   - Comparison mode                 │
└─────────────────────────────────────┘
           │ IPC: ipcRenderer.invoke()
           ▼
┌─────────────────────────────────────┐
│   Node.js Backend (Electron main)   │
│   - IPC handlers (ipcMain.handle)   │
│   - Spawns Python subprocesses      │
└─────────────────────────────────────┘
           │ child_process.spawn('python', ...)
           ▼
┌─────────────────────────────────────┐
│   Python Backend Runners            │
│   ┌───────┬─────────┬──────────┐    │
│   │Whisper│ Voxtral │ Parakeet │... │
│   │(.bin) │  (HF)   │  (NeMo)  │    │
│   └───────┴─────────┴──────────┘    │
│   runner.py: CLI dispatcher          │
└─────────────────────────────────────┘
```

---

## Backend Implementation Pattern

All STT backends inherit from `BaseBackend` abstract class:

### Required Methods

```python
class BaseBackend(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str, model_name: str, **kwargs) -> Dict:
        """
        Transcribe audio to text

        Returns:
            {
                'success': bool,
                'text': str,
                'processing_time': float,
                'segments': List[Dict],  # optional, with timestamps
                'language': str,         # optional
                'error': str             # if success=False
            }
        """
        pass

    @abstractmethod
    def benchmark(self, audio_path: str, model_name: str, reference_text: str) -> Dict:
        """
        Benchmark accuracy against reference transcription

        Returns:
            {
                'success': bool,
                'wer': float,  # Word Error Rate (0-100)
                'hypothesis_text': str,
                'reference_text': str,
                'processing_time': float
            }
        """
        pass

    @abstractmethod
    def list_models(self) -> List[Dict]:
        """
        List available models

        Returns:
            [{
                'name': str,
                'size': str,
                'params': str,
                'wer': str,
                'installed': bool,
                'description': str
            }]
        """
        pass

    def _calculate_wer(self, reference: str, hypothesis: str) -> float:
        """
        Calculate Word Error Rate using Levenshtein distance
        (implementation provided in base class)
        """
        pass
```

### Implementation Examples

**Whisper Backend** (simple):
```python
class WhisperBackend(BaseBackend):
    def transcribe(self, audio_path, model_name, **kwargs):
        model = whisper.load_model(model_name)
        result = model.transcribe(audio_path)
        return {
            'success': True,
            'text': result['text'],
            'processing_time': elapsed_time,
            'segments': result.get('segments', []),
            'language': result.get('language', 'unknown')
        }
```

**Voxtral Backend** (transformers):
```python
class VoxtralBackend(BaseBackend):
    def transcribe(self, audio_path, model_name, **kwargs):
        processor = AutoProcessor.from_pretrained(f"mistralai/{model_name}")
        model = VoxtralForConditionalGeneration.from_pretrained(...)

        conversation = [{
            "role": "user",
            "content": [
                {"type": "audio", "path": audio_path},
                {"type": "text", "text": "Transcribe this audio."}
            ]
        }]

        inputs = processor.apply_chat_template(conversation)
        outputs = model.generate(**inputs)
        text = processor.batch_decode(outputs)[0]

        return {'success': True, 'text': text, ...}
```

---

## IPC Communication Flow

### Frontend → Backend

**Frontend** (`src/app.js`):
```javascript
const result = await window.electronAPI.transcribeAudio({
    audioPath: selectedFile.path,
    backend: 'whisper',
    modelName: 'base'
});

console.log(result.text);
```

**Preload** (bridge):
```javascript
// electron/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
    transcribeAudio: (params) => ipcRenderer.invoke('transcribe-audio', params)
});
```

**Main Process** (`electron/main.js`):
```javascript
ipcMain.handle('transcribe-audio', async (event, { audioPath, backend, modelName }) => {
    const process = spawn('python3', [
        'backends/runner.py',
        'transcribe',
        backend,
        audioPath,
        modelName
    ]);

    // Capture stdout (JSON result)
    const result = JSON.parse(stdout);
    return result;
});
```

**Python Runner** (`backends/runner.py`):
```python
import sys
import json

command = sys.argv[1]  # 'transcribe'
backend_type = sys.argv[2]  # 'whisper'
audio_path = sys.argv[3]
model_name = sys.argv[4]

backend = BACKENDS[backend_type]()  # WhisperBackend()
result = backend.transcribe(audio_path, model_name)

print(json.dumps(result))  # Stdout → Electron
```

---

## Key Files to Understand

### 1. `backends/base.py` - Backend Interface
- Abstract base class defining required methods
- `_calculate_wer()` implementation (Levenshtein distance)
- Used by all backends (Whisper, Voxtral, future Parakeet/Canary/Granite/Wav2Vec)

### 2. `backends/runner.py` - CLI Entry Point
- Dispatches commands to appropriate backend
- Commands: `transcribe`, `benchmark`, `list_models`
- Called via subprocess from Electron
- Returns JSON to stdout

### 3. `electron/main.js` - Main Process
- IPC handlers for all frontend actions
- Spawns Python subprocesses
- Manages window lifecycle
- Auto-updater integration

### 4. `src/index.html` + `src/app.js` - UI
- Model Manager (download/manage models)
- Transcription interface
- Comparison mode (side-by-side results)
- Benchmarking suite
- Export functionality

### 5. `HANDOFF_STT_MODELS.md` - Integration Research
- Comprehensive research on 4 new STT models
- Implementation plans with code examples
- Decision points and recommendations
- Testing strategy
- **READ THIS** before implementing new backends

---

## Development Workflow

### Adding a New Backend

**Step 1: Create Backend Class**
```bash
# Create backends/parakeet_backend.py
nano backends/parakeet_backend.py
```

```python
from .base import BaseBackend
from transformers import pipeline
import time

class ParakeetBackend(BaseBackend):
    def __init__(self):
        self.model_cache = {}

    def transcribe(self, audio_path, model_name, **kwargs):
        # Implementation here
        pass

    def benchmark(self, audio_path, model_name, reference_text):
        # Implementation here
        pass

    def list_models(self):
        return [
            {
                'name': 'parakeet-tdt-0.6b-v2',
                'size': '~1.2GB',
                'params': '600M',
                'wer': '6.05%',
                'installed': False,
                'description': 'Ultra-fast ASR'
            }
        ]
```

**Step 2: Register in Runner**
```python
# backends/runner.py
from parakeet_backend import ParakeetBackend

BACKENDS = {
    'whisper': WhisperBackend,
    'voxtral': VoxtralBackend,
    'parakeet': ParakeetBackend,  # ADD THIS
}
```

**Step 3: Test CLI**
```bash
cd /home/claude/localvoiceAI
python3 backends/runner.py transcribe parakeet "Test voice file.m4a" parakeet-tdt-0.6b-v2
```

**Step 4: Update UI**
```html
<!-- src/index.html -->
<select id="backend-select">
    <option value="whisper">Whisper (OpenAI)</option>
    <option value="voxtral">Voxtral (Mistral)</option>
    <option value="parakeet">Parakeet (NVIDIA)</option>
</select>
```

**Step 5: Test in Electron App**
```bash
npm start
# Test transcription with new backend in UI
```

---

## Testing Strategy

### Unit Testing (Backend)
```bash
# Test individual backend
python3 backends/runner.py transcribe whisper "Test voice file.m4a" base

# Test benchmark
python3 backends/runner.py benchmark whisper "Test voice file.m4a" base "reference text"

# Test model listing
python3 backends/runner.py list_models whisper
```

### Integration Testing (Electron + Backend)
```bash
# Run app in dev mode
npm start

# Test workflow:
# 1. Select audio file
# 2. Choose backend and model
# 3. Click "Transcribe"
# 4. Verify result displays correctly
# 5. Test export (TXT, JSON, SRT, VTT)
# 6. Test benchmark mode
# 7. Test comparison mode (3 models side-by-side)
```

### Benchmarking Suite
```bash
# Use built-in benchmarking feature
# Click "Benchmark" button in UI
# Compares model output against reference transcription
# Calculates WER (Word Error Rate)
```

---

## Common Tasks

### Install New Python Dependencies
```bash
# User-level install (breaks system packages on this VPS)
python3 -m pip install --user --break-system-packages package-name

# Example: Install NeMo toolkit for Parakeet/Canary
python3 -m pip install --user --break-system-packages nemo_toolkit[asr]
```

### Run App in Development Mode
```bash
cd /home/claude/localvoiceAI
npm start

# With DevTools enabled
npm start --dev
```

### Build Distributable App
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac    # macOS DMG + ZIP
npm run build:win    # Windows EXE
npm run build:linux  # Linux AppImage + DEB + RPM
```

### Check Installed Models
```bash
# Models are cached in HuggingFace cache directory
ls -lh ~/.cache/huggingface/hub/
```

---

## Important Constraints

### System Environment
- **OS**: Linux (VPS environment)
- **User**: `claude` (non-root)
- **Python**: 3.12.3
- **Working Directory**: `/home/claude/localvoiceAI` (user has write access)
- **Root Directory**: `/root/localvoiceAI` (exists but user lacks write access)

### Python Package Installation
- **Must use**: `python3 -m pip install --user --break-system-packages package-name`
- **Reason**: PEP 668 externally-managed-environment restriction on VPS

### No Virtual Environment
- Not using venv/virtualenv
- All Python packages installed at user level
- Acceptable for VPS development environment

---

## Key Decision Points (Reference for AI Assistants)

### When Adding New STT Models

**Question 1**: NeMo Toolkit or Transformers?
- **NeMo**: Best performance, more complex, ~500MB dependency
- **Transformers**: Lighter, simpler, may have lower performance
- **Recommendation**: Start with transformers, upgrade to NeMo if needed

**Question 2**: Backend Priority?
- **Priority 1**: Parakeet (best speed/accuracy tradeoff)
- **Priority 2**: Granite (multilingual, standard transformers)
- **Priority 3**: Wav2Vec-BERT (niche, easy implementation)
- **Priority 4**: Canary (highest accuracy, highest complexity)

**Question 3**: UI Organization?
- **Current**: Separate backend selector + model dropdown
- **Recommended**: Keep current pattern (minimal changes)
- **Future**: Consider tabs if backends exceed 6

**Question 4**: Model Downloads?
- **Current**: Auto-download on first use (HuggingFace default)
- **Improvement**: Add size warnings in UI for large models (5GB+)

---

## Performance Benchmarks

### Current Models (Production)

| Model | WER | Speed | Size | Use Case |
|-------|-----|-------|------|----------|
| Whisper tiny | ~15% | Instant | 39MB | Quick tests |
| Whisper base | ~10% | Fast | 74MB | Balanced ⭐ |
| Whisper small | ~8% | Medium | 244MB | Better accuracy |
| Whisper medium | ~6% | Slow | 769MB | High accuracy |
| Whisper large-v3 | ~5-8% | Slower | 1.5GB | Highest accuracy |
| Whisper turbo | ~10-12% | Very Fast | 809MB | Speed-focused |
| Voxtral Mini 3B | 6.68% | Medium | 6GB | + Summarization |
| Voxtral Small 24B | 6.31% | Slow | 48GB | Best accuracy |

### New Models (In Development)

| Model | WER | RTF | Size | Status |
|-------|-----|-----|------|--------|
| Parakeet TDT 0.6B | 6.05% | 3386 | 1.2GB | Priority 1 |
| Canary Qwen 2.5B | 5.63% | 418 | 5GB | Priority 4 |
| Granite Speech 3.3 | 5.85% | Medium | 6-7GB | Priority 2 |
| Wav2Vec-BERT | 6-8% | Fast | 600MB | Priority 3 |

**RTF** = Real-Time Factor (higher is faster)

---

## Documentation Files

### User-Facing Documentation
- `README.md` - Main project overview, quick start
- `QUICKSTART.md` - 5-minute setup guide
- `SETUP_GUIDE.md` - Platform-specific installation
- `USER_GUIDE.md` - Complete feature documentation
- `BUILD.md` - Building and distributing the app
- `PRODUCTION_READY.md` - Technical details, testing evidence

### Developer Documentation
- `Claude.md` - Original project specification and roadmap
- `HANDOFF.md` - Previous handoff (environment setup)
- `HANDOFF_STT_MODELS.md` - Current work (STT model integration) ⭐
- `CLAUDE_AI_GUIDE.md` - This file (AI assistant reference)

---

## Tips for Claude Code AI Assistants

### When Working on This Project

1. **Read `HANDOFF_STT_MODELS.md` first** - Contains comprehensive research and implementation plan for current work

2. **Follow existing patterns** - Study `backends/whisper_backend.py` and `backends/voxtral_backend.py` before creating new backends

3. **Test incrementally** - Test each backend via CLI before integrating into UI

4. **Use transformers first** - Simpler than NeMo, validate approach before adding complexity

5. **Update documentation** - When adding features, update README.md and USER_GUIDE.md

6. **Preserve user intent** - This is a **100% local** application. Never suggest cloud APIs or internet-dependent features.

### Code Style

- **Python**: Follow existing backend patterns, use type hints where helpful
- **JavaScript**: Vanilla JS (no frameworks), clear variable names
- **Comments**: Explain "why" not "what"
- **Error handling**: Always return `{'success': False, 'error': str(e)}` on failures

### Common Gotchas

1. **File paths**: Use `/home/claude/localvoiceAI/` not `/root/localvoiceAI/`
2. **Package installs**: Always use `--user --break-system-packages`
3. **IPC communication**: Remember preload script is the security bridge
4. **Model caching**: Models are cached automatically by HuggingFace, don't re-download

---

## Quick Reference Commands

```bash
# Navigate to project
cd /home/claude/localvoiceAI

# Run app
npm start

# Test backend directly
python3 backends/runner.py transcribe whisper "Test voice file.m4a" base

# Install Python package
python3 -m pip install --user --break-system-packages package-name

# Build app
npm run build

# Check logs
tail -f ~/.config/LocalVoiceAI/logs/main.log
```

---

## Contact & Resources

**Project Repository**: https://github.com/oddcommunity/localvoiceAI (when public)

**Key Technologies**:
- Electron: https://www.electronjs.org/
- Whisper: https://github.com/openai/whisper
- Voxtral: https://huggingface.co/mistralai/Voxtral-Mini-3B-2507
- Transformers: https://huggingface.co/docs/transformers/
- NeMo: https://docs.nvidia.com/nemo-framework/

**Inspiration**:
- LM Studio: https://lmstudio.ai/ (UI/UX patterns)
- Ollama: https://ollama.ai/ (model management)

---

## Summary for AI Assistants

**LocalVoice AI** is a production-ready desktop app for testing local STT models. Current focus is integrating 4 additional model families (Parakeet, Canary, Granite, Wav2Vec-BERT) following the existing multi-backend architecture pattern.

**Key files to read**:
1. This file (`CLAUDE_AI_GUIDE.md`) - Project context
2. `HANDOFF_STT_MODELS.md` - Current work details
3. `backends/base.py` - Backend interface
4. `backends/whisper_backend.py` - Simple implementation example
5. `backends/voxtral_backend.py` - Complex implementation example

**Development approach**:
- Start with simplest backend (Parakeet via transformers)
- Test via CLI before UI integration
- Follow existing patterns
- Document as you go
- Test incrementally

**Remember**: This is a **100% local, offline** application. The entire value proposition is privacy and local execution. Never suggest cloud APIs or internet-dependent features.

---

**Good luck with the implementation!** 🚀

---

**Document Version**: 1.0
**Last Updated**: 2025-10-20
**Next Review**: After Parakeet backend integration
