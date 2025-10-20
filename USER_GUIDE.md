# LocalVoice AI - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Features](#features)
5. [Model Manager](#model-manager)
6. [Advanced Settings](#advanced-settings)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Introduction

**LocalVoice AI** is a desktop application for testing and comparing speech-to-text (STT) models locally. Think of it as "LM Studio for Speech-to-Text" - everything runs on your machine with no cloud dependency.

### Key Features

- **Multi-Backend Support**: Test Whisper and Voxtral models
- **Side-by-Side Comparison**: Compare up to 3 models simultaneously
- **Multiple Export Formats**: TXT, JSON, SRT, VTT
- **Batch Processing**: Transcribe multiple files in one go
- **Model Management**: Download and manage models easily
- **100% Local**: No internet required for transcription

---

## Installation

### Prerequisites

- **Operating System**: macOS, Windows, or Linux
- **Python 3.8+**: Required for backend processing
- **Disk Space**: At least 5GB for models
- **RAM**: 8GB minimum (16GB recommended for larger models)
- **GPU** (Optional): NVIDIA GPU with CUDA support for faster processing

### Installation Steps

#### Option 1: Download Pre-built Package

1. Download the latest release for your platform:
   - **macOS**: `LocalVoice-AI-{version}.dmg`
   - **Windows**: `LocalVoice-AI-Setup-{version}.exe`
   - **Linux**: `LocalVoice-AI-{version}.AppImage`

2. Install the application:
   - **macOS**: Open DMG and drag to Applications
   - **Windows**: Run installer and follow prompts
   - **Linux**: Make executable and run: `chmod +x LocalVoice-AI*.AppImage && ./LocalVoice-AI*.AppImage`

3. Launch LocalVoice AI from your applications menu

#### Option 2: Build from Source

```bash
# Clone repository
git clone https://github.com/yourusername/localvoice-ai.git
cd localvoice-ai

# Install Node dependencies
npm install

# Install Python dependencies
pip install torch transformers openai-whisper faster-whisper

# Run in development mode
npm run dev

# Build for distribution
npm run build
```

---

## Getting Started

### First Launch

When you first launch LocalVoice AI, you'll see the welcome screen with a brief introduction to the app's features.

### Basic Workflow

1. **Select an Audio File**
   - Click **"Select Audio File"** button
   - Supported formats: MP3, WAV, M4A, FLAC, OGG, WMA
   - File info (name, size) will appear below the button

2. **Choose a Backend**
   - Select from the **Backend** dropdown (Whisper or Voxtral)
   - The number of available models is shown in parentheses

3. **Select a Model**
   - Choose a model from the **Model** dropdown
   - Models show: name, size, and WER (Word Error Rate)
   - ✓ indicates the model is already downloaded

4. **Transcribe**
   - Click the green **"Transcribe"** button
   - Wait for processing (time varies by model and audio length)
   - View results in the right panel

### Understanding Results

Each transcription result shows:

- **Backend and Model Name**: e.g., "whisper / base"
- **Processing Time**: Time taken in seconds
- **Language**: Detected language (if supported)
- **Device**: CPU or GPU used for processing
- **Transcription Text**: The actual transcribed text
- **Actions**:
  - **Copy Text**: Copy transcription to clipboard
  - **Export**: Save in various formats

---

## Features

### 1. Single Model Transcription

**Use Case**: Test a single model on an audio file

**Steps**:
1. Select audio file
2. Choose backend and model
3. Leave "Compare multiple models" unchecked
4. Click "Transcribe"

**Result**: Full-width result card with detailed transcription

### 2. Model Comparison Mode

**Use Case**: Compare accuracy and speed of different models side-by-side

**Steps**:
1. Select audio file
2. Check **"Compare multiple models"**
3. Select first model from primary dropdown
4. Select second model from "Select second model" dropdown
5. (Optional) Select third model
6. Click "Transcribe"

**Result**: Side-by-side comparison grid showing all results

**Best Practices**:
- Compare models of similar size for fair comparison
- Use comparison mode to find the best speed/accuracy balance
- Compare different backends (Whisper vs Voxtral)

### 3. Export Options

#### Available Formats

**Plain Text (TXT)**
- Raw transcription text
- Best for: Simple text analysis, reading

**JSON**
- Complete metadata and transcription
- Includes: text, processing time, language, device
- Best for: Programmatic access, data analysis

**SRT Subtitles**
- Standard subtitle format
- Includes timestamps (if available)
- Best for: Video subtitles, media players

**WebVTT (VTT)**
- Web Video Text Tracks format
- Modern subtitle format
- Best for: Web videos, HTML5 players

#### How to Export

1. After transcription, click **"Export"** button
2. Select format from prompt (1-4)
3. Choose save location in file dialog
4. Confirmation toast appears on success

### 4. Batch Processing

**Use Case**: Transcribe multiple audio files with the same model

**Steps**:
1. Click **"Select Audio File"** multiple times to queue files
2. Files appear in the batch queue
3. Select backend and model
4. Click "Transcribe Batch"

**Features**:
- Progress bar shows overall completion
- Individual file status tracking
- Results saved automatically
- Summary report at the end

**Note**: Batch processing is sequential to manage memory usage

---

## Model Manager

### Overview

The Model Manager lets you download, view, and manage speech-to-text models.

### Opening Model Manager

Click the **"📦 Manage Models"** button in the left control panel.

### Tabs

#### 1. Available Models

Shows all models that can be downloaded:

**Model Card Information**:
- Backend and model name (e.g., "whisper / base")
- Installation status badge
- Size (disk space required)
- Parameters (model complexity)
- WER (Word Error Rate - lower is better)
- Download button (if not installed)

**Model Sizes** (Whisper):
- `tiny`: ~75 MB, fastest, lowest accuracy
- `base`: ~150 MB, good speed/accuracy balance
- `small`: ~500 MB, better accuracy
- `medium`: ~1.5 GB, high accuracy
- `large`: ~3 GB, highest accuracy
- `large-v2/v3`: ~3 GB, latest improvements

**Choosing a Model**:
- **For speed**: Use `tiny` or `base`
- **For accuracy**: Use `medium` or `large`
- **For balance**: Use `small`
- **For production**: Use `large-v3`

#### 2. Installed Models

Shows models you've already downloaded:
- Quick overview of available models
- Model details same as Available tab
- "Installed" badge and disabled download button

#### 3. Downloads

Shows active downloads:
- Download name and backend
- Progress bar with percentage
- Status messages
- Real-time updates

**Download Process**:
1. Click "Download" on any model
2. Automatically switches to Downloads tab
3. Shows progress (initiating → downloading → complete)
4. Model appears in Installed tab when done
5. Model becomes available in dropdowns

### Refreshing Model List

Click **"🔄 Refresh"** button in Model Manager footer to:
- Reload model metadata
- Update installation status
- Check for new models

---

## Advanced Settings

### Opening Settings

Click the **"⚙️ Settings"** button in the left control panel.

### Performance Settings

#### Device Preference
- **Auto (GPU if available)**: Automatically uses GPU if detected
- **CPU Only**: Force CPU processing (slower but compatible)
- **CUDA (NVIDIA GPU)**: Force NVIDIA GPU (fastest if available)

**Recommendation**: Leave on Auto unless troubleshooting

#### Quantization
- **Auto**: Let the backend decide
- **FP32**: Full precision (highest accuracy, slowest, most memory)
- **FP16**: Half precision (good balance)
- **INT8**: Quantized (fastest, lowest memory, slight accuracy loss)

**Recommendation**:
- Use FP32 for critical accuracy
- Use FP16 for balance (default)
- Use INT8 for speed and memory constraints

### Transcription Settings

#### Default Language
- **Auto Detect**: Let model determine language
- Specific languages: Force language (en, es, fr, de, zh, ja)

**Use Case**: Select specific language if you know the audio language for better accuracy

#### Enable Timestamps
- Adds time markers to transcription
- Required for SRT/VTT export
- Slight performance overhead

#### Enable Word-level Timestamps
- Adds timestamp to each word (not just sentences)
- Much more detailed than sentence timestamps
- Higher performance overhead
- Required for precise subtitle syncing

### Path Settings

#### Model Cache Directory
- Where models are stored
- Default: `~/.cache/localvoice-ai/`
- Change if you need to use a different drive

#### Default Export Directory
- Where exports are saved by default
- Default: `~/Documents/`

### Interface Settings

#### Auto-scroll to Results
- Automatically scroll to results panel after transcription
- Useful for long transcriptions

#### Show Desktop Notifications
- Toast notifications for:
  - Successful transcription
  - Export complete
  - Settings saved
  - Model downloads
  - Errors

#### Results Font Size
- **Small**: 0.875rem
- **Medium**: 0.9375rem (default)
- **Large**: 1.125rem

**Use Case**: Increase for better readability

### Saving Settings

Click **"Save Settings"** to persist your changes.
Click **"Reset to Defaults"** to restore default settings.

---

## Troubleshooting

### Common Issues

#### Problem: "Backend not available" error

**Cause**: Python dependencies not installed

**Solution**:
```bash
pip install torch transformers openai-whisper faster-whisper
```

#### Problem: Model download fails

**Causes**:
- No internet connection
- Insufficient disk space
- Model server unavailable

**Solutions**:
1. Check internet connection
2. Free up disk space
3. Try again later
4. Download model manually and place in cache directory

#### Problem: Transcription is very slow

**Causes**:
- Large model on CPU
- Insufficient RAM
- Large audio file

**Solutions**:
1. Use a smaller model (`tiny` or `base`)
2. Enable GPU in settings (if available)
3. Use INT8 quantization
4. Split large audio files
5. Close other applications

#### Problem: Poor transcription quality

**Causes**:
- Small model used
- Background noise in audio
- Unclear speech
- Wrong language detected

**Solutions**:
1. Use larger model (`medium` or `large`)
2. Clean audio (reduce noise)
3. Specify language manually in settings
4. Use higher quality audio source
5. Enable timestamps for better alignment

#### Problem: "Out of memory" error

**Causes**:
- Model too large for available RAM/VRAM
- Long audio file

**Solutions**:
1. Use smaller model
2. Use INT8 quantization
3. Split audio into shorter segments
4. Close other applications
5. Process on CPU instead of GPU

#### Problem: Application won't launch

**Solutions**:
1. Check Python is installed: `python3 --version`
2. Reinstall dependencies: `npm install`
3. Check logs in Developer Console (Cmd+Option+I / Ctrl+Shift+I)
4. Try running from terminal to see errors

### Getting Help

If issues persist:

1. **Check GitHub Issues**: Search existing issues
2. **Create New Issue**: Include:
   - OS and version
   - Python version
   - Model being used
   - Error messages
   - Steps to reproduce
3. **Check Logs**: Developer Console (Help → Toggle Developer Tools)

---

## FAQ

### General Questions

**Q: Is internet required?**
A: Only for initial model downloads. Transcription runs 100% locally.

**Q: What audio formats are supported?**
A: MP3, WAV, M4A, FLAC, OGG, WMA

**Q: How long does transcription take?**
A: Varies by model and hardware. Generally:
- `tiny` on GPU: ~0.1x realtime (6 sec for 1 min audio)
- `base` on GPU: ~0.2x realtime
- `large` on CPU: ~2-5x realtime

**Q: Can I use my own custom models?**
A: Not currently, but planned for future releases.

**Q: Is my data private?**
A: Yes! Everything runs locally. No data is sent to external servers.

### Model Questions

**Q: Which model should I use?**
A: Depends on your needs:
- Speed priority: `tiny` or `base`
- Accuracy priority: `large-v3`
- Balance: `small` or `medium`

**Q: What is WER?**
A: Word Error Rate - percentage of words transcribed incorrectly. Lower is better.

**Q: Can I delete models?**
A: Yes, manually delete from the cache directory shown in settings.

**Q: How much disk space do I need?**
A: Minimum 5GB. Each model:
- tiny: ~75 MB
- base: ~150 MB
- small: ~500 MB
- medium: ~1.5 GB
- large: ~3 GB

### Export Questions

**Q: Can I export multiple results at once?**
A: Each result must be exported individually.

**Q: What if my model doesn't support timestamps?**
A: SRT/VTT export will create estimates or single subtitles.

**Q: Can I customize subtitle formatting?**
A: Not currently in the UI, but you can edit exported files.

### Performance Questions

**Q: Can I use multiple GPUs?**
A: Not currently supported.

**Q: Does it work on Apple Silicon (M1/M2)?**
A: Yes, but performance varies. CPU mode recommended.

**Q: Can I transcribe while downloading models?**
A: Yes, downloads run in background.

---

## Keyboard Shortcuts

*(Coming in future release)*

Planned shortcuts:
- `Cmd/Ctrl + O`: Select audio file
- `Cmd/Ctrl + T`: Transcribe
- `Cmd/Ctrl + ,`: Open settings
- `Cmd/Ctrl + M`: Open model manager
- `Cmd/Ctrl + E`: Export last result
- `Cmd/Ctrl + C`: Copy last result

---

## Version History

### Version 3.0 (Current)
- Model download manager
- Advanced settings panel
- Export to TXT/JSON/SRT/VTT
- Batch processing
- Toast notifications
- UI/UX polish and animations
- Electron packaging for distribution

### Version 2.0
- Multi-backend support (Whisper + Voxtral)
- Side-by-side comparison mode
- Electron desktop app
- Dark theme UI

### Version 1.0
- Basic Whisper integration
- CLI interface

---

## Credits

LocalVoice AI is built with:
- [Electron](https://www.electronjs.org/) - Desktop framework
- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [Faster Whisper](https://github.com/guillaumekln/faster-whisper) - Optimized Whisper
- [Transformers](https://huggingface.co/transformers) - Model loading

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Documentation**: This guide
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

Happy transcribing! 🎙️
