#!/bin/bash

# Prepare Python Bundle for Distribution
# This script creates a clean Python environment ready for bundling

set -e

echo "==================================="
echo "Python Bundle Preparation"
echo "==================================="

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKENDS_DIR="$PROJECT_ROOT/backends"
BUNDLE_DIR="$PROJECT_ROOT/backends-bundle"

echo "Project root: $PROJECT_ROOT"
echo "Backends directory: $BACKENDS_DIR"
echo "Bundle directory: $BUNDLE_DIR"

# Remove old bundle if it exists
if [ -d "$BUNDLE_DIR" ]; then
  echo "Removing old bundle..."
  rm -rf "$BUNDLE_DIR"
fi

# Create bundle directory
echo "Creating bundle directory..."
mkdir -p "$BUNDLE_DIR"

# Copy Python scripts
echo "Copying Python backend scripts..."
cp "$BACKENDS_DIR"/*.py "$BUNDLE_DIR/"

# Create a fresh virtual environment for the bundle
echo "Creating clean virtual environment..."
python3 -m venv "$BUNDLE_DIR/venv"

# Activate the virtual environment
source "$BUNDLE_DIR/venv/bin/activate"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install all dependencies
echo "Installing dependencies..."
pip install -r "$BACKENDS_DIR/requirements.txt"

# Clean up unnecessary files to reduce bundle size
echo "Cleaning up unnecessary files..."
find "$BUNDLE_DIR/venv" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$BUNDLE_DIR/venv" -type f -name "*.pyc" -delete 2>/dev/null || true
find "$BUNDLE_DIR/venv" -type f -name "*.pyo" -delete 2>/dev/null || true
find "$BUNDLE_DIR/venv" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find "$BUNDLE_DIR/venv" -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find "$BUNDLE_DIR/venv" -type d -name "test" -exec rm -rf {} + 2>/dev/null || true

# Remove files that cause code signing issues on macOS
# Static libraries (.a) cannot be properly code signed
# pyvenv.cfg is not needed at runtime and interferes with signing
echo "Removing files that cause code signing issues..."
find "$BUNDLE_DIR/venv" -type f -name "*.a" -delete 2>/dev/null || true
find "$BUNDLE_DIR/venv" -type d -name "config-*-darwin" -exec rm -rf {} + 2>/dev/null || true
rm -f "$BUNDLE_DIR/venv/pyvenv.cfg" 2>/dev/null || true
echo "Code signing cleanup complete."

# Deactivate virtual environment
deactivate

# Fix symlinks for code signing (macOS)
echo ""
echo "==================================="
echo "Fixing symlinks for code signing..."
echo "==================================="
"$PROJECT_ROOT/scripts/fix-python-symlinks.sh" "$BUNDLE_DIR/venv"

# Sign Python native extensions (.so files)
echo ""
echo "==================================="
echo "Signing Python native extensions..."
echo "==================================="
"$PROJECT_ROOT/scripts/sign-python-extensions.sh" "$BUNDLE_DIR/venv"

echo ""
echo "==================================="
echo "Bundle preparation complete!"
echo "Bundle location: $BUNDLE_DIR"
echo "==================================="
echo ""
echo "The bundle is ready to be packaged with your Electron app."
echo "Total bundle size:"
du -sh "$BUNDLE_DIR"
