#!/bin/bash
#
# Gatekeeper Verification Script
#
# Validates that a signed and notarized app will pass macOS Gatekeeper.
# This MUST be run after notarization to catch issues before release.
#
# Exit codes:
#   0 - App passes Gatekeeper assessment
#   1 - App would be blocked by Gatekeeper
#   2 - Script error (missing args, file not found, etc.)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  GATEKEEPER VERIFICATION"
echo "========================================"
echo ""

if [ -z "$1" ]; then
    echo -e "${RED}ERROR: No app path provided${NC}"
    echo "Usage: $0 /path/to/App.app"
    exit 2
fi

APP_PATH="$1"

if [ ! -e "$APP_PATH" ]; then
    echo -e "${RED}ERROR: Path does not exist: $APP_PATH${NC}"
    exit 2
fi

# If DMG, mount it first
MOUNTED_DMG=""
if [[ "$APP_PATH" == *.dmg ]]; then
    echo -e "${CYAN}Mounting DMG...${NC}"
    MOUNT_OUTPUT=$(hdiutil attach "$APP_PATH" -nobrowse -readonly 2>&1)
    MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | grep "/Volumes/" | awk '{print $NF}')
    
    if [ -z "$MOUNT_POINT" ]; then
        echo -e "${RED}ERROR: Failed to mount DMG${NC}"
        exit 2
    fi
    
    MOUNTED_DMG="$MOUNT_POINT"
    APP_PATH=$(find "$MOUNT_POINT" -maxdepth 1 -name "*.app" -type d | head -1)
    
    if [ -z "$APP_PATH" ]; then
        echo -e "${RED}ERROR: No .app found in DMG${NC}"
        hdiutil detach "$MOUNT_POINT" -quiet
        exit 2
    fi
fi

cleanup() {
    if [ -n "$MOUNTED_DMG" ]; then
        hdiutil detach "$MOUNTED_DMG" -quiet 2>/dev/null || true
    fi
}
trap cleanup EXIT

echo -e "${CYAN}Verifying: $APP_PATH${NC}"
echo ""

ERRORS=0

# 1. Code Signature Verification
echo -e "${BOLD}1. Code Signature Verification${NC}"
if codesign --verify --deep --strict "$APP_PATH" 2>&1; then
    echo -e "  ${GREEN}✅ Code signature is valid${NC}"
else
    echo -e "  ${RED}❌ Code signature verification FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2. Notarization Staple Check
echo ""
echo -e "${BOLD}2. Notarization Staple Check${NC}"
STAPLE_CHECK=$(stapler validate "$APP_PATH" 2>&1 || true)
if echo "$STAPLE_CHECK" | grep -q "The validate action worked"; then
    echo -e "  ${GREEN}✅ Notarization ticket is stapled${NC}"
else
    echo -e "  ${YELLOW}⚠️  Notarization ticket not stapled (may still work online)${NC}"
fi

# 3. Gatekeeper Assessment (CRITICAL)
echo ""
echo -e "${BOLD}3. Gatekeeper Assessment (CRITICAL)${NC}"
SPCTL_OUTPUT=$(spctl --assess --type execute -vvv "$APP_PATH" 2>&1 || true)

if echo "$SPCTL_OUTPUT" | grep -q "accepted"; then
    echo -e "  ${GREEN}✅ Gatekeeper: ACCEPTED${NC}"
    echo "$SPCTL_OUTPUT" | grep -E "(source=|origin=)" | sed 's/^/  /' || true
elif echo "$SPCTL_OUTPUT" | grep -q "rejected"; then
    echo -e "  ${RED}❌ Gatekeeper: REJECTED${NC}"
    echo "$SPCTL_OUTPUT" | sed 's/^/  /'
    ERRORS=$((ERRORS + 1))
else
    echo -e "  ${YELLOW}⚠️  Gatekeeper assessment unclear${NC}"
    echo "$SPCTL_OUTPUT" | sed 's/^/  /'
fi

# 4. Hardened Runtime
echo ""
echo -e "${BOLD}4. Hardened Runtime Check${NC}"
SIGNING_INFO=$(codesign -dv "$APP_PATH" 2>&1 || true)
if echo "$SIGNING_INFO" | grep -q "flags=0x10000(runtime)"; then
    echo -e "  ${GREEN}✅ Hardened runtime is enabled${NC}"
else
    echo -e "  ${YELLOW}⚠️  Hardened runtime may not be enabled${NC}"
fi

# Summary
echo ""
echo "========================================"
echo "  VERIFICATION SUMMARY"
echo "========================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ All Gatekeeper checks passed!${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}❌ $ERRORS check(s) failed - app may be blocked${NC}"
    exit 1
fi
