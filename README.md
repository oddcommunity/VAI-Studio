# LocalVoice AI

**LM Studio for Speech-to-Text** - Test and compare local STT models on your desktop

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)

---

## Overview

LocalVoice AI is a desktop application for testing and comparing speech-to-text (STT) models **locally** on your machine. No cloud services, no subscriptions, no data leaving your computer.

### Key Features

- **Multi-Backend Support** - Test Whisper and Voxtral models
- **Side-by-Side Comparison** - Compare up to 3 models simultaneously
- **Multiple Export Formats** - TXT, JSON, SRT (subtitles), VTT
- **Batch Processing** - Transcribe multiple files in one go
- **Model Manager** - Download and manage models with progress tracking
- **Advanced Settings** - GPU acceleration, quantization, language selection
- **Beautiful UI** - Dark theme with smooth animations
- **100% Local** - No internet required for transcription (only for initial model downloads)

---

## Quick Start

### Installation

1. **Download** the latest release for your platform:
   - [macOS (DMG)](https://github.com/yourusername/localvoice-ai/releases)
   - [Windows (EXE)](https://github.com/yourusername/localvoice-ai/releases)
   - [Linux (AppImage)](https://github.com/yourusername/localvoice-ai/releases)

2. **Install Python dependencies**:
   ```bash
   pip install torch transformers openai-whisper faster-whisper
   ```

3. **Launch** and start transcribing!

📖 **Full Guide**: See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions

---

## Usage

### Basic Workflow

1. **Download a Model** - Click "📦 Manage Models" → Download `whisper/base`
2. **Select Audio File** - Click "Select Audio File" (MP3, WAV, M4A, etc.)
3. **Choose Model** - Select backend and model from dropdowns
4. **Transcribe** - Click the green "Transcribe" button
5. **Use Results** - Copy text or export to TXT/JSON/SRT/VTT

### Compare Models

Enable **"Compare multiple models"** to test different models side-by-side on the same audio file.

---

## Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get started in 5 minutes
- **[User Guide](USER_GUIDE.md)** - Complete documentation with features, settings, and troubleshooting
- **[Build Guide](BUILD.md)** - For developers: building and distributing the app

---

## Screenshots

### Main Interface
Clean, intuitive interface with dark theme:
- Left panel: Controls and settings
- Right panel: Transcription results

### Model Manager
Download and manage STT models with one click:
- Available Models tab
- Installed Models tab
- Active Downloads with progress bars

### Comparison Mode
Side-by-side comparison of multiple models on the same audio

---

## Supported Models

### Whisper (OpenAI)
- `tiny` - 39M params, ~75 MB, fastest
- `base` - 74M params, ~150 MB, balanced
- `small` - 244M params, ~500 MB, better accuracy
- `medium` - 769M params, ~1.5 GB, high accuracy
- `large` - 1550M params, ~3 GB, highest accuracy
- `large-v2/v3` - Latest improvements

### Voxtral
- Coming soon

---

## System Requirements

### Minimum
- **OS**: macOS 10.13+, Windows 10+, or Linux
- **RAM**: 8 GB
- **Storage**: 5 GB for models
- **Python**: 3.8 or higher

### Recommended
- **RAM**: 16 GB
- **GPU**: NVIDIA with CUDA support
- **Storage**: 10 GB+ for multiple large models

---

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Desktop Framework**: Electron
- **Backend Processing**: Python
- **STT Models**:
  - OpenAI Whisper
  - Faster Whisper (optimized)
  - Transformers (HuggingFace)

---

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/localvoice-ai.git
cd localvoice-ai

# Install dependencies
npm install
pip install torch transformers openai-whisper faster-whisper

# Run in development
npm run dev
```

### Build

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux

# Build for all platforms
npm run build:all
```

📦 **Full Build Guide**: See [BUILD.md](BUILD.md)

---

## Roadmap

### Version 3.0 (Current) ✅
- [x] Model download manager
- [x] Advanced settings panel
- [x] Export to TXT/JSON/SRT/VTT
- [x] Batch processing
- [x] Toast notifications
- [x] UI/UX polish and animations
- [x] Comprehensive documentation

### Version 3.1 (Planned)
- [ ] Benchmarking suite with test samples
- [ ] Auto-update system
- [ ] Keyboard shortcuts
- [ ] Audio preview/trimming
- [ ] More export formats (DOCX, PDF)

### Version 4.0 (Future)
- [ ] Custom model support
- [ ] Real-time transcription (microphone input)
- [ ] Speaker diarization
- [ ] Translation mode
- [ ] Plugin system

---

## Contributing

Contributions are welcome! Areas for improvement:

- Additional STT backends
- UI/UX enhancements
- Performance optimizations
- Documentation improvements
- Bug fixes and testing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Troubleshooting

### Common Issues

**Backend not available**
```bash
pip install torch transformers openai-whisper faster-whisper
```

**Slow transcription**
- Use smaller model (`tiny` or `base`)
- Enable GPU in settings (if available)
- Use INT8 quantization

**Poor accuracy**
- Use larger model (`medium` or `large`)
- Specify language in settings
- Improve audio quality

📖 **Full Troubleshooting**: See [USER_GUIDE.md](USER_GUIDE.md#troubleshooting)

---

## License

MIT License - See [LICENSE](LICENSE) file for details

---

## Credits

Built with:
- [Electron](https://www.electronjs.org/)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [Faster Whisper](https://github.com/guillaumekln/faster-whisper)
- [Transformers](https://huggingface.co/transformers)

---

## Support

- **Documentation**: [User Guide](USER_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/localvoice-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/localvoice-ai/discussions)

---

## Version History

- **v3.0.0** - Model Manager, Settings, Export, Batch Processing, Polish
- **v2.0.0** - Multi-backend, Comparison Mode, Electron App
- **v1.0.0** - Basic Whisper Integration

---

Made with ❤️ for the speech-to-text community

**Star ⭐ this repo** if you find it useful!
