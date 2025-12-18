# Pre-Sign Validation Gate

## Overview

The pre-sign validation gate catches build issues **before** the expensive code signing and notarization process begins. This saves 10-20 minutes per build cycle by failing fast when artifacts are broken or incomplete.

## How It Works

### Build Flow

```
1. electron-builder packs app
2. afterPack hook triggers
   ├─> PRE-SIGN VALIDATION ✅ (this gate)
   │   ├─> Check app structure
   │   ├─> Check bundled dependencies
   │   └─> Check main bundle integrity
   │
   ├─> Python binary pre-signing
   └─> Main code signing + notarization
```

### Files

- **`scripts/pre-sign-check.js`** - Validation script with 3 check functions
- **`scripts/afterPack.js`** - electron-builder hook that calls validation

## Validation Checks

### 1. App Structure Validation

Verifies required paths exist in the .app bundle:

- `Contents/MacOS/VAI Studio` - Electron binary
- `Contents/Resources/dist-electron/main.js` - Main process bundle
- `Contents/Resources/dist-electron/preload.js` - Preload script
- `Contents/Resources/dist-react/index.html` - React entry point
- `Contents/Resources/app/package.json` - Package manifest

### 2. Bundled Dependencies Validation

Checks that required npm packages are bundled in `dist-electron/node_modules`:

- `electron-store` - Settings persistence
- `electron-updater` - Auto-update system
- `ffmpeg-static` - Video processing
- `pdfkit` - PDF generation

### 3. Main Bundle Validation

Validates the main process bundle:

- File exists and is readable
- Size is > 100KB (not empty/broken)
- Contains expected Electron imports

## Usage

### Automatic (Production Builds)

Runs automatically during `pnpm run build:mac`:

```bash
pnpm run build:mac
```

The validation gate will abort the build if any checks fail.

### Manual Testing

You can test the validation script directly:

```bash
# After building
node scripts/pre-sign-check.js "dist/mac-arm64/VAI Studio.app"
```

### Output Example

```
========================================
  PRE-SIGN VALIDATION GATE
========================================

1. App Structure Validation
   Checking: /path/to/VAI Studio.app

  ✅ Contents/MacOS/VAI Studio
      Size: 45.2 MB
  ✅ Contents/Resources/dist-electron/main.js
      Size: 1.5 MB
  ✅ Contents/Resources/dist-electron/preload.js
      Size: 234 KB
  ✅ Contents/Resources/dist-react/index.html
      Size: 1.2 KB

2. Bundled Dependencies Validation

  ✅ node_modules directory exists

  ✅ electron-store
      Version: 8.1.0
  ✅ electron-updater
      Version: 6.1.4
  ✅ ffmpeg-static
      Version: 5.2.0
  ✅ pdfkit
      Version: 0.14.0

3. Main Bundle Validation

  Bundle path: Contents/Resources/dist-electron/main.js
  Bundle size: 1.5 MB
  ✅ Bundle size is healthy
  ✅ Contains Electron imports

========================================
  VALIDATION SUMMARY
========================================

  ✅ PASS Structure
  ✅ PASS Dependencies
  ✅ PASS Bundle

========================================

✅ All validation checks passed!
Proceeding with code signing...
```

## Exit Codes

- **0** - All checks passed, continue with signing
- **1** - One or more checks failed, abort build

## When Checks Fail

The build will be aborted with a clear error message:

```
❌ Pre-sign validation failed!
Aborting build to prevent signing broken artifacts.
```

Common failure scenarios:

1. **Missing files** - Webpack/esbuild build failed silently
2. **Empty bundle** - Bundler produced invalid output
3. **Missing dependencies** - electron-builder didn't bundle required packages
4. **Wrong path structure** - Build output in unexpected location

## Troubleshooting

### Check failed for dist-electron/main.js

- Run `pnpm run build:electron` manually to see build errors
- Check `electron.vite.config.ts` configuration
- Verify `dist-electron/` directory contains built files

### Check failed for node_modules

- Check `package.json` dependencies are installed
- Verify `electron-builder.yml` includes required packages in `files`
- Run `pnpm install` to ensure lockfile is up to date

### Bundle size too small

- Indicates incomplete or failed webpack/esbuild build
- Check for build errors in console output
- Verify source files in `src/` are valid

## Benefits

1. **Fast Failure** - Catch issues in seconds vs. minutes
2. **Clear Errors** - Know exactly what's wrong before signing
3. **Time Savings** - Avoid 10-20 minute signing cycles for broken builds
4. **Production Safety** - Never ship incomplete artifacts
5. **Debugging Aid** - Detailed output helps diagnose build problems

## Integration with CI/CD

This validation gate works seamlessly in CI environments:

```yaml
# GitHub Actions example
- name: Build and sign macOS app
  run: pnpm run build:mac
  env:
    CSC_LINK: ${{ secrets.CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
```

If validation fails, the CI job will fail immediately without attempting code signing.

## Maintenance

To add new validation checks:

1. Edit `scripts/pre-sign-check.js`
2. Add new check function (e.g., `checkNewFeature(appPath)`)
3. Call it in `main()` and add to `results` object
4. Test with `node scripts/pre-sign-check.js /path/to/app`

Example:

```javascript
function checkNewFeature(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}4. New Feature Validation${colors.reset}\n`);

  const featurePath = path.join(appPath, 'Contents/Resources/new-feature');
  return checkPath('Contents/Resources/new-feature', featurePath, true);
}

// In main():
const results = {
  structure: checkAppStructure(appPath),
  dependencies: checkBundledDeps(appPath),
  bundle: checkMainBundle(appPath),
  newFeature: checkNewFeature(appPath) // Add here
};
```
