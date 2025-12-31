#!/bin/bash

# =============================================================================
# VAI Studio Release Upload Script
# =============================================================================
# This script:
# 1. Builds the app for the specified platform
# 2. Calculates SHA512 hashes of built artifacts
# 3. Uploads artifacts to VPS (updates.odd.community)
# 4. Updates the manifest files with correct hashes and sizes
#
# Usage:
#   ./scripts/release-upload.sh [platform] [options]
#
# Platforms:
#   mac     - Build and upload macOS (arm64)
#   win     - Build and upload Windows (x64)
#   linux   - Build and upload Linux (x64)
#   all     - Build and upload all platforms
#
# Options:
#   --skip-build    Skip building, use existing artifacts in dist/
#   --dry-run       Show what would be uploaded without actually uploading
#
# Prerequisites:
#   - SSH access to VPS (31.97.67.43)
#   - For signed builds: CSC_LINK, CSC_KEY_PASSWORD, APPLE_* env vars
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="31.97.67.43"
VPS_USER="root"
VPS_PATH="/var/www/updates/releases/vai-studio"
VERSION=$(node -p "require('./package.json').version")
RELEASE_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Parse arguments
PLATFORM="${1:-mac}"
SKIP_BUILD=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
  esac
done

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  VAI Studio Release Upload v${VERSION}${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""
echo "Platform: $PLATFORM"
echo "Skip build: $SKIP_BUILD"
echo "Dry run: $DRY_RUN"
echo ""

# Function to calculate SHA512
calc_sha512() {
  local file="$1"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    shasum -a 512 "$file" | awk '{print $1}'
  else
    sha512sum "$file" | awk '{print $1}'
  fi
}

# Function to get file size
get_file_size() {
  local file="$1"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    stat -f%z "$file"
  else
    stat -c%s "$file"
  fi
}

# Function to upload file to VPS
upload_file() {
  local local_path="$1"
  local remote_subdir="$2"
  local filename=$(basename "$local_path")

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Would upload: $filename to $remote_subdir/${NC}"
  else
    echo -e "${BLUE}Uploading: $filename${NC}"
    scp -o StrictHostKeyChecking=no "$local_path" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/${remote_subdir}/"
    echo -e "${GREEN}✓ Uploaded $filename${NC}"
  fi
}

# Function to update manifest on VPS
update_manifest() {
  local manifest_file="$1"
  local content="$2"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Would update: $manifest_file${NC}"
    echo "$content"
  else
    echo -e "${BLUE}Updating manifest: $manifest_file${NC}"
    ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "cat > ${VPS_PATH}/${manifest_file}" << EOF
$content
EOF
    echo -e "${GREEN}✓ Updated $manifest_file${NC}"
  fi
}

# Build if needed
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${BLUE}Building for $PLATFORM...${NC}"
  case $PLATFORM in
    mac)
      pnpm run build:mac
      ;;
    win)
      pnpm run build:win
      ;;
    linux)
      pnpm run build:linux
      ;;
    all)
      pnpm run build:all
      ;;
    *)
      echo -e "${RED}Unknown platform: $PLATFORM${NC}"
      exit 1
      ;;
  esac
fi

echo ""
echo -e "${BLUE}Processing release artifacts...${NC}"
echo ""

# Process macOS
if [[ "$PLATFORM" == "mac" || "$PLATFORM" == "all" ]]; then
  echo -e "${BLUE}=== macOS (arm64) ===${NC}"

  # Find the DMG file
  DMG_FILE=$(find dist -name "*.dmg" -type f 2>/dev/null | head -1)
  ZIP_FILE=$(find dist -name "*-arm64.zip" -type f 2>/dev/null | head -1)

  if [ -n "$DMG_FILE" ]; then
    DMG_NAME=$(basename "$DMG_FILE")
    DMG_SHA512=$(calc_sha512 "$DMG_FILE")
    DMG_SIZE=$(get_file_size "$DMG_FILE")

    echo "  DMG: $DMG_NAME"
    echo "  Size: $DMG_SIZE bytes"
    echo "  SHA512: ${DMG_SHA512:0:32}..."

    # Upload DMG
    upload_file "$DMG_FILE" "mac"

    # Also upload ZIP if exists
    if [ -n "$ZIP_FILE" ]; then
      ZIP_NAME=$(basename "$ZIP_FILE")
      ZIP_SHA512=$(calc_sha512 "$ZIP_FILE")
      ZIP_SIZE=$(get_file_size "$ZIP_FILE")
      echo "  ZIP: $ZIP_NAME ($ZIP_SIZE bytes)"
      upload_file "$ZIP_FILE" "mac"
    fi

    # Archive old version on VPS
    if [ "$DRY_RUN" = false ]; then
      ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "
        # Move old files to archive (if any)
        find ${VPS_PATH}/mac -name '*.dmg' -mmin +5 -exec mv {} ${VPS_PATH}/archive/ \; 2>/dev/null || true
        find ${VPS_PATH}/mac -name '*.zip' -mmin +5 -exec mv {} ${VPS_PATH}/archive/ \; 2>/dev/null || true
      " 2>/dev/null || true
    fi

    # Update manifest
    MANIFEST_CONTENT="# VAI Studio macOS Update Manifest
