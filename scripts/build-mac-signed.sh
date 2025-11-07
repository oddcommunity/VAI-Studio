#!/bin/bash

# VAI Studio - macOS Signed Build Script
# This script builds and notarizes the macOS app

set -e  # Exit on error

echo "======================================"
echo "VAI Studio - macOS Build & Notarization"
echo "======================================"
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script must be run on macOS"
    exit 1
fi

# Verify certificate is installed
echo "🔍 Checking for code signing certificate..."
if security find-identity -v -p codesigning | grep -q "Developer ID Application: Henry Love"; then
    echo "✅ Certificate found: Developer ID Application: Henry Love (6L989H4F6A)"
else
    echo "❌ Error: Code signing certificate not found"
    echo "Please install your Developer ID Application certificate"
    exit 1
fi

# Check if environment variables are set
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_ID_PASSWORD" ]; then
    echo ""
    echo "⚠️  Notarization credentials not found in environment"
    echo ""
    echo "To enable notarization, you need to:"
    echo "1. Go to https://appleid.apple.com"
    echo "2. Generate an app-specific password"
    echo "3. Set these environment variables:"
    echo ""
    echo "   export APPLE_ID=\"henrylove11@protonmail.com\""
    echo "   export APPLE_ID_PASSWORD=\"xxxx-xxxx-xxxx-xxxx\""
    echo ""
    read -p "Continue without notarization? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo ""
    echo "⚠️  Building WITHOUT notarization..."
    echo "Note: App will show security warnings on macOS 10.15+"
    export SKIP_NOTARIZATION=true
else
    echo "✅ Apple ID found: $APPLE_ID"
    echo "✅ App-specific password is set"
    echo "✅ Will notarize after build"
fi

echo ""
echo "🏗️  Starting build process..."
echo ""

# Change to project directory
cd "$(dirname "$0")/.."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/

# Run prebuild script (prepare Python bundle)
echo "📦 Preparing Python bundle..."
npm run prebuild

# Build macOS app
echo "🔨 Building macOS app..."
if [ "$SKIP_NOTARIZATION" = true ]; then
    # Build without notarization
    npm run build:mac
else
    # Build with notarization
    APPLE_TEAM_ID="6L989H4F6A" npm run build:mac
fi

echo ""
echo "======================================"
echo "✅ Build Complete!"
echo "======================================"
echo ""

if [ -f "dist/VAI Studio-3.0.0.dmg" ]; then
    echo "📦 Built files:"
    ls -lh dist/*.dmg dist/*.zip 2>/dev/null || true
    echo ""
    echo "Location: $(pwd)/dist/"
    echo ""

    if [ "$SKIP_NOTARIZATION" = true ]; then
        echo "⚠️  Note: App is signed but NOT notarized"
        echo "Users on macOS 10.15+ may see security warnings"
    else
        echo "✅ App is signed and notarized"
        echo "Ready for distribution!"
    fi
else
    echo "❌ Build failed - DMG not found"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Test the app: open 'dist/VAI Studio-3.0.0.dmg'"
echo "2. Upload to GitHub Release: https://github.com/oddcommunity/VAI-Studio/releases"
echo ""
