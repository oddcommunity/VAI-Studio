# LocalVoice AI - Quick Start Guide

Get started with LocalVoice AI in 5 minutes!

## Installation

### Download and Install

1. **Download** the app for your platform:
   - **macOS**: Download `.dmg` file
   - **Windows**: Download `.exe` installer
   - **Linux**: Download `.AppImage` file

2. **Install**:
   - **macOS**: Open DMG, drag to Applications
   - **Windows**: Run installer, follow prompts
   - **Linux**: `chmod +x LocalVoice-AI*.AppImage && ./LocalVoice-AI*.AppImage`

3. **Launch** LocalVoice AI from your applications

### Install Python Dependencies

LocalVoice AI requires Python for model processing:

```bash
# Install dependencies
pip install torch transformers openai-whisper faster-whisper
```

That's it! You're ready to go.

---

## Your First Transcription

### Step 1: Download a Model

1. Click **"📦 Manage Models"** button
2. Go to **"Available Models"** tab
3. Click **"Download"** on `whisper / base` (good balance of speed and accuracy)
4. Wait for download to complete

### Step 2: Select an Audio File

1. Click **"Select Audio File"** button
2. Choose any audio file (MP3, WAV, M4A, etc.)
3. File info appears below button

### Step 3: Choose Model

1. Select **"Whisper"** from Backend dropdown
2. Select **"base"** from Model dropdown (should have ✓ mark)

### Step 4: Transcribe

1. Click green **"Transcribe"** button
2. Wait for processing (usually a few seconds)
3. View transcription in right panel

### Step 5: Use Results

- **Copy**: Click "Copy Text" to copy to clipboard
- **Export**: Click "Export" to save as TXT, JSON, SRT, or VTT

---

## Compare Models (Optional)

Want to compare different models side-by-side?

1. Download another model (e.g., `whisper / tiny`)
2. Check **"Compare multiple models"** checkbox
3. Select first model from main dropdown
4. Select second model from second dropdown
5. Click **"Transcribe"**
6. View side-by-side comparison!

---

## Tips for Best Results

### Model Selection

- **For Speed**: Use `tiny` (~39M params, fast)
- **For Quality**: Use `large-v3` (~1550M params, accurate)
- **Balanced**: Use `base` or `small` (recommended for most users)

### Audio Quality

- Use clear, high-quality audio
- Minimize background noise
- Single speaker works best

### Performance

- **Have a GPU?**
  - Settings → Device Preference → CUDA
  - 5-10x faster transcription!

- **Low on RAM?**
  - Use smaller model (`tiny` or `base`)
  - Settings → Quantization → INT8

---

## Common Tasks

### Export Subtitles for Video

1. Transcribe your audio
2. Click "Export"
3. Select **SRT** format (option 3)
4. Import SRT file into video editor

### Batch Transcribe Multiple Files

1. Select first audio file
2. Note filename, transcribe
3. Select second audio file
4. Transcribe again
5. Repeat for all files

*(Full batch processing coming soon)*

### Change Language

If transcription is in wrong language:

1. Click **⚙️ Settings**
2. Change "Default Language" from "Auto" to your language
3. Click "Save Settings"
4. Transcribe again

---

## Troubleshooting

### "Backend not available"
→ Install Python dependencies: `pip install torch transformers openai-whisper faster-whisper`

### Transcription is slow
→ Use smaller model (`tiny` or `base`) or enable GPU in settings

### Poor quality transcription
→ Use larger model (`medium` or `large`) or improve audio quality

### Out of memory
→ Use smaller model or close other applications

---

## Next Steps

- **Read Full Guide**: Check out [USER_GUIDE.md](USER_GUIDE.md) for detailed documentation
- **Explore Settings**: Configure performance and UI preferences
- **Try Different Models**: Compare Whisper vs Voxtral backends
- **Export Formats**: Try JSON for metadata or SRT for subtitles

---

## Get Help

- **Docs**: [USER_GUIDE.md](USER_GUIDE.md)
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

Happy transcribing! 🎙️✨
