#!/bin/bash

# Fix Python venv symlinks for macOS code signing
# This script replaces symlinks with actual copies of binaries
# Required for app notarization and distribution

set -e

echo "=========================================="
echo "Fixing Python venv symlinks for codesign"
echo "=========================================="

# Get the venv directory from argument or use default
VENV_DIR="${1:-backends-bundle/venv}"

if [ ! -d "$VENV_DIR" ]; then
  echo "Error: venv directory not found: $VENV_DIR"
  exit 1
fi

echo "Processing venv: $VENV_DIR"

# Function to replace a symlink with a copy
replace_symlink() {
  local link_path="$1"

  if [ -L "$link_path" ]; then
    local target=$(readlink "$link_path")

    echo "  Found symlink: $(basename "$link_path") -> $target"

    # For symlinks, try to follow them to the real file
    # Use Python to resolve the symlink since readlink -f doesn't exist on macOS
    local resolved_target
    if command -v python3 &> /dev/null; then
      resolved_target=$(python3 -c "import os; print(os.path.realpath('$link_path'))" 2>/dev/null || echo "")
    else
      echo "    WARNING: Python3 not found, skipping"
      return
    fi

    if [ -z "$resolved_target" ] || [ ! -e "$resolved_target" ]; then
      echo "    WARNING: Cannot resolve symlink target"
      return
    fi

    # Get absolute path of venv for comparison
    local abs_venv_dir=$(cd "$VENV_DIR" && pwd)

    # Check if the resolved target is outside the venv directory
    if [[ "$resolved_target" != "$abs_venv_dir"* ]]; then
      echo "    → External target: $resolved_target"
      echo "    → Replacing with copy..."

      # Remove the symlink
      rm "$link_path"

      # Copy the actual binary
      cp -a "$resolved_target" "$link_path"

      echo "    ✓ Replaced with copy"
    else
      echo "    → Internal link, keeping as-is"
    fi
  fi
}

# Fix Python binaries in bin/ directory
echo ""
echo "Fixing Python binaries in bin/..."
if [ -d "$VENV_DIR/bin" ]; then
  # Fix python3 symlink (main issue)
  replace_symlink "$VENV_DIR/bin/python3"

  # Fix python symlink if it exists
  if [ -L "$VENV_DIR/bin/python" ]; then
    replace_symlink "$VENV_DIR/bin/python"
  fi

  # Fix any other Python version symlinks (python3.9, python3.10, etc.)
  for py in "$VENV_DIR/bin"/python3.*; do
    if [ -L "$py" ]; then
      replace_symlink "$py"
    fi
  done
fi

# Fix lib symlinks if they exist
echo ""
echo "Checking for lib symlinks..."
if [ -d "$VENV_DIR/lib" ]; then
  # Sometimes lib64 is a symlink to lib
  if [ -L "$VENV_DIR/lib64" ]; then
    echo "  Found lib64 symlink"
    replace_symlink "$VENV_DIR/lib64"
  fi
fi

# Fix include symlinks
echo ""
echo "Checking for include symlinks..."
if [ -d "$VENV_DIR/include" ]; then
  find "$VENV_DIR/include" -type l | while read -r link; do
    replace_symlink "$link"
  done
fi

# Verify no external symlinks remain
echo ""
echo "Verifying no external symlinks remain..."
external_symlinks=0

while IFS= read -r -d '' link; do
  target=$(readlink "$link")
  if [[ "$target" = /* ]] && [[ "$target" != "$VENV_DIR"* ]]; then
    echo "  WARNING: External symlink still exists: $link -> $target"
    external_symlinks=$((external_symlinks + 1))
  fi
done < <(find "$VENV_DIR" -type l -print0)

if [ $external_symlinks -eq 0 ]; then
  echo "  ✓ No external symlinks found"
else
  echo "  ⚠ Found $external_symlinks external symlinks"
  echo "  These may cause code signing issues"
fi

# Show venv info
echo ""
echo "Copying Python3 framework files..."
# Find and copy the Python3 framework library and resources that the binary depends on
PYTHON3_LIB=$(otool -L "$VENV_DIR/bin/python3" 2>/dev/null | grep "@executable_path/../Python3" | awk '{print $1}' | head -1)
if [ -n "$PYTHON3_LIB" ]; then
  echo "  Python binary requires: $PYTHON3_LIB"

  # Find the actual Python3 framework
  PYTHON3_FRAMEWORK_DIR="/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9"

  if [ -d "$PYTHON3_FRAMEWORK_DIR" ]; then
    # Copy Python3 framework library
    echo "  Copying Python3 library..."
    cp "$PYTHON3_FRAMEWORK_DIR/Python3" "$VENV_DIR/Python3"

    # Copy Resources directory (contains Python.app that python3 binary needs)
    if [ -d "$PYTHON3_FRAMEWORK_DIR/Resources" ]; then
      echo "  Copying Resources directory..."
      cp -R "$PYTHON3_FRAMEWORK_DIR/Resources" "$VENV_DIR/Resources"
    fi

    # Copy Python standard library if not already present in venv
    if [ -d "$PYTHON3_FRAMEWORK_DIR/lib/python3.9" ]; then
      echo "  Copying Python standard library..."
      # Merge framework stdlib with venv lib
      cp -R "$PYTHON3_FRAMEWORK_DIR/lib/python3.9"/* "$VENV_DIR/lib/python3.9/" 2>/dev/null || true
    fi

    echo "  ✓ Python3 framework files copied"
  else
    echo "  WARNING: Python3 framework not found at expected location"
  fi
else
  echo "  No Python3 framework dependency found"
fi

echo ""
echo "Python venv info:"
echo "  Python binary: $VENV_DIR/bin/python3"
if [ -f "$VENV_DIR/bin/python3" ]; then
  echo "  Python version: $($VENV_DIR/bin/python3 --version 2>&1 || echo 'N/A')"
  echo "  Binary type: $(file "$VENV_DIR/bin/python3" | cut -d: -f2-)"
fi

echo ""
echo "=========================================="
echo "Symlink fix complete!"
echo "=========================================="
echo ""
echo "The venv is now self-contained and ready for code signing."
