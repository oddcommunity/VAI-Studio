# Protocol Handler Fix for vai-studio://

## Problem

The `vai-studio://` protocol was opening **DaVinci Resolve** (or other Electron apps) instead of **VAI Studio**.

## Root Cause

1. **Missing `CFBundleURLTypes` in Info.plist** - The protocol handler configuration wasn't being included in the built app
2. **Generic bundle ID conflict** - Protocol was registered to `com.github.electron` instead of `com.vaistudio.app`
3. **Launch Services cache** - macOS was using cached protocol handler associations

## Solution

### 1. Added Protocol Configuration to package.json

The `package.json` now includes protocol handler configuration in the `build` section:

```json
{
  "build": {
    "appId": "com.vaistudio.app",
    "productName": "VAI Studio",
    "protocols": {
      "name": "VAI Studio Protocol",
      "schemes": ["vai-studio"]
    },
    // ... rest of config
  }
}
```

This ensures electron-builder adds `CFBundleURLTypes` to the app's Info.plist during the build process.

### 2. Created Fix Script for Installed Apps

For users who already have the app installed without protocol support, run:

```bash
./scripts/fix-protocol-handler.sh
```

This script:
- Verifies VAI Studio is installed
- Adds `CFBundleURLTypes` to the existing Info.plist
- Re-registers the app with Launch Services
- Sets VAI Studio as the default handler for `vai-studio://` URLs
- Clears the Launch Services cache

### 3. Manual Fix (if needed)

If the script doesn't work or you need to fix manually:

```bash
# 1. Add protocol handler to Info.plist
plutil -insert CFBundleURLTypes -xml '<array><dict><key>CFBundleURLName</key><string>VAI Studio Protocol</string><key>CFBundleURLSchemes</key><array><string>vai-studio</string></array></dict></array>' "/Applications/VAI Studio.app/Contents/Info.plist"

# 2. Re-register the app
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "/Applications/VAI Studio.app"

# 3. Install duti (if not already installed)
brew install duti

# 4. Set VAI Studio as default handler
duti -s com.vaistudio.app vai-studio

# 5. Clear Launch Services cache
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
```

## Testing

Test the protocol handler:

```bash
open "vai-studio://test"
```

This should launch VAI Studio (or bring it to the foreground if already running).

Test the auth callback:

```bash
open "vai-studio://auth/callback?code=test123&state=abc456"
```

VAI Studio should launch and process the auth callback.

## Verification

Check which app handles the `vai-studio://` protocol:

```bash
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -dump | grep "vai-studio" -A 3
```

You should see:

```
URL scheme:                 vai-studio
all roles:                  com.vaistudio.app
```

## Important Notes

1. **Code Signing**: Modifying Info.plist on an already-signed app may invalidate the signature and cause macOS to delete the app. Always rebuild the app after making changes to package.json.

2. **Future Builds**: The protocol configuration in package.json ensures all future builds include the protocol handler automatically.

3. **Deep Link Handler**: The Electron main.js file already includes the deep link handler:
   - `app.setAsDefaultProtocolClient('vai-studio')` on lines 54-60
   - `app.on('open-url')` handler on lines 63-67
   - `app.on('second-instance')` for Windows on lines 74-86

## Production Checklist

Before releasing:

- [ ] Verify protocol configuration is in package.json
- [ ] Build app with `pnpm run build:mac`
- [ ] Test protocol handler before signing/notarizing
- [ ] Test protocol handler after signing/notarizing
- [ ] Verify Supabase dashboard has both redirect URLs:
  - `vai-studio://auth/callback`
  - `https://auth.odd.community/callback?app=vai-studio`
- [ ] Test full auth flow from magic link email

## Architecture

**Auth Flow:**
1. User clicks magic link in email
2. Browser opens: `https://auth.odd.community/callback?app=vai-studio&token_hash=...`
3. Bounce page redirects to: `vai-studio://auth/callback?token_hash=...`
4. macOS opens VAI Studio via protocol handler
5. `app.on('open-url')` receives the URL
6. `handleAuthCallback()` processes the token and authenticates the user

This architecture works in both development and production without requiring localhost servers.
