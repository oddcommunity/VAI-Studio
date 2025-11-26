# VAI Studio Pre-Distribution Testing Checklist

This document outlines the comprehensive testing process that MUST be completed before distributing any packaged build of VAI Studio.

## Why This Matters

Previous releases had critical bugs in packaged builds that worked fine in development mode. This checklist ensures we catch these issues before distribution.

## Pre-Build Checklist

Before running `npm run build:mac`, verify:

- [ ] All code changes are committed
- [ ] Version number is updated in `package.json` (if needed)
- [ ] `generate-build-info.sh` will run automatically (check prebuild script)
- [ ] All background npm start processes are killed

## Automated Testing

### 1. Run Automated Verification Script

```bash
./scripts/test-packaged-app.sh
```

This script verifies:
- ✅ DMG exists and is valid
- ✅ App bundle signature
- ✅ Python venv is bundled
- ✅ soundfile dependency is included
- ✅ whisper dependency is included
- ✅ ffmpeg-python is NOT included (removed)
- ✅ Backend scripts are present
- ✅ whisper_backend.py uses soundfile

**All checks must pass before proceeding to manual testing.**

## Manual Testing (Critical - DO NOT SKIP)

### Development Mode Test

Before building, test in development mode:

```bash
npm start
```

1. [ ] App launches without errors
2. [ ] Select an audio file (MP3, M4A, or WAV)
3. [ ] Choose whisper/tiny model
4. [ ] Click "Transcribe"
5. [ ] Verify transcription completes successfully
6. [ ] Check console logs for:
   - ✅ "Loading audio file with soundfile"
   - ✅ "numpy array input"
   - ❌ NO "ffmpeg not found" errors
   - ❌ NO "[Errno 2]" errors

### Packaged App Test

After building the DMG:

```bash
npm run build:mac
```

1. [ ] Open the DMG: `open dist/VAI\ Studio-*.dmg`
2. [ ] Drag app to Applications folder
3. [ ] Right-click → Open (first time, to bypass Gatekeeper)
4. [ ] App launches without errors
5. [ ] Check version number displays correctly in header
6. [ ] Check build date displays correctly
7. [ ] Select the SAME audio file used in dev testing
8. [ ] Choose whisper/tiny model
9. [ ] Click "Transcribe"
10. [ ] Verify transcription completes successfully
11. [ ] **Compare transcription text with dev mode result** (should be identical)
12. [ ] Check for any error dialogs or console errors

### Console Log Verification

Open Console.app and filter for "VAI Studio":

Expected logs:
```
[INFO] Loading audio file with soundfile: /var/folders/.../audio.wav
[INFO] Audio loaded: 123456 samples at 16000Hz
[INFO] Transcribing with Whisper tiny (numpy array input)...
```

**Red flags** (should NOT appear):
```
[Errno 2] No such file or directory: 'ffmpeg'
Error: ffmpeg not found
Failed to initialize FFmpeg extension
```

## Cross-Version Testing

If this is a version update:

1. [ ] Test upgrade from previous version
2. [ ] Verify settings are preserved
3. [ ] Verify model cache is still accessible

## Distribution Checklist

Only distribute after ALL of the following are verified:

- [ ] Automated test script passes
- [ ] Dev mode transcription works
- [ ] Packaged app transcription works
- [ ] Transcription results match between dev and packaged
- [ ] No ffmpeg errors in console logs
- [ ] Version and build date display correctly
- [ ] DMG opens correctly
- [ ] App signature is valid (or expected warning for dev builds)

## Test Files

Keep standard test files for consistent testing:

- **Short test** (~10 seconds): Quick smoke test
- **Medium test** (~1 minute): Standard functionality test
- **Long test** (~5 minutes): Stress test for memory leaks

Test with multiple formats:
- MP3
- M4A
- WAV

## Known Good Configuration

The following configuration has been verified to work:

### Architecture
```
Audio File (MP3/M4A/WAV)
    ↓
Electron (main.js):
    - Uses ffmpeg-static to convert to 16kHz mono WAV
    ↓
Python (whisper_backend.py):
    - Uses soundfile.read() to load WAV into numpy array
    - Passes numpy array to model.transcribe()
    - NO ffmpeg dependency in Python
    ↓
Transcription Result
```

### Dependencies
- **Electron**: `@ffmpeg/ffmpeg-static` (for audio conversion)
- **Python**: `soundfile>=0.12.0` (for WAV loading)
- **Python**: NO `ffmpeg-python` (removed)

## Troubleshooting

### If packaged app fails but dev works:

1. Check automated script output for missing dependencies
2. Verify soundfile is in the bundle:
   ```bash
   ls -la "dist/mac-arm64/VAI Studio.app/Contents/Resources/backends-bundle/venv/lib/python3.9/site-packages/" | grep soundfile
   ```
3. Check whisper_backend.py was bundled correctly:
   ```bash
   grep "import soundfile" "dist/mac-arm64/VAI Studio.app/Contents/Resources/backends-bundle/whisper_backend.py"
   ```

### If you see ffmpeg errors:

1. Verify ffmpeg-python was removed from requirements.txt
2. Rebuild the Python bundle: `./scripts/prepare-python-bundle.sh`
3. Rebuild the app: `npm run build:mac`
4. Re-run all tests

## Quick Reference Commands

```bash
# Run automated tests
./scripts/test-packaged-app.sh

# Build the app
npm run build:mac

# Test in dev mode
npm start

# Check packaged Python dependencies
ls "dist/mac-arm64/VAI Studio.app/Contents/Resources/backends-bundle/venv/lib/python3.9/site-packages/"

# View app console logs
open /Applications/Utilities/Console.app
```

## Sign-Off

Before distribution, complete this sign-off:

```
Date: ________________
Version: _____________
Tested by: ___________

☐ All automated tests passed
☐ Dev mode transcription verified
☐ Packaged app transcription verified
☐ No ffmpeg errors in logs
☐ Ready for distribution
```

---

**Remember**: A few minutes of thorough testing prevents hours of user support and emergency patches.
