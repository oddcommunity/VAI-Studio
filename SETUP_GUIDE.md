# LocalVoice AI - Complete Setup Guide

**Version 3.0.0 - Production Ready**

This guide will help you set up LocalVoice AI on your computer so you can transcribe voice files from your iPhone.

---

## 📱 Step 1: Transfer Voice File from iPhone

Choose one of these methods:

### Option A: AirDrop (macOS only)
1. On iPhone: Open the voice memo/recording
2. Tap the share button
3. Select "AirDrop"
4. Choose your Mac
5. File appears in Downloads folder

### Option B: iCloud Drive
1. On iPhone: Save voice memo to iCloud Drive
2. On computer: Open iCloud Drive folder
3. File is automatically synced

### Option C: Email
1. On iPhone: Share voice file via email
2. Send to yourself
3. Download attachment on computer

### Option D: USB Cable
1. Connect iPhone to computer via cable
2. Open Finder (Mac) or File Explorer (Windows)
3. Navigate to iPhone > Files
4. Copy voice file to computer

---

## 💻 Step 2: Install Prerequisites

### Install Python (if not already installed)

**macOS:**
```bash
# Using Homebrew (recommended)
brew install python3

# OR download from python.org
# Visit https://www.python.org/downloads/
```

**Windows:**
```bash
# Download from python.org
# Visit https://www.python.org/downloads/
# IMPORTANT: Check "Add Python to PATH" during installation
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install python3 python3-pip
```

Verify installation:
```bash
python3 --version
# Should show Python 3.8 or higher
```

### Install ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to System PATH
   - Right-click "This PC" → Properties
   - Advanced system settings → Environment Variables
   - Edit "Path" → Add new → `C:\ffmpeg\bin`
   - Click OK

**Linux:**
```bash
sudo apt-get install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
# Should show ffmpeg version info
```

### Install Node.js (if not already installed)

**All Platforms:**
- Visit https://nodejs.org/
- Download and install LTS version
- Verify: `node --version` (should show v14.0 or higher)

---

## 📦 Step 3: Install LocalVoice AI

### Download the Application

**Option A: From GitHub Releases (Recommended)**
1. Visit the releases page
2. Download the installer for your platform:
   - macOS: `.dmg` file
   - Windows: `.exe` installer
   - Linux: `.AppImage` file
3. Double-click to install

**Option B: Build from Source**
```bash
# Clone the repository
git clone https://github.com/yourusername/localvoiceAI
cd localvoiceAI

# Install dependencies
npm install

# Install Python packages
pip3 install torch transformers openai-whisper faster-whisper
```

---

## 🎯 Step 4: Download AI Models

### First-Time Setup

1. **Launch LocalVoice AI**

2. **Click "Model Manager"** button in the sidebar

3. **Download a model** from the "Available" tab:
   - **Recommended for beginners**: `tiny` (39MB, fast)
   - **Recommended for quality**: `base` (74MB, balanced)
   - **Recommended for best accuracy**: `small` (244MB, high quality)

4. **Wait for download** to complete (shown in "Downloads" tab)

### Model Comparison

| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| tiny | 39MB | ⚡⚡⚡ | ⭐⭐ | Testing, quick transcripts |
| base | 74MB | ⚡⚡ | ⭐⭐⭐ | General use, best balance |
| small | 244MB | ⚡ | ⭐⭐⭐⭐ | Important audio, meetings |
| medium | 769MB | ⏱️ | ⭐⭐⭐⭐⭐ | Professional work |
| large-v3 | 1.5GB | ⏱️⏱️ | ⭐⭐⭐⭐⭐ | Maximum accuracy |

---

## 🎤 Step 5: Transcribe Your First Voice File

### Single File Transcription

1. **Click "Select Audio File"**

2. **Navigate to your voice file**
   - Supported formats: m4a, wav, mp3, flac, ogg, wma
   - iPhone voice memos are usually .m4a format

3. **Select Backend**
   - Choose "Whisper" (recommended)

4. **Select Model**
   - Choose the model you downloaded (e.g., "base")

5. **Click "Transcribe"**

6. **Wait for processing**
   - tiny model: ~5-10 seconds
   - base model: ~10-20 seconds
   - larger models: 30+ seconds

7. **View Results**
   - Full transcription appears on screen
   - Timestamps for each segment
   - Language detected automatically

8. **Export** (optional)
   - Click "Export" button
   - Choose format:
     - **TXT**: Plain text for documents
     - **JSON**: Complete data with metadata
     - **SRT**: Subtitles for video editing
     - **VTT**: Web-compatible subtitles
   - Choose save location

### Multiple Files (Batch Mode)

1. **Click "Select Multiple Files"**

2. **Select all files** you want to transcribe

3. **Review queue** - Remove any unwanted files

4. **Select Model**

5. **Click "Transcribe Batch"**

6. **Watch progress** - Files processed sequentially

7. **View aggregate results** - All transcriptions displayed together

8. **Export individual files** as needed

---

## ⚙️ Step 6: Configure Settings (Optional)

