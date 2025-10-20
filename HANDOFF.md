# Project Handoff Document - LocalVoiceAI
**Date**: 2025-10-17
**Status**: In Progress - Python environment complete, ready to build application
**Goal**: Build an "LM Studio for Speech-to-Text" desktop app (push toward Version 2.0)

---

## What We're Building

A desktop application that allows testing and comparing speech-to-text models (Whisper, Voxtral, etc.) locally before implementing them in mobile apps. Think "LM Studio but for STT models."

### User's Primary Need
- Test multiple STT models for a mobile app (PrivateLead) that records 15-20 minute voice notes
- Compare ability, speed, and accuracy
- No existing tool does this - LM Studio doesn't support STT

---

## Critical Decisions Made

### 1. **Target**: Version 2.0
- **V1.0**: Basic Whisper support (Completed foundation setup)
- **V2.0**: Multi-backend (Whisper + Voxtral) with comparison features (TARGET)
- **V3.0**: Production-ready with installers (Future)

### 2. **Autonomous Decisions Approved**
- User wants minimal questions - I make reasonable technical choices
- Document all decisions for review later
- Prefer simple solutions (vanilla JS over frameworks)

### 3. **Environment Strategy**
- **Portable Node.js**: Installed locally in `/root/localvoiceAI/nodejs/` (no system install needed)
- **Python packages**: Installed with `--break-system-packages` flag (PEP 668 workaround)
- **No virtual env**: Using system Python with user-installed packages

---

## Progress Completed ✅

### Environment Setup (100% Complete)
1. ✅ **Node.js 20.11.0** - Portable installation at `./nodejs/`
2. ✅ **npm 10.2.4** - Working with PATH set
3. ✅ **Python 3.12.3** - System installation
4. ✅ **pip 25.2** - User-installed with break-system-packages
5. ✅ **Electron 38.3.0** - Installed via npm
6. ✅ **Python STT packages** - ALL installed successfully:
   - `openai-whisper` (latest)
   - `torch 2.9.0` (with CUDA 12.8 support)
   - `torchaudio 2.9.0`
   - `transformers 4.57.1`
   - `accelerate 1.10.1`
   - All NVIDIA CUDA dependencies (cublas, cudnn, etc.)

### Project Structure Created
```
/root/localvoiceAI/
├── nodejs/              ✅ Portable Node.js installation
├── node_modules/        ✅ Electron and dependencies
├── package.json         ✅ NPM project config
├── electron/            ✅ Created (empty)
├── src/                 ✅ Created (empty)
├── backends/            ✅ Created (contains get-pip.py)
├── assets/              ✅ Created (empty)
├── Claude.md            ✅ Complete project spec
└── HANDOFF.md           ✅ This file
```

---

## Next Steps (In Order of Priority)

### Immediate Tasks (Start Here)
1. **Create Python Backend Classes** (`backends/` folder)
   - `base.py` - Abstract base class for all STT backends
   - `whisper_backend.py` - Whisper implementation
   - `voxtral_backend.py` - Voxtral implementation
   - `runner.py` - CLI script that Electron calls via subprocess

2. **Build Electron Application**
   - `electron/main.js` - Main process (window management, IPC)
   - `electron/preload.js` - Security bridge
   - `electron/ipc-handlers.js` - Handle Python subprocess calls

3. **Create Frontend UI** (`src/` folder)
   - `src/index.html` - Main UI structure
   - `src/app.js` - JavaScript for drag-drop, transcription
   - `src/styles.css` - Clean, functional styling

4. **Implement Core Features**
   - Drag-and-drop audio file upload
   - Model selection dropdown (Whisper models)
   - Transcription display
   - Processing indicators

5. **Add Multi-Backend Support**
   - Backend selector (Whisper vs Voxtral)
   - Model management (detect installed, download new)
   - Comparison mode (side-by-side results)

### Testing & Polish
6. Test with actual audio files (need to create or download samples)
7. Error handling and edge cases
8. Write comprehensive README
9. Document design decisions

---

## Architecture Overview

### Multi-Backend Pattern (Key Technical Decision)

**Problem**: STT models don't use unified formats like GGUF
- Whisper uses `.bin` files (whisper.cpp)
- Voxtral uses HuggingFace/GGUF (transformers)
- Each needs different inference engines

**Solution**: Backend abstraction layer

