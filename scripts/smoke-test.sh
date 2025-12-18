#!/bin/bash
set -e

# Comprehensive smoke test for VAI Studio
# Validates bundle integrity before production builds

echo "=================================================="
echo "VAI Studio Comprehensive Smoke Test"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track pass/fail
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for test results
pass() {
    echo -e "${GREEN}✓${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    exit 1
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "Step 1/8: Check bundle exists"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "dist-electron/main.js" ]; then
    fail "dist-electron/main.js not found"
fi

BUNDLE_SIZE=$(du -h dist-electron/main.js | awk '{print $1}')
pass "Bundle exists (size: $BUNDLE_SIZE)"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "Step 2/8: Check external modules"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EXTERNAL_MODULES=(
    "electron-store"
    "electron-updater"
    "ffmpeg-static"
    "pdfkit"
)

for module in "${EXTERNAL_MODULES[@]}"; do
    if [ ! -d "dist-electron/node_modules/$module" ]; then
        fail "$module not found in dist-electron/node_modules"
    fi
    pass "$module found"
done
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "Step 3/8: Check transitive dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# conf is a dependency of electron-store
if [ ! -d "dist-electron/node_modules/conf" ]; then
    fail "conf (electron-store dependency) not found"
fi
pass "conf found"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "Step 4/8: Run dependency checker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! node scripts/check-dependencies.js; then
    fail "Dependency checker failed"
fi
pass "All dependencies validated"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "Step 5/8: Check bundle syntax"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! node --check dist-electron/main.js; then
    fail "Bundle contains syntax errors"
fi
pass "Bundle syntax valid"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "Step 6/8: Test module resolution"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to require the bundle - expect electron-related errors only
# Any other errors indicate module resolution issues
TEST_OUTPUT=$(cd dist-electron && node -e "try { require('./main.js'); } catch(e) { console.log(e.message); }" 2>&1)

if echo "$TEST_OUTPUT" | grep -qi "electron"; then
    pass "Module resolution OK (expected electron error)"
elif [ -z "$TEST_OUTPUT" ]; then
    pass "Module resolution OK"
else
    echo "Unexpected error: $TEST_OUTPUT"
    fail "Module resolution failed"
fi
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "Step 7/8: Build unsigned app"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Note: Disabling code signing for smoke test"
echo ""

if ! CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build:mac; then
    fail "App build failed"
fi

# Check for app in both possible locations
APP_PATH=""
if [ -d "dist/mac-arm64/VAI Studio.app" ]; then
    APP_PATH="dist/mac-arm64/VAI Studio.app"
elif [ -d "dist/mac/VAI Studio.app" ]; then
    APP_PATH="dist/mac/VAI Studio.app"
else
    fail "Built app not found in dist/"
fi

pass "App built successfully at $APP_PATH"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "Step 8/8: Launch app test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Launch the app in background
echo "Launching VAI Studio..."
open "$APP_PATH" &
LAUNCH_PID=$!

# Wait for app to start
echo "Waiting 3 seconds for app to launch..."
sleep 3

# Get the actual app process (not just the 'open' command)
APP_PID=$(pgrep -f "VAI Studio.app/Contents/MacOS" || echo "")

if [ -z "$APP_PID" ]; then
    fail "App failed to launch"
fi

pass "App launched (PID: $APP_PID)"

# Monitor for 10 seconds
echo "Monitoring for 10 seconds..."
for i in {10..1}; do
    if ! ps -p $APP_PID > /dev/null 2>&1; then
        echo ""
        fail "App crashed after $((11-i)) seconds"
    fi
    echo "  $i seconds remaining..."
    sleep 1
done

# Check final status
if ! ps -p $APP_PID > /dev/null 2>&1; then
    echo ""
    fail "App crashed during monitoring"
fi

pass "App still running after 10 seconds"

# Kill the app gracefully
echo ""
echo "Closing app..."
killall "VAI Studio" 2>/dev/null || true
sleep 1

# Force kill if still running
if ps -p $APP_PID > /dev/null 2>&1; then
    kill -9 $APP_PID 2>/dev/null || true
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✓✓✓ ALL TESTS PASSED ✓✓✓${NC}"
echo "=================================================="
echo ""
echo "Summary:"
echo "  Tests passed: $TESTS_PASSED"
echo "  Tests failed: $TESTS_FAILED"
echo ""
echo "The bundle is validated and ready for production build."
echo "To create a signed production build, run:"
echo ""
echo "  pnpm run build:mac"
echo ""
