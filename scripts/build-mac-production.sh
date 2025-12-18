#!/bin/bash
# Production macOS Build Script
# This script handles the complete build process with proper error handling

set -e

echo "========================================="
echo "VAI Studio - macOS Production Build"
echo "========================================="
echo ""

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "1. Checking prerequisites..."

# Check for Developer ID certificate
if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
  echo -e "${RED}Error: No Developer ID Application certificate found${NC}"
  echo "Please import your certificate first:"
  echo "  security import developer-id-application.p12 -k ~/Library/Keychains/login.keychain-db"
  exit 1
fi
echo -e "${GREEN}✓ Developer ID certificate found${NC}"

# Check for Node.js and pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}Error: pnpm not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ pnpm found${NC}"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
  echo -e "${RED}Error: Python 3 not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Python 3 found${NC}"

echo ""

# Optional: Check for notarization credentials
echo "2. Checking notarization credentials..."
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ] && [ -n "$APPLE_TEAM_ID" ]; then
  echo -e "${GREEN}✓ Notarization credentials found${NC}"
  WILL_NOTARIZE="yes"
else
  echo -e "${YELLOW}⚠ Notarization credentials not set (app will be signed but not notarized)${NC}"
  echo "To enable notarization, set these environment variables:"
  echo "  export APPLE_ID=your@apple.id"
  echo "  export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx"
  echo "  export APPLE_TEAM_ID=6L989H4F6A"
  WILL_NOTARIZE="no"
fi
echo ""

# Run diagnostics
echo "3. Running pre-build diagnostics..."
./scripts/diagnose-signing.sh
echo ""

# Confirm build
echo "========================================="
echo "Ready to build VAI Studio for macOS"
echo "========================================="
echo "Target: macOS arm64"
echo "Signing: Yes (Developer ID)"
echo "Notarization: $WILL_NOTARIZE"
echo ""
echo -e "${YELLOW}This build will take 10-20 minutes depending on your machine.${NC}"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Build cancelled"
  exit 0
fi
echo ""

# Build React frontend
echo "========================================="
echo "Step 1/3: Building React frontend"
echo "========================================="
pnpm run build:react
echo -e "${GREEN}✓ React build complete${NC}"
echo ""

# Prepare Python bundle (with pre-signing)
echo "========================================="
echo "Step 2/3: Preparing Python bundle"
echo "========================================="
./scripts/prepare-python-bundle.sh
echo -e "${GREEN}✓ Python bundle ready${NC}"
echo ""

# Build and sign Electron app
echo "========================================="
echo "Step 3/3: Building and signing Electron app"
echo "========================================="
echo "This step may take 5-15 minutes..."
echo ""

# Record start time
START_TIME=$(date +%s)

# Workaround: Hide pnpm workspace files to avoid OOM during electron-builder's `pnpm list`
# The workspace has too many packages and causes memory exhaustion
echo "Temporarily hiding pnpm workspace files (OOM workaround)..."
mv pnpm-lock.yaml pnpm-lock.yaml.bak 2>/dev/null || true
mv pnpm-workspace.yaml pnpm-workspace.yaml.bak 2>/dev/null || true

# Run electron-builder with increased memory
NODE_OPTIONS="--max-old-space-size=16384" npx electron-builder --mac

# Restore pnpm files
echo "Restoring pnpm workspace files..."
mv pnpm-lock.yaml.bak pnpm-lock.yaml 2>/dev/null || true
mv pnpm-workspace.yaml.bak pnpm-workspace.yaml 2>/dev/null || true

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Show results
echo "========================================="
echo "Build Summary"
echo "========================================="
echo "Build time: ${MINUTES}m ${SECONDS}s"
echo ""
echo "Output files:"
ls -lh dist/*.dmg 2>/dev/null || echo "  (No DMG found)"
ls -lh dist/*.zip 2>/dev/null || echo "  (No ZIP found)"
echo ""

# Verify signature
echo "Verifying code signature..."
APP_PATH="dist/mac-arm64/VAI Studio.app"
if [ -d "$APP_PATH" ]; then
  codesign -dv --verbose=4 "$APP_PATH" 2>&1 | head -10
  echo ""

  # Test Gatekeeper
  echo "Testing Gatekeeper assessment..."
  if spctl -a -vv "$APP_PATH" 2>&1 | grep -q "accepted"; then
    echo -e "${GREEN}✓ App will pass Gatekeeper${NC}"
  else
    echo -e "${YELLOW}⚠ App may not pass Gatekeeper (notarization required)${NC}"
  fi
else
  echo -e "${RED}Error: Built app not found${NC}"
  exit 1
fi

echo ""
echo "========================================="
echo "Build complete!"
echo "========================================="
echo ""
echo "Next steps:"
if [ "$WILL_NOTARIZE" = "yes" ]; then
  echo "1. Check notarization status (this happens automatically)"
  echo "2. Test the built app: open \"$APP_PATH\""
  echo "3. Distribute the DMG: dist/*.dmg"
else
  echo "1. Test the built app: open \"$APP_PATH\""
  echo "2. For distribution, re-run with notarization credentials set"
fi
echo ""
