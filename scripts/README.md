# Scripts Directory

Build and development scripts for VAI Studio.

## Build Scripts

### bundle-electron.sh
Bundles Electron main process with esbuild. Runs automatically during `npm run prebuild`.

```bash
./scripts/bundle-electron.sh
```

**Output:** `dist-electron/main.js`, `dist-electron/preload.js`

### check-dependencies.js
Verifies all dependencies are accounted for (bundled or externalized).

```bash
node scripts/check-dependencies.js
```

**Run after:** Adding new npm packages or modifying esbuild.config.js

### smoke-test.sh
Builds unsigned app and tests for immediate crashes. Run before production builds.

```bash
./scripts/smoke-test.sh
```

**Duration:** ~2 minutes (vs 5-10 for signed build)

## Development Scripts

### dev.sh
Launches Electron in development mode using unbundled source files.

```bash
./scripts/dev.sh
# or
pnpm run dev
```

## Python Scripts

### prepare-python-bundle.sh
Prepares Python backend bundle for packaging. Runs automatically during `npm run prebuild`.

### python-wrapper.sh
Wrapper for Python execution in packaged app. Sets PYTHONHOME correctly.

## Code Signing Scripts

### sign-python-binaries.sh
Signs Python binaries for macOS Gatekeeper.

### sign-python-extensions.sh
Signs Python native extensions (.so files).

### notarize.js
Notarizes the app with Apple after signing.

### afterPack.js
Post-packaging hook for electron-builder.

## Build Info Scripts

### generate-build-info.sh
Generates build metadata (git commit, timestamp, etc.).

## Legacy Scripts

### pnpm-wrapper.sh
**DEPRECATED:** Previously used to work around electron-builder hanging. Now bypassed by bundling system. Can be removed once bundling is confirmed working.

## Execution Order (Production Build)

```
1. build:react          → dist-react/
2. generate-build-info  → build-info.json
3. prepare-python-bundle → backends-bundle/
4. bundle-electron      → dist-electron/
5. electron-builder     → dist/
   ├── afterPack.js
   ├── sign-python-*
   └── notarize.js
```

## Quick Reference

| Task | Command |
|------|---------|
| Bundle Electron | `pnpm run bundle:electron` |
| Check dependencies | `pnpm run check:deps` |
| Quick test | `pnpm run smoke-test` |
| Development | `pnpm run dev` |
| Production build | `pnpm run build:mac` |

## See Also

- `/docs/BUILD_SYSTEM.md` - Complete build system documentation
- `/docs/QUICK_BUILD_GUIDE.md` - Quick reference guide
- `/IMPLEMENTATION_SUMMARY.md` - Overview of recent changes
