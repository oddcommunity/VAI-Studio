#!/bin/bash
# Development launcher for VAI Studio
# Uses unbundled electron/main.js for faster iteration

echo "Starting VAI Studio in development mode..."
echo ""
echo "NOTE: Running from source (electron/main.js)"
echo "      Changes to main process code will take effect on restart"
echo ""

# Run electron with the development main file
# The --dev flag tells the app to open DevTools
electron electron/main.js --dev