```
┌─────────────────────┐
│  Electron Frontend  │  (Vanilla JS)
└─────────────────────┘
         │ IPC
         ▼
┌─────────────────────┐
│   Node.js Backend   │  (subprocess management)
└─────────────────────┘
         │ spawn Python
         ▼
┌─────────────────────┐
│  Python Backends    │
│  ┌──────┬────────┐  │
│  │Whisper│Voxtral │  │
│  │.bin  │HF/GGUF │  │
│  └──────┴────────┘  │
└─────────────────────┘
```

### Python Backend Interface

```python
class STTBackend(ABC):
    @abstractmethod
    def transcribe(audio_path: str, model: str) -> dict:
        """Returns: {text, processing_time, segments, language}"""
        pass

    @abstractmethod
    def list_models() -> list:
        """Returns: [{name, size, params, wer, installed}]"""
        pass

    @abstractmethod
    def download_model(model_name: str) -> None:
        pass
```

### IPC Communication Pattern

```javascript
// Frontend calls via preload bridge
const result = await window.electronAPI.transcribe({
  audioPath: '/path/to/audio.wav',
  backend: 'whisper',
  modelName: 'base'
});

// Main process spawns Python
const python = spawn('python3', [
  'backends/runner.py',
  'transcribe',
  backend,
  audioPath,
  modelName
]);

// Returns JSON result
{
  "text": "Transcribed text here...",
  "processing_time": 12.5,
  "language": "en"
}
```

---

## Key Files to Reference

1. **`/root/localvoiceAI/Claude.md`**
   - Complete project specification
   - Version roadmaps (V1, V2, V3)
   - Model comparison data
   - Technical architecture details
   - ~15,000 words of context

2. **`/root/localvoiceAI/A big feature in the mobile apps that I'm building.pdf`**
   - User's original research
   - Model benchmarks (Whisper vs Voxtral)
   - Mobile implementation strategies
   - 29 pages of STT model comparisons

---

## Important Commands

### Running the App
```bash
cd /root/localvoiceAI
export PATH="/root/localvoiceAI/nodejs/bin:$PATH"
npm start
```

### Python Testing
```bash
python3 backends/runner.py transcribe whisper /path/to/audio.wav base
```

### Install Additional Packages
```bash
# Node packages
export PATH="/root/localvoiceAI/nodejs/bin:$PATH"
npm install package-name

# Python packages
python3 -m pip install --user --break-system-packages package-name
```

---

## Model Recommendations (from Research)

### For User's Mobile App (PrivateLead)

**Primary: Voxtral Mini (3B)**
- WER: 6.68% (best accuracy)
- Built-in summarization (no separate LLM needed)
- 32K context (handles 40 min audio)
- Apache 2.0 license
- Ideal for 15-20 min voice notes

**Fallback: Whisper Large V3 Turbo**
- WER: 10-12%
- Smaller size (809MB vs 6GB)
- Better mobile compatibility
- Requires separate summarization step

### For Desktop Testing Tool

Support both Whisper and Voxtral to compare:

**Whisper Models**:
- tiny (39MB, ~15% WER)
- base (74MB, ~10% WER)
- small (244MB, ~8% WER)
- medium (769MB, ~6% WER)
- large-v3 (1.5GB, ~5-8% WER)
- turbo (809MB, ~10-12% WER)

**Voxtral Models**:
- Mini-3B (6GB, 6.68% WER)
- Small-24B (48GB, 6.31% WER)

---

## Current Todo List Status

✅ **Completed (Tasks 1-5)**
1. Check and install system dependencies (Node.js, Python)
2. Create project structure and initialize npm project
3. Install Electron and build dependencies
4. Set up Python environment (using --break-system-packages)
5. Install Python packages (whisper, transformers, torch, etc.)

⏳ **Next Up (Tasks 6-10)**
6. Create Python backend base class and abstraction
7. Implement WhisperBackend class
8. Implement VoxtralBackend class
9. Create Python runner script for subprocess calls
10. Build Electron main process (main.js)

🔜 **Pending (Tasks 11-24)**
11. Create preload script for security bridge
12. Build frontend HTML structure
13. Create frontend JavaScript (drag-drop, UI logic)
14. Add CSS styling for clean UI
15. Implement IPC handlers for transcription
16. Add model listing and selection
17. Implement comparison mode UI
18. Add performance metrics display
19. Create model download manager
20. Add error handling and validation
21. Test with sample audio file
22. Write comprehensive README.md
23. Document design decisions in DECISIONS.md
24. Create QUICKSTART.md guide

---

## Design Decisions to Document

