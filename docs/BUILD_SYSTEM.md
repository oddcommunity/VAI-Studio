# VAI Studio Build System

## Overview

VAI Studio uses **esbuild** to bundle the Electron main process and all its dependencies into a single file. This eliminates the need for `node_modules` in the packaged app and solves the issue where electron-builder wasn't bundling dependencies correctly.

## Architecture

### Development Mode
- Uses **unbundled source files** from `electron/main.js`
- Fast iteration - no bundling required
- All dependencies loaded from `node_modules/`

### Production Mode
- Uses **bundled files** from `dist-electron/main.js`
- All dependencies compiled into the bundle
- Only external modules (native addons, binaries) remain in `node_modules/`

## Build Workflow

```
1. Build React frontend → dist-react/
2. Bundle Electron main → dist-electron/
3. Check dependencies
4. Run prebuild scripts (Python bundle, build info)
5. Package with electron-builder → dist/
```

## Key Files

| File | Purpose |
|------|---------|
| `esbuild.config.js` | esbuild configuration for bundling |
| `scripts/bundle-electron.sh` | Wrapper script for bundling |
| `scripts/check-dependencies.js` | Verifies all dependencies are bundled/external |
| `scripts/smoke-test.sh` | Tests unsigned app before code signing |
| `dist-electron/main.js` | Bundled main process (production) |
| `electron/main.js` | Source main process (development) |

## Commands

### Development
```bash
# Start Vite dev server (terminal 1)
pnpm run dev:react

# Start Electron in dev mode (terminal 2)
pnpm run dev
```

### Testing
```bash
# Bundle Electron main process
pnpm run bundle:electron

# Check if all dependencies are accounted for
pnpm run check:deps

# Full smoke test (build unsigned + launch)
pnpm run smoke-test
```

### Production Build
```bash
# macOS build (signed and notarized)
pnpm run build:mac

# All platforms
pnpm run build:all
```

## External Modules

Some modules cannot be bundled and must remain in `node_modules/`:

### Native Modules
- `keytar` - Native addon for secure credential storage
- `fsevents` - macOS file watching (optional)

### Runtime-Required Modules
- `electron-store` - Needs to persist state across app restarts
- `electron-updater` - Interacts with Electron's auto-update system
- `ffmpeg-static` - Binary executable (needs unpacking from asar)
- `pdfkit` - Has complex asset loading requirements

These are:
1. Listed in `esbuild.config.js` as `externalModules`
2. Copied to `dist-electron/node_modules/` during bundling
3. Unpacked from asar via `asarUnpack` in package.json

## Dependency Checker

The `check-dependencies.js` script scans the bundled main.js for `require()` calls and verifies:

1. **Node.js built-ins** (fs, path, etc.) - Provided by Node.js runtime
2. **Electron modules** (electron) - Provided by Electron runtime
3. **External modules** - Present in `dist-electron/node_modules/`
4. **Bundled modules** - Compiled into main.js

### Example Output
```
Found 22 unique require() calls:
  ✓ electron (Electron runtime)
  ✓ fs (Node.js built-in)
  ✓ electron-store (external, found in node_modules)
  ? some-package (should be bundled - verify manually)
```

## Smoke Test

The smoke test script (`scripts/smoke-test.sh`) runs a quick validation before production builds:

1. Builds React frontend
2. Bundles Electron main process
3. Checks dependencies
4. Builds unsigned macOS app (no code signing)
5. Launches the app for 10 seconds
6. Verifies no crashes

This catches issues like:
- Missing dependencies
- Module loading errors
- Immediate runtime crashes

**Run before production builds to save time on code signing and notarization.**

## Troubleshooting

### Module Not Found at Runtime

**Symptom:** Packaged app crashes with "Cannot find module 'X'"

**Solution:**
1. Add module to `externalModules` in `esbuild.config.js`
2. Verify it's copied to `dist-electron/node_modules/`
3. Add to `asarUnpack` in package.json if it contains native code

### Native Module Build Errors

**Symptom:** "Error: The module was compiled against a different Node.js version"

**Solution:**
- Native modules must be rebuilt for Electron's Node.js version
- electron-builder handles this automatically for externalized modules
- Never bundle native modules - always externalize them

### Bundle Size Issues

**Symptom:** main.js is too large (>5MB)

**Solution:**
1. Check what's being bundled with `esbuild --metafile=meta.json --analyze`
2. Externalize large dependencies if they don't need bundling
3. Use `minify: true` in esbuild.config.js for production

### Development vs Production Differences

**Symptom:** Works in dev but crashes in production

**Solution:**
1. Run smoke test to catch issues early
2. Check if code uses `__dirname` or `process.cwd()` incorrectly
3. Verify environment-specific code (app.isPackaged checks)

## Migration from pnpm-wrapper Hack

Previously, VAI Studio used a `pnpm-wrapper.sh` hack that returned empty dependencies to electron-builder. This caused:
- Zero node_modules bundled
- Runtime crashes for every required module
- Constant "Cannot find module X" errors

The esbuild solution:
- Bundles all code dependencies into a single file
- Only externalizes truly necessary modules (native addons, binaries)
- Provides verification (dependency checker) before building
- Allows smoke testing without code signing

## Best Practices

1. **Always run smoke test before production builds**
   ```bash
   pnpm run smoke-test
   ```

2. **Check dependencies after adding new npm packages**
   ```bash
   pnpm run bundle:electron && pnpm run check:deps
   ```

3. **Use bundled builds for production, source files for development**
   - Development: Fast iteration, no bundling overhead
   - Production: Single file, no node_modules dependency

4. **Monitor bundle size**
   - Keep main.js under 3MB if possible
   - Externalize large dependencies that don't benefit from bundling

5. **Test on a clean machine**
   - Packaged app should work without development dependencies
   - Smoke test simulates this by building and running the .app bundle

## Future Improvements

- [ ] Add bundle size monitoring to CI
- [ ] Implement code splitting for large dependencies
- [ ] Add tree-shaking for unused code
- [ ] Create Windows and Linux build configurations
- [ ] Add performance profiling for bundle optimization
