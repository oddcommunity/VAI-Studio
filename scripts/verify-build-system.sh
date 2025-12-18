#!/bin/bash
# Verification script for VAI Studio build system
# Run this to ensure the bundling system is correctly set up

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo "VAI Studio Build System Verification"
echo "=================================================="
echo ""

ERRORS=0

# Check if esbuild is installed
echo -n "Checking esbuild installation... "
if node -e "require('esbuild')" 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: esbuild not installed"
    echo "  Fix: pnpm add -D -w esbuild"
    ERRORS=$((ERRORS + 1))
fi

# Check if esbuild.config.js exists
echo -n "Checking esbuild.config.js... "
if [ -f "esbuild.config.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: esbuild.config.js not found"
    ERRORS=$((ERRORS + 1))
fi

# Check if bundle script exists and is executable
echo -n "Checking bundle-electron.sh... "
if [ -x "scripts/bundle-electron.sh" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: scripts/bundle-electron.sh missing or not executable"
    echo "  Fix: chmod +x scripts/bundle-electron.sh"
    ERRORS=$((ERRORS + 1))
fi

# Check if dependency checker exists
echo -n "Checking check-dependencies.js... "
if [ -f "scripts/check-dependencies.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: scripts/check-dependencies.js not found"
    ERRORS=$((ERRORS + 1))
fi

# Check if smoke test exists and is executable
echo -n "Checking smoke-test.sh... "
if [ -x "scripts/smoke-test.sh" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: scripts/smoke-test.sh missing or not executable"
    echo "  Fix: chmod +x scripts/smoke-test.sh"
    ERRORS=$((ERRORS + 1))
fi

# Check package.json main field
echo -n "Checking package.json main field... "
MAIN_FIELD=$(node -e "console.log(require('./package.json').main)")
if [ "$MAIN_FIELD" = "dist-electron/main.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: package.json main should be 'dist-electron/main.js'"
    echo "  Current: $MAIN_FIELD"
    ERRORS=$((ERRORS + 1))
fi

# Check if npm scripts are defined
echo -n "Checking npm scripts... "
MISSING_SCRIPTS=()
if ! node -e "const pkg = require('./package.json'); process.exit(pkg.scripts['bundle:electron'] ? 0 : 1)" 2>/dev/null; then
    MISSING_SCRIPTS+=("bundle:electron")
fi
if ! node -e "const pkg = require('./package.json'); process.exit(pkg.scripts['check:deps'] ? 0 : 1)" 2>/dev/null; then
    MISSING_SCRIPTS+=("check:deps")
fi
if ! node -e "const pkg = require('./package.json'); process.exit(pkg.scripts['smoke-test'] ? 0 : 1)" 2>/dev/null; then
    MISSING_SCRIPTS+=("smoke-test")
fi

if [ ${#MISSING_SCRIPTS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: Missing npm scripts: ${MISSING_SCRIPTS[*]}"
    ERRORS=$((ERRORS + 1))
fi

# Try to bundle
echo ""
echo "Testing bundling process..."
if ./scripts/bundle-electron.sh > /tmp/vai-bundle-test.log 2>&1; then
    echo -e "${GREEN}✓ Bundling successful${NC}"

    # Check if output files exist
    if [ -f "dist-electron/main.js" ] && [ -f "dist-electron/preload.js" ]; then
        echo -e "${GREEN}✓ Bundle files created${NC}"

        # Check bundle size
        BUNDLE_SIZE=$(stat -f%z "dist-electron/main.js" 2>/dev/null || stat -c%s "dist-electron/main.js")
        BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024 / 1024))

        if [ $BUNDLE_SIZE_MB -lt 1 ]; then
            echo -e "${RED}✗ Bundle size too small ($BUNDLE_SIZE_MB MB)${NC}"
            echo "  This might indicate bundling issues"
            ERRORS=$((ERRORS + 1))
        elif [ $BUNDLE_SIZE_MB -gt 10 ]; then
            echo -e "${YELLOW}⚠ Bundle size large ($BUNDLE_SIZE_MB MB)${NC}"
            echo "  Consider externalizing some dependencies"
        else
            echo -e "${GREEN}✓ Bundle size reasonable ($BUNDLE_SIZE_MB MB)${NC}"
        fi
    else
        echo -e "${RED}✗ Bundle files not created${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ Bundling failed${NC}"
    echo "  Check log: /tmp/vai-bundle-test.log"
    ERRORS=$((ERRORS + 1))
fi

# Run dependency checker if bundle succeeded
if [ -f "dist-electron/main.js" ]; then
    echo ""
    echo "Checking dependencies..."
    if node scripts/check-dependencies.js > /tmp/vai-deps-check.log 2>&1; then
        echo -e "${GREEN}✓ All dependencies verified${NC}"
    else
        echo -e "${RED}✗ Dependency check failed${NC}"
        echo "  Check log: /tmp/vai-deps-check.log"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Summary
echo ""
echo "=================================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ BUILD SYSTEM VERIFICATION PASSED${NC}"
    echo "=================================================="
    echo ""
    echo "Everything looks good! You can now:"
    echo "  1. Run smoke test: pnpm run smoke-test"
    echo "  2. Build production: pnpm run build:mac"
    echo ""
else
    echo -e "${RED}✗ VERIFICATION FAILED ($ERRORS errors)${NC}"
    echo "=================================================="
    echo ""
    echo "Fix the errors above and run this script again."
    echo ""
    exit 1
fi
