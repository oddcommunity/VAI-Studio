#!/bin/bash

# Generate build info with current date
# This runs automatically during build to embed the build date

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_INFO_FILE="$PROJECT_ROOT/src/build-info.json"

# Get version from package.json
VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")

# Get current date in a nice format
BUILD_DATE=$(date "+%Y-%m-%d")
BUILD_TIMESTAMP=$(date "+%Y-%m-%dT%H:%M:%S%z")

# Generate build info JSON
cat > "$BUILD_INFO_FILE" << EOF
{
  "version": "$VERSION",
  "buildDate": "$BUILD_DATE",
  "buildTimestamp": "$BUILD_TIMESTAMP"
}
EOF

echo "[Build Info] Generated: $BUILD_INFO_FILE"
echo "[Build Info] Version: $VERSION"
echo "[Build Info] Build Date: $BUILD_DATE"
