#!/bin/bash
# Diagnostic script for code signing issues

set -e

echo "========================================="
echo "VAI Studio Code Signing Diagnostics"
echo "========================================="
echo ""

# Check for code signing certificate
echo "1. Checking for Developer ID certificates..."
security find-identity -v -p codesigning | grep "Developer ID Application" || {
  echo "❌ No Developer ID Application certificate found"
  exit 1
}
echo ""

# Check backends-bundle size
echo "2. Checking backends-bundle size..."
BUNDLE_SIZE=$(du -sh backends-bundle 2>/dev/null | cut -f1)
echo "   Size: $BUNDLE_SIZE"

# Count files
TOTAL_FILES=$(find backends-bundle -type f 2>/dev/null | wc -l | xargs)
echo "   Total files: $TOTAL_FILES"

# Count binaries
BINARY_COUNT=$(find backends-bundle -type f \( -name "*.so" -o -name "*.dylib" \) 2>/dev/null | wc -l | xargs)
echo "   Native binaries (.so/.dylib): $BINARY_COUNT"
echo ""

# Check for unsigned binaries
echo "3. Checking for unsigned binaries in backends-bundle..."
UNSIGNED_COUNT=0
while IFS= read -r binary; do
  if ! codesign -dv "$binary" &>/dev/null; then
    UNSIGNED_COUNT=$((UNSIGNED_COUNT + 1))
  fi
done < <(find backends-bundle/venv -type f \( -name "*.so" -o -name "*.dylib" \) 2>/dev/null)

if [ "$UNSIGNED_COUNT" -gt 0 ]; then
  echo "   ⚠️  Found $UNSIGNED_COUNT unsigned binaries"
else
  echo "   ✓ All binaries are signed"
fi
echo ""

# Check environment variables
echo "4. Checking code signing environment..."
echo "   CSC_IDENTITY_AUTO_DISCOVERY: ${CSC_IDENTITY_AUTO_DISCOVERY:-not set}"
echo "   CSC_NAME: ${CSC_NAME:-not set}"
echo "   CSC_LINK: ${CSC_LINK:+set (hidden)}"
echo "   CSC_KEY_PASSWORD: ${CSC_KEY_PASSWORD:+set (hidden)}"
echo ""

# Estimate signing time
echo "5. Estimating signing time..."
echo "   $BINARY_COUNT binaries × ~0.5s each = ~$((BINARY_COUNT / 2)) seconds"
echo "   Recommended timeout: 3600000ms (1 hour)"
echo ""

# Check electron-builder config
echo "6. Checking electron-builder config..."
if grep -q '"timeout"' package.json; then
  TIMEOUT=$(grep '"timeout"' package.json | head -1 | sed 's/.*: *\([0-9]*\).*/\1/')
  echo "   ✓ Timeout configured: ${TIMEOUT}ms ($(($TIMEOUT / 1000))s)"
else
  echo "   ⚠️  No timeout configured (using default)"
fi

if grep -q '"afterPack"' package.json; then
  echo "   ✓ afterPack hook configured"
else
  echo "   ⚠️  No afterPack hook configured"
fi
echo ""

echo "========================================="
echo "Diagnostic complete"
echo "========================================="
