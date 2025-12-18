# Code Signing Large Electron Apps with Python Dependencies

## Problem: Exit Code 144 During Signing

When building VAI Studio for macOS, the code signing process fails with **exit code 144**. This is a timeout/resource exhaustion error from macOS's `codesign` utility.

### Root Cause

VAI Studio bundles a Python virtual environment with ML libraries:
- **Size**: 939MB
- **Total files**: 22,022
- **Native binaries**: 444 (.so and .dylib files)

Each native binary must be individually signed with the Developer ID certificate and hardened runtime enabled. With 444 binaries, this process can take 5-15 minutes, which exceeds electron-builder's default timeout.

### What is Exit Code 144?

Exit code 144 is `ETIMEDOUT` from the macOS kernel. It indicates that:
1. The `codesign` process took too long
2. System resources were exhausted
3. The signing operation was killed by the OS

This commonly occurs when signing:
- Large Python venvs (PyTorch, TensorFlow, NumPy)
- Node.js apps with many native addons
- Apps bundling FFmpeg or other media libraries
- Any app with 200+ native binaries

## Solution: Multi-Stage Signing Approach

We implement a **two-stage signing process**:

1. **Pre-sign Python binaries** in the `afterPack` hook
2. **Let electron-builder sign** the rest with extended timeout

### Configuration Changes

#### 1. Update package.json

Added to the `mac` section:

```json
{
  "build": {
    "mac": {
      "timeout": 3600000,  // 1 hour timeout
      "signIgnore": [      // Skip .pyc and cache files
        "venv/.*\\.pyc$",
        "venv/.*__pycache__"
      ]
    },
    "afterPack": "scripts/afterPack.js"  // Pre-sign binaries
  }
}
```

#### 2. Created afterPack Hook (`scripts/afterPack.js`)

This hook runs after electron-builder packs the app but before signing. It calls a shell script to pre-sign all Python binaries.

**Why this works:**
- Spreads signing workload across two phases
- Provides progress feedback during signing
- Allows individual binary signing with proper error handling
- Reduces load on main electron-builder signing step

#### 3. Created Signing Script (`scripts/sign-python-binaries.sh`)

This script:
- Finds all `.so` and `.dylib` files in the Python venv
- Signs each one individually with progress output
- Uses hardened runtime and entitlements
- Continues on individual failures (some binaries may already be signed)

### Usage

#### Build with Signing

```bash
# Ensure certificate is in Keychain
security find-identity -v -p codesigning

# Build with default identity auto-discovery
pnpm run build:mac
```

#### Build Without Signing (Testing)

```bash
# Skip code signing entirely
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build:mac
```

#### Diagnose Signing Issues

```bash
# Run diagnostic script
./scripts/diagnose-signing.sh
```

This checks:
- Certificate presence
- Bundle size and file counts
- Current signing status
- Environment variables
- electron-builder configuration

## Advanced: Optimizing the Python Bundle

If signing still times out, consider these optimizations:

### Option 1: Strip Unnecessary Files

Remove files that don't need to be signed:

```bash
# In prepare-python-bundle.sh
find backends-bundle/venv -name "*.pyc" -delete
find backends-bundle/venv -name "__pycache__" -type d -exec rm -rf {} +
find backends-bundle/venv -name "*.pyo" -delete
find backends-bundle/venv -name "*.dist-info" -type d -exec rm -rf {} +
find backends-bundle/venv -name "tests" -type d -exec rm -rf {} +
```

### Option 2: Pre-sign During Bundle Creation

Sign binaries immediately after pip install:

```bash
# In prepare-python-bundle.sh (after venv creation)
if [ -n "$CSC_NAME" ]; then
  echo "Pre-signing Python binaries..."
  find backends-bundle/venv -type f \( -name "*.so" -o -name "*.dylib" \) \
    -exec codesign --force --sign "$CSC_NAME" --timestamp --options runtime {} \;
fi
```

### Option 3: Use Parallel Signing

Modify `sign-python-binaries.sh` to sign in parallel:

```bash
# Sign 4 binaries at a time
find "$APP_PATH/Contents/Resources/backends/venv" \
  -type f \( -name "*.so" -o -name "*.dylib" \) \
  -print0 | xargs -0 -P 4 -I {} codesign --force --sign "$IDENTITY" \
    --timestamp --options runtime --entitlements "build/entitlements.mac.plist" {}
```

**Caution**: Parallel signing can cause Keychain access issues. Use with care.

## Troubleshooting

### "no identity found" Error

```bash
# List available signing identities
security find-identity -v -p codesigning

# If none found, import your certificate
security import developer-id-application.p12 -k ~/Library/Keychains/login.keychain-db
```

### "errSecInternalComponent" Error

This means Keychain is locked or certificate has issues:

```bash
# Unlock keychain
security unlock-keychain ~/Library/Keychains/login.keychain-db

# Verify certificate
security find-certificate -c "Developer ID Application" -p | openssl x509 -noout -text
```

### Signing Succeeds but Notarization Fails

Check that all binaries have hardened runtime:

```bash
codesign -dvv "dist/mac-arm64/VAI Studio.app/Contents/Resources/backends/venv/lib/python3.11/site-packages/torch/lib/libtorch_cpu.dylib" 2>&1 | grep "runtime"
```

Should show: `flags=0x10000(runtime)`

### Still Getting Exit Code 144

1. Check available RAM (signing is memory-intensive):
   ```bash
   vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%-16s % 16.2f Mi\n", "$1:", $2 * $size / 1048576);'
   ```

2. Monitor signing in Activity Monitor:
   - Look for `codesign` processes
   - Check CPU and memory usage
   - Watch for "Not Responding" state

3. Try signing in smaller batches:
   - Modify `sign-python-binaries.sh` to process 100 files at a time
   - Add sleep delays between batches

## Production Checklist

Before releasing:

- [ ] Run `./scripts/diagnose-signing.sh` - all checks pass
- [ ] Build completes without exit code 144
- [ ] All binaries are signed: `find "dist/mac-arm64/VAI Studio.app" -type f \( -name "*.so" -o -name "*.dylib" \) | xargs codesign -dv 2>&1 | grep -c "Signature="`
- [ ] App launches without "damaged" warning
- [ ] Notarization succeeds (if configured)
- [ ] App passes Gatekeeper: `spctl -a -vv "dist/mac-arm64/VAI Studio.app"`

## References

- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [electron-builder Code Signing Docs](https://www.electron.build/code-signing)
- [Hardened Runtime Documentation](https://developer.apple.com/documentation/security/hardened_runtime)
