# Quick Build Reference

## Exit Code 144 - FIXED

The timeout issue during code signing has been resolved. Use the commands below.

## Common Build Commands

### Production Build (Recommended)
```bash
./scripts/build-mac-production.sh
```
This script:
- Checks prerequisites
- Runs diagnostics
- Builds React frontend
- Prepares and signs Python bundle
- Builds and signs Electron app
- Verifies signature

### Manual Build
```bash
pnpm run build:mac
```

### Build Without Signing (Testing)
```bash
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build:mac
```

### Diagnose Signing Issues
```bash
./scripts/diagnose-signing.sh
```

## Build Time Estimates

| Phase | Time |
|-------|------|
| React build | 1-2 min |
| Python bundle | 3-5 min |
| Python signing | 3-5 min |
| Electron packaging | 2-3 min |
| App signing | 2-5 min |
| **Total** | **10-20 min** |

## Key Configuration

### Timeout
- **Current**: 3600000ms (1 hour)
- **Previously**: ~600000ms (10 min)
- **Why**: Signing 443 native binaries takes time

### Signing Strategy
1. Pre-sign Python binaries during bundle creation
2. Pre-sign again in afterPack hook (if needed)
3. Final app signing by electron-builder

### Files That Need Signing
- 443 native binaries (.so/.dylib)
- All Electron components
- Total: ~450 signatures

## Troubleshooting

### Exit Code 144
Should not occur anymore. If it does:
1. Run `./scripts/diagnose-signing.sh`
2. Check available RAM (need 8GB+ free)
3. Close other applications
4. Try again

### "No certificate found"
```bash
# List certificates
security find-identity -v -p codesigning

# Import if needed
security import developer-id-application.p12 \
  -k ~/Library/Keychains/login.keychain-db
```

### Build Succeeds but App Won't Open
```bash
# Check signature
codesign -dv --verbose=4 "dist/mac-arm64/VAI Studio.app"

# Check Gatekeeper
spctl -a -vv "dist/mac-arm64/VAI Studio.app"

# If fails: need notarization
```

## Notarization (Optional)

For distribution outside the Mac App Store:

```bash
export APPLE_ID="your@apple.id"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="6L989H4F6A"

pnpm run build:mac
```

Generate app-specific password: https://appleid.apple.com

## Output Files

After successful build:

```
dist/
├── mac-arm64/
│   └── VAI Studio.app          # Signed app bundle
├── VAI Studio-1.0.0-arm64.dmg  # Installer
└── VAI Studio-1.0.0-arm64-mac.zip  # Archive
```

## Environment Variables

### Code Signing
- `CSC_NAME` - Certificate name (auto-detected)
- `CSC_LINK` - Path to .p12 file (optional)
- `CSC_KEY_PASSWORD` - Certificate password (optional)
- `CSC_IDENTITY_AUTO_DISCOVERY` - Set to `false` to skip signing

### Notarization
- `APPLE_ID` - Your Apple ID
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Developer Team ID (6L989H4F6A)

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `build-mac-production.sh` | Full production build with checks |
| `diagnose-signing.sh` | Diagnose signing issues |
| `prepare-python-bundle.sh` | Create and sign Python bundle |
| `sign-python-extensions.sh` | Sign .so/.dylib files |
| `afterPack.js` | electron-builder hook for pre-signing |
| `notarize.js` | electron-builder hook for notarization |

## Documentation

- **Exit Code 144 Fix**: `EXIT_CODE_144_FIX.md`
- **Detailed Signing Guide**: `docs/CODE_SIGNING_LARGE_APPS.md`
- **Auto-Updater**: `odd-core/docs/AUTO_UPDATE_GUIDE.md`
- **Electron Auth**: `odd-core/docs/ELECTRON_AUTH_GUIDE.md`

## Testing the Build

```bash
# Open the app
open "dist/mac-arm64/VAI Studio.app"

# Check signature
codesign -dv --verbose=4 "dist/mac-arm64/VAI Studio.app"

# Check Gatekeeper
spctl -a -vv "dist/mac-arm64/VAI Studio.app"

# Install from DMG
open dist/*.dmg
```

## Clean Build

If you encounter issues:

```bash
# Clean all build artifacts
rm -rf dist dist-react backends-bundle node_modules/.vite

# Reinstall dependencies
pnpm install

# Rebuild
./scripts/build-mac-production.sh
```
