# Migration Checklist: From pnpm-wrapper to esbuild Bundling

This checklist helps you transition from the broken pnpm-wrapper system to the new esbuild bundling system.

## Pre-Migration Verification

- [x] System is experiencing "Cannot find module X" errors in production
- [x] pnpm-wrapper.sh is returning empty dependencies
- [x] Manual try-catch blocks added for missing modules (dotenv, electron-store)

## Installation (COMPLETED)

- [x] esbuild installed as dev dependency
- [x] esbuild.config.js created
- [x] bundle-electron.sh script created
- [x] check-dependencies.js script created
- [x] smoke-test.sh script created
- [x] dev.sh script created
- [x] Documentation created

## Configuration Updates (COMPLETED)

- [x] package.json "main" changed to "dist-electron/main.js"
- [x] package.json scripts updated with bundling commands
- [x] package.json electron-builder "files" updated
- [x] Verification script created and passed

## Testing Phase

### 1. Verify Build System

```bash
./scripts/verify-build-system.sh
```

- [x] All checks pass
- [x] Bundle created successfully
- [x] Dependencies verified

### 2. Run Smoke Test

```bash
pnpm run smoke-test
```

Expected results:
- [ ] React frontend builds
- [ ] Electron main process bundles
- [ ] Dependencies verified
- [ ] Unsigned app builds
- [ ] App launches without crashes
- [ ] App runs for 10 seconds without issues

**If smoke test FAILS:**
1. Check error output
2. Look for crash logs in `~/Library/Logs/DiagnosticReports/VAI Studio*`
3. Run dependency checker: `pnpm run check:deps`
4. Check bundle contents: `ls -lh dist-electron/`

### 3. Production Build

Only proceed if smoke test passes.

```bash
# Build signed and notarized production app
pnpm run build:mac
```

Expected results:
- [ ] Build completes without errors
- [ ] .app file created in dist/mac-arm64/
- [ ] .dmg installer created
- [ ] Code signing successful
- [ ] Notarization successful (if configured)

### 4. Manual Testing

Test the packaged app on your development machine:

- [ ] App launches without crashes
- [ ] Main window appears
- [ ] UI renders correctly
- [ ] Authentication works (if applicable)
- [ ] Core features work (transcription, settings, etc.)
- [ ] No console errors related to missing modules

### 5. Clean Machine Testing

Test on a machine WITHOUT development dependencies:

- [ ] Copy .app to another Mac or clean user account
- [ ] App launches without crashes
- [ ] Core features work
- [ ] No dependency errors

## Post-Migration Cleanup

### Optional: Remove pnpm-wrapper

Once bundling is confirmed working, you can remove the pnpm-wrapper:

```bash
# Remove the wrapper script
rm scripts/pnpm-wrapper.sh

# Update electron-builder config in package.json
# (Remove any references to pnpm-wrapper if present)
```

**Note:** The wrapper doesn't hurt anything, so you can leave it if unsure.

### Remove Manual Try-Catch Blocks

Once bundling is working, you can clean up manual error handling:

```javascript
// OLD (can be removed):
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available in production build
}

// NEW (bundled, will work):
require('dotenv').config();
```

But only do this AFTER confirming the production build works.

## Rollback Plan (If Needed)

If the new system doesn't work and you need to rollback:

### 1. Revert package.json

```bash
git checkout package.json
```

Or manually change:
- "main": "electron/main.js"
- Remove new scripts (bundle:electron, check:deps, smoke-test)
- Restore old electron-builder "files" config

### 2. Delete new files

```bash
rm esbuild.config.js
rm scripts/bundle-electron.sh
rm scripts/check-dependencies.js
rm scripts/smoke-test.sh
rm scripts/dev.sh
rm -rf dist-electron/
```

### 3. Reinstall dependencies

```bash
pnpm install
```

## Success Criteria

The migration is successful when:

1. ✓ Verification script passes
2. ✓ Smoke test passes
3. ✓ Production build completes
4. ✓ Packaged app launches on dev machine
5. ✓ Packaged app launches on clean machine
6. ✓ No "Cannot find module X" errors
7. ✓ Core features work in production

## Known Issues and Solutions

### Issue: "Cannot find module X" at runtime

**Solution:** Module needs to be externalized
1. Add to `externalModules` in esbuild.config.js
2. Rebuild: `pnpm run bundle:electron`
3. Verify: `pnpm run check:deps`

### Issue: Native module errors

**Solution:** Native modules must be external
- They're already listed in esbuild.config.js
- Verify they're in dist-electron/node_modules/
- electron-builder rebuilds them automatically

### Issue: Bundle size too large

**Solution:** Externalize large dependencies
1. Identify large packages
2. Add to `externalModules` if they don't benefit from bundling
3. Rebuild and test

### Issue: App works in dev but not production

**Solution:** This is why smoke test exists
- Run smoke test before production builds
- Check for environment-specific code
- Verify `app.isPackaged` checks are correct

## Support

If you encounter issues:

1. Check documentation:
   - `/docs/BUILD_SYSTEM.md` - Complete documentation
   - `/docs/QUICK_BUILD_GUIDE.md` - Quick reference
   - `/IMPLEMENTATION_SUMMARY.md` - Overview

2. Run verification:
   ```bash
   ./scripts/verify-build-system.sh
   ```

3. Check logs:
   - Build logs in terminal
   - Crash logs in `~/Library/Logs/DiagnosticReports/`
   - Electron console (Command+Option+I in dev)

## Timeline

- **Preparation:** 5 minutes (read documentation)
- **Verification:** 1 minute (run verify script)
- **Smoke Test:** 2 minutes (quick validation)
- **Production Build:** 5-10 minutes (signed + notarized)
- **Testing:** 10 minutes (manual validation)

**Total:** ~20-30 minutes for complete migration and validation

## Sign-Off

Once all checklist items are complete:

- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Team notified of new workflow
- [ ] Production deploy successful

**Migrated by:** _________________

**Date:** _________________

**Notes:** _________________
