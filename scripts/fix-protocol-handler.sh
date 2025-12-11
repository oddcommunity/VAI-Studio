#!/bin/bash
# Fix VAI Studio protocol handler registration
# Run this if vai-studio:// links open DaVinci Resolve or other apps instead of VAI Studio

set -e

echo "======================================"
echo "VAI Studio Protocol Handler Fix"
echo "======================================"
echo ""

# Check if VAI Studio is installed
if [ ! -d "/Applications/VAI Studio.app" ]; then
  echo "❌ VAI Studio is not installed in /Applications"
  echo "Please install VAI Studio first."
  exit 1
fi

echo "✓ VAI Studio found"

# Check if Info.plist has protocol handler
if plutil -p "/Applications/VAI Studio.app/Contents/Info.plist" | grep -q "CFBundleURLTypes"; then
  echo "✓ Protocol handler is configured in Info.plist"
else
  echo "⚠️  Protocol handler missing from Info.plist"
  echo "Adding protocol handler configuration..."

  plutil -insert CFBundleURLTypes -xml '<array><dict><key>CFBundleURLName</key><string>VAI Studio Protocol</string><key>CFBundleURLSchemes</key><array><string>vai-studio</string></array></dict></array>' "/Applications/VAI Studio.app/Contents/Info.plist"

  echo "✓ Protocol handler added to Info.plist"
fi

echo ""
echo "Re-registering app with Launch Services..."
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "/Applications/VAI Studio.app"

echo "Setting VAI Studio as default handler for vai-studio:// protocol..."

# Check if duti is installed
if ! command -v duti &> /dev/null; then
  echo "⚠️  duti not found. Installing via Homebrew..."
  if command -v brew &> /dev/null; then
    brew install duti --quiet
  else
    echo "❌ Homebrew not found. Please install Homebrew first: https://brew.sh"
    exit 1
  fi
fi

# Set VAI Studio as default handler
duti -s com.vaistudio.app vai-studio

echo ""
echo "Clearing Launch Services cache..."
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user

echo ""
echo "======================================"
echo "✅ Protocol handler fix complete!"
echo "======================================"
echo ""
echo "Testing: vai-studio:// links should now open VAI Studio"
echo ""
echo "You can verify by running:"
echo "  open 'vai-studio://test'"
echo ""
