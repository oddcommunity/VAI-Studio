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

    # Check if target is an absolute path outside the venv
    if [[ "$target" = /* ]] && [[ "$target" != "$VENV_DIR"* ]]; then
      echo "  Replacing symlink: $(basename "$link_path") -> $target"

      # Check if target exists
      if [ ! -e "$target" ]; then
        echo "    WARNING: Target does not exist: $target"
        return
      fi

      # Remove the symlink
      rm "$link_path"

      # Copy the actual binary
      cp -a "$target" "$link_path"

      echo "    ✓ Replaced with copy"
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
echo "Python venv info:"
echo "  Python binary: $VENV_DIR/bin/python3"
if [ -f "$VENV_DIR/bin/python3" ]; then
  echo "  Python version: $($VENV_DIR/bin/python3 --version)"
  echo "  Binary type: $(file "$VENV_DIR/bin/python3" | cut -d: -f2-)"
fi

echo ""
echo "=========================================="
echo "Symlink fix complete!"
echo "=========================================="
echo ""
echo "The venv is now self-contained and ready for code signing."
