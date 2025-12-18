# Exit Code 144 Fix Summary

## Problem
macOS code signing fails with exit code 144 when building VAI Studio. This is a **timeout error** caused by signing 22,022 files including 444 native binaries (.so and .dylib files) in the bundled Python virtual environment.

## Root Cause
- **Bundle size**: 939MB
- **Total files**: 22,022
- **Native binaries**: 444 (.so/.dylib files from PyTorch, NumPy, etc.)
- **Timeout**: Default electron-builder timeout is too short for this workload
- **Exit code 144**: macOS ETIMEDOUT when codesign exhausts resources

## Solution Implemented

### 1. Two-Stage Signing Process

**Stage 1: Pre-sign during bundle creation** (`prepare-python-bundle.sh`)
- Signs all `.so` and `.dylib` files immediately after pip install
- Uses hardened runtime and entitlements
- Reduces workload for electron-builder

**Stage 2: Final signing by electron-builder**
- Extended timeout (1 hour)
- Only signs remaining app components
- Most binaries already signed from Stage 1

### 2. Configuration Changes

#### package.json
```json
{
  "build": {
    "mac": {
      "timeout": 3600000,  // 1 hour (was default ~10min)
      "signIgnore": [      // Skip .pyc and cache files
        "venv/.*\\.pyc$",
        "venv/.*__pycache__"
      ]
    },
    "afterPack": "scripts/afterPack.js"  // Pre-sign hook
  }
}
```

### 3. New/Updated Scripts

| Script | Purpose |
|--------|---------|
| `scripts/sign-python-extensions.sh` | Pre-signs native binaries during bundle creation (UPDATED) |
| `scripts/afterPack.js` | Pre-signs binaries after electron-builder packs the app (NEW) |
| `scripts/sign-python-binaries.sh` | Standalone signing script for afterPack hook (NEW) |
| `scripts/diagnose-signing.sh` | Diagnostic tool for signing issues (NEW) |

## Testing the Fix

### 1. Run Diagnostics
```bash
./scripts/diagnose-signing.sh
```

This checks:
- Certificate presence
- Bundle size and file counts
- Signing configuration
- Environment variables

### 2. Build with Signing
```bash
# Full production build
pnpm run build:mac

# Expected flow:
# 1. prepare-python-bundle.sh creates venv and pre-signs binaries
# 2. electron-builder packs the app
# 3. afterPack.js re-signs any unsigned binaries
# 4. electron-builder does final app signing (fast, most work done)
# 5. notarize.js submits to Apple (if env vars set)
```

### 3. Build Without Signing (Testing)
```bash
# Skip code signing entirely
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build:mac
```

### 4. Verify Signing
```bash
# Check that binaries are signed with hardened runtime
find "dist/mac-arm64/VAI Studio.app/Contents/Resources/backends/venv" \
  -type f \( -name "*.so" -o -name "*.dylib" \) \
  -exec codesign -dv {} \; 2>&1 | grep "runtime"

# Should show: flags=0x10000(runtime) for each binary
```

## Key Improvements

1. **Timeout Extended**: 3600000ms (1 hour) vs default ~10 minutes
2. **Pre-signing**: Most binaries signed during bundle creation, not during final build
3. **Progress Feedback**: Scripts show progress instead of silent timeout
4. **Hardened Runtime**: All binaries now signed with `--options runtime` for notarization
5. **Diagnostics**: Easy troubleshooting with `diagnose-signing.sh`

## Troubleshooting

### Still Getting Exit Code 144?

1. **Check available resources**:
   ```bash
   # Check free RAM
   vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%-16s % 16.2f Mi\n", "$1:", $2 * $size / 1048576);'

   # Ensure you have 8GB+ free RAM
   ```

2. **Monitor signing process**:
   - Open Activity Monitor
   - Search for `codesign` processes
   - Watch CPU/memory usage
   - If stuck, force quit and retry

3. **Reduce bundle size** (if needed):
   ```bash
   # Add to prepare-python-bundle.sh after pip install
   pip uninstall -y pytest coverage sphinx  # Dev dependencies
   find backends-bundle/venv -name "*.dist-info" -type d -exec rm -rf {} +
   find backends-bundle/venv -name "tests" -type d -exec rm -rf {} +
   ```

### Certificate Issues

```bash
# List signing identities
security find-identity -v -p codesigning

# Should show: "Developer ID Application: Henry Love (6L989H4F6A)"

# If not found, import certificate
security import developer-id-application.p12 -k ~/Library/Keychains/login.keychain-db
```

### Notarization After Signing

If signing succeeds but notarization fails:

1. **Set environment variables**:
   ```bash
   export APPLE_ID="your@apple.id"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="6L989H4F6A"
   ```

2. **Verify all binaries have hardened runtime**:
   ```bash
   codesign -dvv "dist/mac-arm64/VAI Studio.app" 2>&1 | grep runtime
   # Should show: flags=0x10000(runtime)
   ```

3. **Check notarization status**:
   ```bash
   xcrun notarytool history --apple-id "$APPLE_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD" --team-id "$APPLE_TEAM_ID"
   ```

## Production Checklist

Before releasing:

- [ ] `./scripts/diagnose-signing.sh` passes all checks
- [ ] `pnpm run build:mac` completes without exit code 144
- [ ] All binaries are signed: `find "dist/mac-arm64/VAI Studio.app" -type f \( -name "*.so" -o -name "*.dylib" \) | xargs codesign -dv 2>&1 | grep -c "Signature="`
- [ ] App launches without "damaged" warning
- [ ] Gatekeeper passes: `spctl -a -vv "dist/mac-arm64/VAI Studio.app"`
- [ ] Notarization succeeds (if APPLE_* env vars set)

## What Changed

### Files Modified
- `package.json`: Added timeout, signIgnore, and afterPack hook
- `scripts/sign-python-extensions.sh`: Now signs both .so and .dylib with hardened runtime

### Files Created
- `scripts/afterPack.js`: Pre-signing hook for electron-builder
- `scripts/sign-python-binaries.sh`: Standalone signing script
- `scripts/diagnose-signing.sh`: Diagnostic tool
- `docs/CODE_SIGNING_LARGE_APPS.md`: Comprehensive documentation

## Next Steps

1. Test the build:
   ```bash
   pnpm run build:mac
   ```

2. Monitor for exit code 144 (should not occur)

3. If successful, test the built app:
   ```bash
   open "dist/mac-arm64/VAI Studio.app"
   ```

4. If app launches successfully, proceed with notarization (optional):
   ```bash
   export APPLE_ID="your@apple.id"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="6L989H4F6A"
   pnpm run build:mac
   ```

## References

- [Exit Code 144 Issue](https://github.com/electron/electron-builder/issues/4629)
- [Code Signing Large Apps](docs/CODE_SIGNING_LARGE_APPS.md)
- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
