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

# Find all native binary files (.so and .dylib)
echo "Finding native binaries to sign (.so, .dylib)..."
BINARY_FILES=$(find "$VENV_DIR" -type f \( -name "*.so" -o -name "*.dylib" \))
BINARY_COUNT=$(echo "$BINARY_FILES" | grep -c -E '\.(so|dylib)' || echo "0")

echo "Found $BINARY_COUNT native binaries"
echo ""

if [ "$BINARY_COUNT" -eq 0 ]; then
  echo "No native binaries found, skipping..."
  exit 0
fi

# Determine signing identity
# Use Developer ID if available, otherwise fall back to ad-hoc
SIGN_IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed 's/.*"\(.*\)".*/\1/' || echo "-")

# Get entitlements path
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTITLEMENTS="$PROJECT_ROOT/build/entitlements.mac.plist"

if [ "$SIGN_IDENTITY" = "-" ] || [ -z "$SIGN_IDENTITY" ]; then
  echo "No Developer ID found, using ad-hoc signature..."
  SIGN_IDENTITY="-"
  SIGN_FLAGS="--timestamp=none"
else
  echo "Using: $SIGN_IDENTITY"
  # Use hardened runtime and entitlements for distribution
  if [ -f "$ENTITLEMENTS" ]; then
    SIGN_FLAGS="--timestamp --options runtime --entitlements $ENTITLEMENTS"
  else
    SIGN_FLAGS="--timestamp --options runtime"
  fi
fi

echo "Signing native binaries..."
SIGNED_COUNT=0

while IFS= read -r binary_file; do
  if [ -n "$binary_file" ]; then
    codesign --force --sign "$SIGN_IDENTITY" $SIGN_FLAGS "$binary_file" 2>/dev/null || {
      echo "  ⚠ Warning: Failed to sign $(basename "$binary_file")"
      continue
    }
    SIGNED_COUNT=$((SIGNED_COUNT + 1))

    # Show progress every 10 files
    if [ $((SIGNED_COUNT % 10)) -eq 0 ]; then
      echo "  Signed $SIGNED_COUNT/$BINARY_COUNT files..."
    fi
  fi
done <<< "$BINARY_FILES"

echo ""
echo "✓ Signed $SIGNED_COUNT/$BINARY_COUNT native binaries successfully"
echo ""

# Verify a few signatures
echo "Verifying signatures on sample files..."
SAMPLE_FILES=$(echo "$BINARY_FILES" | head -3)
while IFS= read -r binary_file; do
  if [ -n "$binary_file" ]; then
    echo "  $(basename "$binary_file"):"
    codesign --verify --verbose "$binary_file" 2>&1 | grep -E "(valid|runtime)" || true
  fi
done <<< "$SAMPLE_FILES"

echo ""
echo "=========================================="
echo "Code signing complete!"
echo "=========================================="
