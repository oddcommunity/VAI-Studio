#!/bin/bash

# LocalVoice AI - Local Run Script with Isolated Python Environment
# This script runs the Electron GUI natively while keeping Python dependencies isolated

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/venv_local"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "======================================"
echo "LocalVoice AI - Local Development Mode"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    echo "Please install Python 3 from https://www.python.org/"
    exit 1
fi

echo -e "${BLUE}Node.js version:${NC} $(node --version)"
echo -e "${BLUE}npm version:${NC} $(npm --version)"
echo -e "${BLUE}Python version:${NC} $(python3 --version)"
echo ""

# Install Node.js dependencies if needed
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
    echo ""
fi

# Setup Python virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating isolated Python virtual environment...${NC}"
    python3 -m venv "$VENV_DIR"
    echo -e "${GREEN}✓ Virtual environment created at: $VENV_DIR${NC}"
    echo ""
fi

# Activate virtual environment
echo -e "${BLUE}Activating Python virtual environment...${NC}"
source "$VENV_DIR/bin/activate"

# Install/Update Python dependencies
echo -e "${YELLOW}Installing Python dependencies (this may take a few minutes first time)...${NC}"
pip install --upgrade pip -q

# Install core dependencies
echo "  → Installing openai-whisper..."
pip install openai-whisper -q

echo "  → Installing PyTorch (CPU version)..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu -q

echo "  → Installing transformers..."
pip install transformers -q

echo "  → Installing audio processing libraries..."
pip install librosa soundfile ffmpeg-python numpy scipy -q

echo -e "${GREEN}✓ Python dependencies installed${NC}"
echo ""

# Show what's isolated
echo -e "${BLUE}Isolation Status:${NC}"
echo "  → Python environment: $VENV_DIR (isolated)"
echo "  → Node.js modules: ./node_modules (project-specific)"
echo "  → Your other projects: Unaffected ✓"
echo ""

# Launch the app
echo -e "${GREEN}======================================"
echo "Launching LocalVoice AI..."
echo "======================================${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the app${NC}"
echo ""

# Run Electron in dev mode
npm run dev

# Cleanup message when app closes
echo ""
echo -e "${GREEN}App closed.${NC}"
echo ""
echo "To remove the isolated Python environment later:"
echo "  rm -rf $VENV_DIR"
echo ""
