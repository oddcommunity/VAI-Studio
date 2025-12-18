#!/bin/bash
set -e

# Smoke test script for VAI Studio
# Builds an unsigned app and launches it to check for immediate crashes
# This catches runtime issues BEFORE spending time on code signing and notarization

echo "=================================================="
echo "VAI Studio Smoke Test"
echo "=================================================="
echo ""
echo "This script will:"
echo "  1. Build React frontend"
echo "  2. Bundle Electron main process"
echo "  3. Check dependencies"
echo "  4. Build unsigned macOS app"
echo "  5. Launch the app for 10 seconds"
echo "  6. Check for crashes"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build React frontend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/6: Building React frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm run build:react

# Step 2: Bundle Electron main process
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/6: Bundling Electron main process"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/bundle-electron.sh

# Step 3: Check dependencies
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/6: Checking bundled dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node scripts/check-dependencies.js

# Step 4: Run prebuild tasks
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/6: Running prebuild tasks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/generate-build-info.sh
./scripts/prepare-python-bundle.sh

# Step 5: Build unsigned app
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5/6: Building unsigned macOS app"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Note: Disabling code signing for smoke test"
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build:mac

# Check if build succeeded
if [ ! -d "dist/mac-arm64/VAI Studio.app" ]; then
    echo -e "${RED}✗ Build failed - app not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Step 6: Launch and monitor
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6/6: Launching app for smoke test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APP_PATH="dist/mac-arm64/VAI Studio.app"

# Launch the app in background
echo "Launching VAI Studio..."
open "$APP_PATH" &
APP_PID=$!

# Wait for app to start
echo "Waiting 3 seconds for app to launch..."
sleep 3

# Check if app is running
if ps -p $APP_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ App launched successfully${NC}"
else
    echo -e "${RED}✗ App crashed on launch${NC}"
    echo ""
    echo "Checking for crash logs..."
    CRASH_LOG=$(ls -t ~/Library/Logs/DiagnosticReports/VAI\ Studio* 2>/dev/null | head -n 1)
    if [ -n "$CRASH_LOG" ]; then
        echo "Most recent crash log:"
        echo "  $CRASH_LOG"
        echo ""
        echo "First 50 lines of crash log:"
        head -n 50 "$CRASH_LOG"
    fi
    exit 1
fi

# Monitor for 10 seconds
echo "Monitoring for 10 seconds..."
for i in {10..1}; do
    if ! ps -p $APP_PID > /dev/null 2>&1; then
        echo -e "${RED}✗ App crashed after $((11-i)) seconds${NC}"
        exit 1
    fi
    echo "  $i seconds remaining..."
    sleep 1
done

# Check final status
if ps -p $APP_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ App is still running - smoke test PASSED${NC}"

    # Ask user to close the app
    echo ""
    echo "Please interact with the app briefly to verify:"
    echo "  - Window opens correctly"
    echo "  - UI renders properly"
    echo "  - No console errors"
    echo ""
    echo "Press ENTER when ready to close the app..."
    read -r

    # Kill the app
    echo "Closing app..."
    killall "VAI Studio" 2>/dev/null || true
else
    echo -e "${RED}✗ App crashed during monitoring${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✓ SMOKE TEST PASSED${NC}"
echo "=================================================="
echo ""
echo "The app launched successfully and ran without crashes."
echo "You can now proceed with a signed production build:"
echo ""
echo "  pnpm run build:mac"
echo ""
