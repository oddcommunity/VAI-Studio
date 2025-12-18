#!/bin/bash
set -e

# Bundle Electron main process with esbuild
# This eliminates dependency on node_modules at runtime

echo "=================================================="
echo "Bundling Electron processes"
echo "=================================================="

# Ensure esbuild is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Check if esbuild is available
if ! node -e "require('esbuild')" 2>/dev/null; then
    echo "Installing esbuild..."
    pnpm add -D esbuild
fi

# Run the esbuild configuration
node esbuild.config.js

echo ""
echo "✓ Bundling complete"
echo ""
