#!/bin/bash

#############################################
# VAI Studio Packaged App Testing Script
#############################################
#
# This script automates testing of the packaged DMG
# to ensure all dependencies are bundled correctly
# before distribution.
#

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOUNT_POINT="/Volumes/VAI Studio"

echo "=========================================="
echo "VAI Studio Packaged App Testing"
echo "=========================================="
echo ""

# Find the latest DMG
DMG_FILE=$(ls -t "$PROJECT_ROOT"/dist/VAI\ Studio-*.dmg 2>/dev/null | head -1)

if [ -z "$DMG_FILE" ]; then
    echo "❌ Error: No DMG found in dist/"
    echo "   Please run 'npm run build:mac' first"
    exit 1
fi

echo "✓ Found DMG: $(basename "$DMG_FILE")"
echo ""

# Mount the DMG
echo "Mounting DMG..."
hdiutil attach "$DMG_FILE" -nobrowse -quiet

if [ ! -d "$MOUNT_POINT/VAI Studio.app" ]; then
    echo "❌ Error: App not found in mounted DMG"
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
    exit 1
fi

echo "✓ DMG mounted successfully"
echo ""

# Test 1: Check if app bundle is valid
echo "Test 1: Validating app bundle..."
if spctl -a -vv "$MOUNT_POINT/VAI Studio.app" 2>&1 | grep -q "accepted"; then
    echo "✓ App signature is valid"
else
    echo "⚠️  Warning: App signature verification failed (expected in dev builds)"
fi

# Test 2: Check if Python venv is bundled
echo ""
echo "Test 2: Checking Python venv..."
VENV_PATH="$MOUNT_POINT/VAI Studio.app/Contents/Resources/backends-bundle/venv"
if [ -d "$VENV_PATH" ]; then
    echo "✓ Python venv found"

    # Check Python executable
    if [ -f "$VENV_PATH/bin/python3" ]; then
        echo "✓ Python executable found"
    else
        echo "❌ Python executable missing!"
    fi
else
    echo "❌ Python venv missing!"
fi

# Test 3: Check if soundfile is bundled
echo ""
echo "Test 3: Checking soundfile dependency..."
SOUNDFILE_PATH="$VENV_PATH/lib/python3.9/site-packages/soundfile"
if [ -d "$SOUNDFILE_PATH" ]; then
    echo "✓ soundfile library found"
else
    echo "❌ soundfile library missing!"
fi

# Test 4: Check if whisper is bundled
echo ""
echo "Test 4: Checking whisper dependency..."
WHISPER_PATH="$VENV_PATH/lib/python3.9/site-packages/whisper"
if [ -d "$WHISPER_PATH" ]; then
    echo "✓ whisper library found"
else
    echo "❌ whisper library missing!"
fi

# Test 5: Check if ffmpeg-python is NOT bundled (we removed it)
echo ""
echo "Test 5: Verifying ffmpeg-python is removed..."
FFMPEG_PYTHON_PATH="$VENV_PATH/lib/python3.9/site-packages/ffmpeg"
if [ -d "$FFMPEG_PYTHON_PATH" ]; then
    echo "⚠️  Warning: ffmpeg-python still bundled (should be removed)"
else
    echo "✓ ffmpeg-python not found (correct)"
fi

# Test 6: Check backend scripts
echo ""
echo "Test 6: Checking backend scripts..."
BACKEND_PATH="$MOUNT_POINT/VAI Studio.app/Contents/Resources/backends-bundle"
if [ -f "$BACKEND_PATH/whisper_backend.py" ]; then
    echo "✓ whisper_backend.py found"

    # Check if it uses soundfile
    if grep -q "import soundfile as sf" "$BACKEND_PATH/whisper_backend.py"; then
        echo "✓ whisper_backend.py uses soundfile (correct)"
    else
        echo "❌ whisper_backend.py doesn't import soundfile!"
    fi
else
    echo "❌ whisper_backend.py missing!"
fi

# Test 7: Check ffmpeg-static in Node.js
echo ""
echo "Test 7: Checking ffmpeg-static (Node.js)..."
FFMPEG_STATIC="$MOUNT_POINT/VAI Studio.app/Contents/Resources/app/node_modules/@ffmpeg/ffmpeg-static"
if [ -d "$FFMPEG_STATIC" ]; then
    echo "✓ ffmpeg-static found in Node.js dependencies"
else
    echo "⚠️  Warning: ffmpeg-static not found in Node.js"
fi

# Unmount DMG
echo ""
echo "Cleaning up..."
hdiutil detach "$MOUNT_POINT" -quiet

echo ""
echo "=========================================="
echo "Testing Complete!"
echo "=========================================="
echo ""
echo "Manual Testing Required:"
echo "1. Install the DMG: open \"$DMG_FILE\""
echo "2. Launch VAI Studio from Applications"
echo "3. Test transcription with an audio file"
echo "4. Check console logs for any ffmpeg errors"
echo ""
echo "Expected behavior:"
echo "- No 'ffmpeg not found' errors"
echo "- Transcription completes successfully"
echo "- Logs show: 'Loading audio file with soundfile'"
echo ""