As you build, document these in `DECISIONS.md`:

1. **Why vanilla JavaScript?**
   - Faster to build, no framework overhead
   - User approved "make reasonable decisions" - simplicity wins

2. **Why no virtual environment?**
   - PEP 668 restrictions on this system
   - Using --break-system-packages is acceptable for VPS
   - Portable Node.js means app is still self-contained

3. **Why spawn Python subprocesses?**
   - Clean separation of concerns
   - Each backend can have different dependencies
   - Easy to debug - can test Python scripts independently
   - Avoids N-API/native module complexity

4. **UI choices?**
   - Document any major UI decisions
   - Color schemes, layout rationale
   - Inspired by LM Studio's clean, functional design

---

## Known Issues & Considerations

### 1. **Large Package Size**
- PyTorch alone is 900MB
- CUDA libraries add another 3GB+
- Total Python packages: ~4-5GB
- **Solution for distribution**: Bundle minimal models (tiny/base) for initial download

### 2. **GPU Support**
- CUDA 12.8 support is installed
- Will use GPU if available, falls back to CPU
- Need to handle both cases gracefully in UI

### 3. **Audio Format Support**
- Whisper supports: WAV, MP3, M4A, FLAC, OGG
- Need ffmpeg for some formats (might require additional install)
- Document requirements clearly in README

### 4. **Model Downloads**
- Whisper models download from HuggingFace automatically on first use
- Need progress indicators for large downloads
- Consider pre-downloading tiny/base models to bundle

### 5. **Voxtral Testing**
- Voxtral Mini is 6GB - may take time to download
- Requires more RAM than Whisper (8GB+ recommended)
- Document system requirements

---

## Testing Strategy

### When App is Functional

1. **Create/Download Test Audio**
   - 1 min sample (quick tests)
   - 5 min sample (medium tests)
   - 15-20 min sample (real-world use case)
   - Download from: https://www.voiptroubleshooter.com/open_speech/

2. **Test Matrix**
   - ✅ Whisper tiny (fast, lower accuracy)
   - ✅ Whisper base (balanced)
   - ✅ Whisper large-v3 (best accuracy)
   - ✅ Voxtral Mini (if time permits)

3. **Comparison Tests**
   - Same audio through 2-3 models
   - Compare transcription accuracy
   - Measure processing times
   - Document results

---

## Success Criteria for Handoff

### Minimum (V1.0 Complete)
- ✅ Electron app launches
- ✅ Can drag-drop or select audio file
- ✅ Whisper base model transcribes successfully
- ✅ Results display in UI
- ✅ Basic error handling works

### Target (V2.0 Core)
- ✅ Whisper backend fully functional (all models)
- ✅ Voxtral backend implemented
- ✅ Can switch between backends
- ✅ Side-by-side comparison works
- ✅ Performance metrics shown

### Stretch (V2.0 Complete)
- ✅ Model download manager
- ✅ Batch processing
- ✅ Advanced metrics
- ✅ Comprehensive documentation

---

## Resources for Next Engineer

### Code Examples in Claude.md
- Complete backend class implementations
- IPC communication patterns
- Frontend examples
- Electron configuration

### External Docs
- **Electron**: https://www.electronjs.org/docs/latest/
- **Whisper**: https://github.com/openai/whisper
- **Voxtral**: https://huggingface.co/mistralai/Voxtral-Mini-3B-2507
- **Transformers**: https://huggingface.co/docs/transformers/

### User Preferences
- Wants minimal interruptions (no permission prompts)
- Values speed and pragmatism over perfection
- Needs this for real mobile app development
- Will test with actual 15-20 min voice recordings

---

## Questions for User (If Needed)

Only ask if critical:
1. Do you have sample audio files, or should we download test data?
2. Any specific audio format preferences? (WAV, MP3, etc.)
3. Should we support real-time transcription or post-recording only?
4. Any UI design preferences or screenshots to reference?

---

## Final Notes

**Current State**: Solid foundation complete. All dependencies installed. Ready to build the actual application.

**Next Engineer Should**: Start with backend Python classes (tasks 6-9), then move to Electron (tasks 10-11), then frontend (tasks 12-14). Test incrementally at each stage.

**Estimated Time to V2.0**: 6-10 hours of focused development from this point.

**User's Sleep Schedule**: They went to sleep expecting the app to be functional when they wake up. Push toward V2.0 but ensure V1.0 works reliably first.

---

**Good luck! All the hard environment setup is done. Now it's time to build. 🚀**
