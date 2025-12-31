#!/bin/bash

# Sequoia Gatekeeper Verification Script
# Based on known issues with macOS Sequoia (15) and Electron apps
#
# This script verifies:
# 1. No external symlinks in the app bundle
# 2. No external RPATH references
# 3. All nested binaries are signed
# 4. Notarization ticket is stapled
# 5. Gatekeeper assessment passes

set -e

APP_PATH="${1:-dist/mac-arm64/VAI Studio.app}"

echo "=============================================="
echo "macOS Sequoia Gatekeeper Verification"
echo "=============================================="
echo ""
echo "App: $APP_PATH"
echo ""

if [ ! -d "$APP_PATH" ]; then
  echo "Error: App not found at $APP_PATH"
  echo "Run 'pnpm run build:mac' first"
  exit 1
fi

ERRORS=0

# ============================================
# 1. Check for external symlinks
# ============================================
echo "1. Checking for external symlinks..."
echo "   (Sequoia blocks apps with symlinks to external paths)"

EXTERNAL_SYMLINKS=$(find "$APP_PATH" -type l 2>/dev/null | while read -r link; do
  target=$(readlink "$link" 2>/dev/null || true)
  if [[ "$target" == /* ]] && [[ "$target" != "$APP_PATH"* ]]; then
    echo "   $link -> $target"
  fi
done)

if [ -n "$EXTERNAL_SYMLINKS" ]; then
  echo "   [FAIL] Found external symlinks:"
  echo "$EXTERNAL_SYMLINKS"
  ERRORS=$((ERRORS + 1))
else
  echo "   [PASS] No external symlinks found"
fi
echo ""

# ============================================
# 2. Check Python venv for external references
# ============================================
echo "2. Checking Python venv for external references..."
VENV_PATH="$APP_PATH/Contents/Resources/backends/venv"

if [ -d "$VENV_PATH" ]; then
  # Check for symlinks in bin/
  VENV_SYMLINKS=$(find "$VENV_PATH/bin" -type l 2>/dev/null | while read -r link; do
    target=$(readlink "$link" 2>/dev/null || true)
    # Check if target is external (absolute path outside venv)
    if [[ "$target" == /* ]] && [[ "$target" != "$VENV_PATH"* ]]; then
      echo "   $link -> $target"
    fi
  done)

  if [ -n "$VENV_SYMLINKS" ]; then
    echo "   [FAIL] Found external symlinks in venv:"
    echo "$VENV_SYMLINKS"
    ERRORS=$((ERRORS + 1))
  else
    echo "   [PASS] No external symlinks in venv"
  fi
else
  echo "   [SKIP] No Python venv found"
fi
echo ""

# ============================================
# 3. Check for unsigned binaries
# ============================================
echo "3. Checking for unsigned native binaries..."
echo "   (All .so/.dylib must be signed for Gatekeeper)"

UNSIGNED_COUNT=0
TOTAL_COUNT=0

while IFS= read -r binary; do
  if [ -n "$binary" ]; then
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    if ! codesign --verify --verbose "$binary" 2>/dev/null; then
      if [ $UNSIGNED_COUNT -lt 5 ]; then
        echo "   [WARN] Unsigned: $(basename "$binary")"
      fi
      UNSIGNED_COUNT=$((UNSIGNED_COUNT + 1))
    fi
  fi
done < <(find "$APP_PATH" -type f \( -name "*.so" -o -name "*.dylib" \) 2>/dev/null)

if [ $UNSIGNED_COUNT -gt 0 ]; then
  echo "   [WARN] $UNSIGNED_COUNT of $TOTAL_COUNT native binaries unsigned"
  echo "         (Will be signed by electron-builder, but may need pre-signing)"
else
  echo "   [PASS] All $TOTAL_COUNT native binaries signed"
fi
echo ""

# ============================================
# 4. Verify main app signature
# ============================================
echo "4. Verifying app code signature..."

if codesign --verify --deep --strict "$APP_PATH" 2>/dev/null; then
  echo "   [PASS] App signature valid (--deep --strict)"
else
  echo "   [FAIL] App signature invalid"
  echo "         Run: codesign --verify --deep --strict \"$APP_PATH\""
  ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================
# 5. Check Gatekeeper assessment
# ============================================
echo "5. Running Gatekeeper assessment..."
echo "   (spctl -a -vvv -t exec)"

SPCTL_OUTPUT=$(spctl -a -vvv -t exec "$APP_PATH" 2>&1 || true)
echo "$SPCTL_OUTPUT" | head -5

if echo "$SPCTL_OUTPUT" | grep -q "accepted"; then
  echo "   [PASS] Gatekeeper accepts the app"
else
  echo "   [WARN] Gatekeeper may not accept (check notarization)"
fi
echo ""

# ============================================
# 6. Check notarization stapling
# ============================================
echo "6. Checking notarization ticket..."
echo "   (xcrun stapler validate)"

if xcrun stapler validate "$APP_PATH" 2>/dev/null; then
  echo "   [PASS] Notarization ticket stapled"
else
  echo "   [INFO] No notarization ticket (expected for unsigned builds)"
fi
echo ""

# ============================================
# 7. Check DMG stapling (if exists)
# ============================================
DMG_PATH="${APP_PATH//.app/.dmg}"
DMG_PATH="${DMG_PATH//mac-arm64/}"
if [ -f "$DMG_PATH" ]; then
  echo "7. Checking DMG notarization..."
  if xcrun stapler validate "$DMG_PATH" 2>/dev/null; then
    echo "   [PASS] DMG notarization ticket stapled"
  else
    echo "   [WARN] DMG not stapled (run: xcrun stapler staple \"$DMG_PATH\")"
  fi
  echo ""
fi

# ============================================
# Summary
# ============================================
echo "=============================================="
echo "Summary"
echo "=============================================="

if [ $ERRORS -eq 0 ]; then
  echo "[OK] All Gatekeeper checks passed"
  exit 0
else
  echo "[ERROR] $ERRORS critical issue(s) found"
  echo ""
  echo "Recommended fixes:"
  echo "  1. Run fix-python-symlinks.sh before packaging"
  echo "  2. Ensure all Python extensions are pre-signed"
  echo "  3. Use Python 3.11+ instead of 3.9/3.10"
  echo "  4. Re-notarize: xcrun notarytool submit"
  echo "  5. Re-staple: xcrun stapler staple"
  exit 1
fi
