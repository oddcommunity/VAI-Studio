#!/bin/bash
# VAI Studio Signed Build Script
# Builds, signs, and notarizes the macOS app
#
# Usage: ./scripts/build-signed.sh [--skip-notarize]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=============================================="
echo "VAI Studio Signed Build"
echo "=============================================="
echo ""

# Parse arguments
SKIP_NOTARIZE=false
for arg in "$@"; do
    case $arg in
        --skip-notarize)
            SKIP_NOTARIZE=true
            shift
            ;;
    esac
done

# Load and export credentials
CREDS_FILE="$PROJECT_ROOT/.secrets/credentials.env"
if [ -f "$CREDS_FILE" ]; then
    echo "Loading credentials from .secrets/credentials.env..."

    # Source and export the Apple credentials
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        # Remove any surrounding quotes from value
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"

        # Export Apple-related credentials
        case "$key" in
            APPLE_ID|APPLE_APP_SPECIFIC_PASSWORD|APPLE_TEAM_ID)
                export "$key=$value"
                echo "  ✓ Exported $key"
                ;;
        esac
    done < "$CREDS_FILE"
    echo ""
else
    echo "⚠️  Warning: .secrets/credentials.env not found"
    echo "   Build will proceed without notarization"
    SKIP_NOTARIZE=true
    echo ""
fi

# Verify credentials are set (for notarization)
if [ "$SKIP_NOTARIZE" = false ]; then
    if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
        echo "⚠️  Missing Apple credentials - notarization will be skipped"
        echo "   APPLE_ID: ${APPLE_ID:+✓}${APPLE_ID:-✗}"
        echo "   APPLE_APP_SPECIFIC_PASSWORD: ${APPLE_APP_SPECIFIC_PASSWORD:+✓}${APPLE_APP_SPECIFIC_PASSWORD:-✗}"
        echo "   APPLE_TEAM_ID: ${APPLE_TEAM_ID:+✓}${APPLE_TEAM_ID:-✗}"
        SKIP_NOTARIZE=true
        echo ""
    else
        echo "✓ All Apple credentials loaded for notarization"
        echo ""
    fi
fi

# Clean previous build
echo "Step 1: Cleaning previous build..."
rm -rf "$PROJECT_ROOT/dist/mac-arm64"
rm -f "$PROJECT_ROOT/dist/"*.dmg "$PROJECT_ROOT/dist/"*.zip "$PROJECT_ROOT/dist/"*.yml "$PROJECT_ROOT/dist/"*.blockmap 2>/dev/null || true
echo "  ✓ Cleaned"
echo ""

# Add pnpm wrapper to PATH (prevents OOM in large workspaces)
export PATH="$PROJECT_ROOT/scripts/build-bins:$PATH"
echo "Step 2: Using pnpm wrapper to prevent OOM..."
echo "  PATH includes: $PROJECT_ROOT/scripts/build-bins"
echo ""

# Run the build
echo "Step 3: Running production build..."
echo "=============================================="
cd "$PROJECT_ROOT"

# Run prebuild steps
npm run build:react
npm run prebuild

# Run electron-builder
npx electron-builder --mac

echo ""
echo "=============================================="
echo "Build Complete!"
echo "=============================================="

# Show results
echo ""
echo "Build Artifacts:"
ls -la "$PROJECT_ROOT/dist/"*.dmg "$PROJECT_ROOT/dist/"*.zip 2>/dev/null || echo "  No artifacts found"

echo ""
echo "Signing Status:"
codesign -dv "$PROJECT_ROOT/dist/mac-arm64/VAI Studio.app" 2>&1 | grep -E "Authority|TeamIdentifier" | head -4

if [ "$SKIP_NOTARIZE" = true ]; then
    echo ""
    echo "⚠️  Notarization was skipped"
    echo "   To notarize manually, run:"
    echo "   xcrun notarytool submit dist/VAI\\ Studio-1.0.0-arm64.dmg \\"
    echo "     --apple-id \"\$APPLE_ID\" \\"
    echo "     --password \"\$APPLE_APP_SPECIFIC_PASSWORD\" \\"
    echo "     --team-id \"\$APPLE_TEAM_ID\" --wait"
fi

echo ""
echo "Done!"
