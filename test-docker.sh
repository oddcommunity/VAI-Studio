#!/bin/bash

# LocalVoice AI - Docker Environment Test Script
# This script tests the Docker development environment

set -e

echo "======================================"
echo "LocalVoice AI - Docker Environment Test"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo -n "Checking Docker installation... "
if ! command -v docker &> /dev/null; then
    echo -e "${RED}FAILED${NC}"
    echo "Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}OK${NC}"

# Check if Docker Compose is installed
echo -n "Checking Docker Compose installation... "
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}FAILED${NC}"
    echo "Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi
echo -e "${GREEN}OK${NC}"

# Check if Docker daemon is running
echo -n "Checking if Docker daemon is running... "
if ! docker info &> /dev/null; then
    echo -e "${RED}FAILED${NC}"
    echo "Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi
echo -e "${GREEN}OK${NC}"

echo ""
echo "======================================"
echo "Building Docker Image"
echo "======================================"
echo ""

# Build the Docker image
echo "Building LocalVoice AI Docker image (this may take a few minutes)..."
docker-compose build localvoice-test

echo ""
echo "======================================"
echo "Testing Python Backend"
echo "======================================"
echo ""

# Test 1: List backends
echo "Test 1: Listing available backends..."
docker-compose run --rm localvoice-test /bin/bash -c ". /app/venv/bin/activate && python3 backends/runner.py list-backends"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend listing test passed${NC}"
else
    echo -e "${RED}✗ Backend listing test failed${NC}"
    exit 1
fi

echo ""

# Test 2: List Whisper models
echo "Test 2: Listing Whisper models..."
docker-compose run --rm localvoice-test /bin/bash -c ". /app/venv/bin/activate && python3 backends/runner.py list-models whisper"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Whisper model listing test passed${NC}"
else
    echo -e "${RED}✗ Whisper model listing test failed${NC}"
    exit 1
fi

echo ""

# Test 3: Check Node.js environment
echo "Test 3: Checking Node.js environment..."
docker-compose run --rm localvoice-test node --version

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Node.js environment test passed${NC}"
else
    echo -e "${RED}✗ Node.js environment test failed${NC}"
    exit 1
fi

echo ""

# Test 4: Check npm dependencies
echo "Test 4: Checking npm dependencies..."
docker-compose run --rm localvoice-test npm list electron

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ npm dependencies test passed${NC}"
else
    echo -e "${YELLOW}⚠ Some npm dependencies may be missing${NC}"
fi

echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo ""
echo -e "${GREEN}All critical tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Run 'docker-compose up localvoice-dev' to start the development environment"
echo "2. For headless backend testing: 'docker-compose run --rm localvoice-test'"
echo "3. To run a specific test: 'docker-compose run --rm localvoice-test <command>'"
echo ""
echo "For GUI testing on macOS:"
echo "1. Install XQuartz: 'brew install --cask xquartz'"
echo "2. Configure X11 forwarding: 'xhost +localhost'"
echo "3. Run: 'DISPLAY=:0 docker-compose up localvoice-dev'"
echo ""