Click the ⚙️ Settings button to customize:

### Performance Settings
- **Device**: Auto (uses best available), CPU, or CUDA (GPU)
- **Quantization**: Auto, INT8 (faster), or FP16 (better quality)

### Transcription Settings
- **Default Language**: Auto-detect or specific language
- **Enable Timestamps**: Show time markers
- **Enable Word Timestamps**: Word-level timing

### Interface Settings
- **Font Size**: Small, Medium, or Large
- **Auto-scroll**: Scroll to results automatically
- **Show Notifications**: Toast messages for events

Settings are saved automatically and persist across restarts.

---

## 🚀 Step 7: Advanced Features

### Benchmark Mode
Test and compare model accuracy:
1. Click "Benchmark" button
2. Select backend and model
3. Click "Run Benchmark"
4. View WER (Word Error Rate) scores
5. Compare reference vs hypothesis text

### Comparison Mode
Compare multiple models side-by-side:
1. Enable "Comparison Mode" toggle
2. Select 2-3 models
3. Click "Transcribe"
4. View results in grid layout
5. Compare accuracy and speed

### Model Management
- **Available Tab**: All downloadable models
- **Installed Tab**: Your downloaded models
- **Downloads Tab**: Active download progress

---

## 🆘 Troubleshooting

### Problem: "ffmpeg not found" error

**Solution**:
1. Verify ffmpeg is installed: `ffmpeg -version`
2. If not installed, follow Step 2 instructions
3. Restart LocalVoice AI after installation

### Problem: "Python not found" error

**Solution**:
1. Verify Python is installed: `python3 --version`
2. If not installed, follow Step 2 instructions
3. Make sure Python is in system PATH

### Problem: Slow transcription

**Solution**:
- Use smaller model (tiny or base)
- Enable GPU if available (Settings → Device → CUDA)
- Close other heavy applications
- Upgrade RAM if possible

### Problem: Poor transcription quality

**Solution**:
- Use larger model (small, medium, or large)
- Ensure audio quality is good (no background noise)
- Check correct language is selected
- Try re-recording with better microphone

### Problem: Application won't start

**Solution**:
1. Check all dependencies installed (Python, ffmpeg, Node.js)
2. Try running in development mode: `npm start`
3. Check console for error messages
4. Reinstall application

### Problem: Model download fails

**Solution**:
1. Check internet connection
2. Free up disk space (models can be 1-2GB)
3. Try different model
4. Manual download via command line:
   ```bash
   cd backends
   python3 runner.py download whisper tiny
   ```

---

## 📚 Quick Reference

### Keyboard Shortcuts
- **Ctrl/Cmd + O**: Select audio file
- **Ctrl/Cmd + T**: Transcribe
- **Ctrl/Cmd + ,**: Open settings
- **Esc**: Close modals

### File Formats
- **Input**: m4a, wav, mp3, flac, ogg, wma
- **Output**: TXT, JSON, SRT, VTT

### Default Locations
- **Models**: `~/.cache/whisper/` (Whisper), `~/.cache/huggingface/` (Voxtral)
- **Settings**: Browser localStorage
- **Exports**: User-selected location

---

## 🎓 Tips for Best Results

### Audio Recording
1. **Use good microphone** - iPhone's built-in is fine
2. **Minimize background noise** - Quiet room
3. **Speak clearly** - Enunciate words
4. **Keep distance consistent** - 6-12 inches from mic

### Model Selection
- **Quick drafts**: tiny or base
- **Meetings**: base or small
- **Interviews**: small or medium
- **Legal/Medical**: large or large-v3

### Performance
- **Fast transcription**: Use tiny on GPU
- **Best accuracy**: Use large-v3 on GPU
- **No GPU**: Use base on CPU
- **Low RAM**: Use tiny or base

---

## 📞 Support

### Resources
- **Documentation**: See README.md, USER_GUIDE.md, BUILD.md
- **GitHub Issues**: Report bugs and request features
- **Production Guide**: See PRODUCTION_READY.md for technical details

### Common Questions

**Q: Is my data private?**
A: Yes! All processing happens locally on your computer. No data is sent to the cloud.

**Q: Do I need internet?**
A: Only for downloading models. Transcription works offline.

**Q: Can I use this commercially?**
A: Check the license (MIT) and model licenses (Whisper: MIT, Voxtral: Apache 2.0)

**Q: How accurate is it?**
A: WER ranges from 5-15% depending on model. Large models approach human-level accuracy.

**Q: What languages are supported?**
A: Whisper supports 99+ languages. Auto-detection works great.

---

## ✅ Setup Checklist

- [ ] Python 3.8+ installed
- [ ] ffmpeg installed
- [ ] Node.js 14+ installed
- [ ] LocalVoice AI downloaded/installed
- [ ] At least one model downloaded
- [ ] Test transcription completed successfully
- [ ] Settings configured to preference

**You're ready to transcribe!** 🎉

---

**Last Updated**: October 19, 2025
**Version**: 3.0.0
**Status**: Production Ready