# Auto-generated by release-upload.sh on $(date)
version: ${VERSION}
files:
  - url: mac/${DMG_NAME}
    sha512: ${DMG_SHA512}
    size: ${DMG_SIZE}
path: mac/${DMG_NAME}
sha512: ${DMG_SHA512}
releaseDate: \"${RELEASE_DATE}\""

    update_manifest "latest-mac.yml" "$MANIFEST_CONTENT"
  else
    echo -e "${RED}No DMG found in dist/${NC}"
  fi
  echo ""
fi

# Process Windows
if [[ "$PLATFORM" == "win" || "$PLATFORM" == "all" ]]; then
  echo -e "${BLUE}=== Windows (x64) ===${NC}"

  # Find the NSIS installer
  EXE_FILE=$(find dist -name "*.exe" -type f 2>/dev/null | grep -v "portable" | head -1)

  if [ -n "$EXE_FILE" ]; then
    EXE_NAME=$(basename "$EXE_FILE")
    EXE_SHA512=$(calc_sha512 "$EXE_FILE")
    EXE_SIZE=$(get_file_size "$EXE_FILE")

    echo "  EXE: $EXE_NAME"
    echo "  Size: $EXE_SIZE bytes"
    echo "  SHA512: ${EXE_SHA512:0:32}..."

    # Upload EXE
    upload_file "$EXE_FILE" "win"

    # Update manifest
    MANIFEST_CONTENT="# VAI Studio Windows Update Manifest
# Auto-generated by release-upload.sh on $(date)
version: ${VERSION}
files:
  - url: win/${EXE_NAME}
    sha512: ${EXE_SHA512}
    size: ${EXE_SIZE}
path: win/${EXE_NAME}
sha512: ${EXE_SHA512}
releaseDate: \"${RELEASE_DATE}\""

    update_manifest "latest.yml" "$MANIFEST_CONTENT"
  else
    echo -e "${YELLOW}No Windows EXE found in dist/${NC}"
  fi
  echo ""
fi

# Process Linux
if [[ "$PLATFORM" == "linux" || "$PLATFORM" == "all" ]]; then
  echo -e "${BLUE}=== Linux (x64) ===${NC}"

  # Find the AppImage
  APPIMAGE_FILE=$(find dist -name "*.AppImage" -type f 2>/dev/null | head -1)

  if [ -n "$APPIMAGE_FILE" ]; then
    APPIMAGE_NAME=$(basename "$APPIMAGE_FILE")
    APPIMAGE_SHA512=$(calc_sha512 "$APPIMAGE_FILE")
    APPIMAGE_SIZE=$(get_file_size "$APPIMAGE_FILE")

    echo "  AppImage: $APPIMAGE_NAME"
    echo "  Size: $APPIMAGE_SIZE bytes"
    echo "  SHA512: ${APPIMAGE_SHA512:0:32}..."

    # Upload AppImage
    upload_file "$APPIMAGE_FILE" "linux"

    # Update manifest
    MANIFEST_CONTENT="# VAI Studio Linux Update Manifest
# Auto-generated by release-upload.sh on $(date)
version: ${VERSION}
files:
  - url: linux/${APPIMAGE_NAME}
    sha512: ${APPIMAGE_SHA512}
    size: ${APPIMAGE_SIZE}
path: linux/${APPIMAGE_NAME}
sha512: ${APPIMAGE_SHA512}
releaseDate: \"${RELEASE_DATE}\""

    update_manifest "latest-linux.yml" "$MANIFEST_CONTENT"
  else
    echo -e "${YELLOW}No Linux AppImage found in dist/${NC}"
  fi
  echo ""
fi

echo -e "${BLUE}=============================================${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN COMPLETE - No files were uploaded${NC}"
else
  echo -e "${GREEN}RELEASE UPLOAD COMPLETE${NC}"
  echo ""
  echo "Update manifests:"
  echo "  macOS:   https://updates.odd.community/releases/vai-studio/latest-mac.yml"
  echo "  Windows: https://updates.odd.community/releases/vai-studio/latest.yml"
  echo "  Linux:   https://updates.odd.community/releases/vai-studio/latest-linux.yml"
fi
echo -e "${BLUE}=============================================${NC}"
