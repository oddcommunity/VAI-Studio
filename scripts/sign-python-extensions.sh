#!/bin/bash

# Sign Python Native Extensions
# This script signs all .so files in the Python venv to pass macOS code signing requirements

set -e

echo "=========================================="
echo "Signing Python Native Extensions"
echo "=========================================="

# Get the venv directory from argument or use default
VENV_DIR="${1:-backends-bundle/venv}"

if [ ! -d "$VENV_DIR" ]; then
  echo "Error: venv directory not found: $VENV_DIR"
  exit 1
fi

echo "Processing venv: $VENV_DIR"
echo ""

# Find all .so files (native extensions)
echo "Finding .so files to sign..."
SO_FILES=$(find "$VENV_DIR" -name "*.so" -type f)
SO_COUNT=$(echo "$SO_FILES" | grep -c "\.so" || echo "0")

echo "Found $SO_COUNT .so files"
echo ""

if [ "$SO_COUNT" -eq 0 ]; then
  echo "No .so files found, skipping..."
  exit 0
fi

# Sign each .so file with ad-hoc signature (no developer certificate needed)
echo "Signing .so files with ad-hoc signature..."
SIGNED_COUNT=0

while IFS= read -r so_file; do
  if [ -n "$so_file" ]; then
    # Use ad-hoc signature (-) for unsigned builds
    # For production, replace with: codesign --force --sign "Developer ID Application: YourName" ...
    codesign --force --sign - --timestamp=none "$so_file" 2>/dev/null || {
      echo "  ⚠ Warning: Failed to sign $(basename "$so_file")"
      continue
    }
    SIGNED_COUNT=$((SIGNED_COUNT + 1))

    # Show progress every 10 files
    if [ $((SIGNED_COUNT % 10)) -eq 0 ]; then
      echo "  Signed $SIGNED_COUNT/$SO_COUNT files..."
    fi
  fi
done <<< "$SO_FILES"

echo ""
echo "✓ Signed $SIGNED_COUNT/$SO_COUNT .so files successfully"
echo ""

# Verify a few signatures
echo "Verifying signatures on sample files..."
SAMPLE_FILES=$(echo "$SO_FILES" | head -3)
while IFS= read -r so_file; do
  if [ -n "$so_file" ]; then
    codesign --verify --verbose "$so_file" 2>&1 | head -1 || true
  fi
done <<< "$SAMPLE_FILES"

echo ""
echo "=========================================="
echo "Code signing complete!"
echo "=========================================="
