# Quick Build Guide

## TL;DR - Building VAI Studio

### Development (Fast Iteration)
```bash
# Terminal 1: Start Vite dev server
pnpm run dev:react

# Terminal 2: Start Electron
pnpm run dev
```

### Production Build (Full Process)
```bash
# 1. Smoke test first (catches issues early, ~2 min)
pnpm run smoke-test

# 2. If smoke test passes, build signed production app (~5 min)
pnpm run build:mac
```

## What Changed?

### Old System (Broken)
- Used `pnpm-wrapper.sh` hack to return empty dependencies
- electron-builder bundled ZERO node_modules
- Every `require()` crashed at runtime
- Had to manually add try-catch for each missing module

### New System (Working)
- esbuild bundles main process + dependencies into single file
- Only external modules (native addons, binaries) in node_modules
- Dependency checker verifies everything before building
- Smoke test catches crashes before code signing

## New Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `pnpm run bundle:electron` | Bundle main process with esbuild | After changing Electron code |
| `pnpm run check:deps` | Verify bundled dependencies | After adding npm packages |
| `pnpm run smoke-test` | Build + test unsigned app | Before production builds |

## Build Artifacts

```
dist-electron/          # Bundled Electron code (production)
├── main.js            # Bundled main process
├── preload.js         # Bundled preload script
└── node_modules/      # External modules only
    ├── electron-store/
    ├── electron-updater/
    ├── ffmpeg-static/
    └── pdfkit/

dist-react/            # Built React frontend

dist/                  # Final packaged apps
├── mac-arm64/
│   └── VAI Studio.app
└── VAI Studio-1.0.0-arm64.dmg
```

## Troubleshooting

### "Cannot find module X" at runtime

1. Check if module needs to be external:
   ```bash
   # Edit esbuild.config.js
   # Add to externalModules array
   ```

2. Rebuild and verify:
   ```bash
   pnpm run bundle:electron
   pnpm run check:deps
   ```

### Smoke test fails

1. Check the error output from the script
2. Look for crash logs in `~/Library/Logs/DiagnosticReports/VAI Studio*`
3. Fix the issue and re-run smoke test

### Build is slow

The smoke test builds an unsigned app (no code signing), which is much faster:
- Unsigned build: ~2 minutes
- Signed + notarized build: ~5-10 minutes

Always run smoke test first to catch issues.

## File Paths Reference

| Path | Purpose |
|------|---------|
| `electron/main.js` | Source file (development) |
| `dist-electron/main.js` | Bundled file (production) |
| `esbuild.config.js` | Bundling configuration |
| `scripts/bundle-electron.sh` | Bundling script |
| `scripts/smoke-test.sh` | Quick build + test |
| `scripts/check-dependencies.js` | Dependency verification |

## Pre-Release Checklist

Before shipping a production build:

- [ ] Run smoke test: `pnpm run smoke-test`
- [ ] Check dependencies: `pnpm run check:deps`
- [ ] Verify version in package.json
- [ ] Test on a clean machine (no dev dependencies)
- [ ] Build signed production app: `pnpm run build:mac`
- [ ] Upload to update server

## Common Issues

### Module bundled but shouldn't be

Some modules need special handling (native addons, binaries, complex asset loading).

**Solution:** Add to `externalModules` in `esbuild.config.js`

### App works in dev but not production

**Solution:** Run smoke test to catch this early. Check for:
- Incorrect `__dirname` usage
- Missing `app.isPackaged` checks
- Environment-specific code

### Bundle size too large

**Solution:**
1. Run `esbuild --analyze` to see what's being bundled
2. Externalize large dependencies that don't benefit from bundling
3. Enable minification in esbuild.config.js

## Need More Details?

See `docs/BUILD_SYSTEM.md` for complete documentation.
