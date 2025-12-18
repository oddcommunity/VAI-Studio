#!/bin/bash
set -e

# Pre-sign Python binaries before electron-builder runs
# This prevents timeout issues with large Python venvs

APP_PATH="$1"
IDENTITY="${2:-Developer ID Application: Henry Love (6L989H4F6A)}"

if [ -z "$APP_PATH" ]; then
  echo "Usage: $0 <app-path> [identity]"
  exit 1
fi

echo "Pre-signing Python binaries in: $APP_PATH"
echo "Using identity: $IDENTITY"

# Find all .so and .dylib files in the Python venv
PYTHON_BINARIES=$(find "$APP_PATH/Contents/Resources/backends/venv" \
  -type f \( -name "*.so" -o -name "*.dylib" \) 2>/dev/null || true)

TOTAL=$(echo "$PYTHON_BINARIES" | grep -c "^" || echo "0")
CURRENT=0

echo "Found $TOTAL native binaries to sign"

# Sign each binary individually with verbose output
while IFS= read -r binary; do
  if [ -n "$binary" ]; then
    CURRENT=$((CURRENT + 1))
    echo "[$CURRENT/$TOTAL] Signing: $(basename "$binary")"

    # Sign with hardened runtime and timestamp
    codesign --force \
      --sign "$IDENTITY" \
      --timestamp \
      --options runtime \
      --entitlements "build/entitlements.mac.plist" \
      "$binary" 2>&1 | grep -v "replacing existing signature" || true
  fi
done <<< "$PYTHON_BINARIES"

echo "Pre-signing complete: $CURRENT binaries signed"
