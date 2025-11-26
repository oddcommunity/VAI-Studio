#!/bin/bash

# Python Wrapper for Packaged App
# Sets PYTHONHOME to ensure Python finds its standard library

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine if we're in a packaged app or development
if [[ "$SCRIPT_DIR" == *"/Contents/Resources/"* ]]; then
  # Packaged app: Resources/scripts/python-wrapper.sh
  RESOURCES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  export PYTHONHOME="$RESOURCES_DIR/backends/venv"
  PYTHON_BIN="$PYTHONHOME/bin/python"
else
  # Development: use backends-bundle
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
  export PYTHONHOME="$PROJECT_ROOT/backends-bundle/venv"
  PYTHON_BIN="$PYTHONHOME/bin/python"
fi

# Execute Python with all arguments passed to this script
exec "$PYTHON_BIN" "$@"
