# Release Guide for VAI Studio

## Quick Start: Build a Production-Ready macOS App

### Step 1: Get App-Specific Password (One-time setup)

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID: `henrylove11@protonmail.com`
3. Under **Security** → **App-Specific Passwords**
4. Click **Generate password**
5. Name it: `VAI Studio Notarization`
6. **Save the generated password** (format: `xxxx-xxxx-xxxx-xxxx`)

### Step 2: Set Environment Variables

Open Terminal and run:

```bash
export APPLE_ID="henrylove11@protonmail.com"
export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # Use the password from Step 1
```

**Optional**: Add these to your `~/.zshrc` or `~/.bash_profile` to persist:

```bash
echo 'export APPLE_ID="henrylove11@protonmail.com"' >> ~/.zshrc
echo 'export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"' >> ~/.zshrc
source ~/.zshrc
```

### Step 3: Build the App

```bash
cd "/Users/exeai/Projects/VAI Studio"
./scripts/build-mac-signed.sh
```

The script will:
- ✅ Verify your code signing certificate
- ✅ Prepare Python bundle
- ✅ Build the macOS app
- ✅ Sign with your Developer ID
- ✅ Notarize with Apple (requires password from Step 1)
- ✅ Create DMG and ZIP files

### Step 4: Test the Build

```bash
open "dist/VAI Studio-3.0.0.dmg"
```

Test the app thoroughly before releasing!

### Step 5: Create GitHub Release

1. Go to https://github.com/oddcommunity/VAI-Studio/releases
2. Click **Draft a new release**
3. Tag version: `v3.0.0`
4. Release title: `VAI Studio v3.0.0`
5. Upload files from `dist/`:
   - `VAI Studio-3.0.0.dmg`
   - `VAI Studio-3.0.0-mac.zip`
6. Write release notes
7. Click **Publish release**

---

## Building Without Notarization (Testing Only)

If you don't have the app-specific password yet:

```bash
./scripts/build-mac-signed.sh
# When prompted, choose "y" to continue without notarization
```

**Note**: Unsigned apps will show security warnings on macOS 10.15+

---

## Troubleshooting

### "Certificate not found"

**Solution**: Your certificate is installed, so this shouldn't happen. If it does:

```bash
security find-identity -v -p codesigning
```

You should see: `Developer ID Application: Henry Love (6L989H4F6A)`

### "Notarization failed"

**Possible causes**:
1. Wrong app-specific password → Regenerate at https://appleid.apple.com
2. Expired password → Generate a new one
3. Wrong Apple ID → Should be `henrylove11@protonmail.com`

**Check notarization status**:

```bash
xcrun notarytool history --apple-id henrylove11@protonmail.com
```

### "Build failed"

**Common issues**:
1. Python bundle not ready → Run `npm run prebuild` manually
2. Missing dependencies → Run `npm install`
3. Disk space → Check available space

---

## Auto-Update Setup

Once you publish a GitHub Release, the auto-updater in the app will:
1. Check https://github.com/oddcommunity/VAI-Studio/releases
2. Compare current version (3.0.0) with latest release
3. Notify users if a newer version is available
4. Download and install updates automatically

Users will see update notifications and can install with one click!

---

## Release Checklist

Before publishing v3.0.0:

### Pre-Release
- [ ] All features working
- [ ] No critical bugs
- [ ] README.md updated
- [ ] CHANGELOG.md created
- [ ] Version bumped to 3.0.0 in package.json

### Building
- [ ] App-specific password generated
- [ ] Environment variables set
- [ ] Build script runs successfully
- [ ] DMG and ZIP created

### Testing
- [ ] Test on macOS 13 (Ventura)
- [ ] Test on macOS 14 (Sonoma)
- [ ] Verify no security warnings
- [ ] Test transcription with multiple models
- [ ] Test file export
- [ ] Test settings and model manager

### Publishing
- [ ] GitHub Release created (v3.0.0)
- [ ] DMG uploaded
- [ ] ZIP uploaded
- [ ] Release notes written
- [ ] Release published (not draft)

### Post-Release
- [ ] Announce on social media
- [ ] Update website/landing page
- [ ] Monitor for issues
- [ ] Respond to user feedback

---

## Version Bumping

To release v3.0.1, v3.1.0, etc.:

1. Update version in `package.json`:
```json
"version": "3.1.0"
```

2. Rebuild:
```bash
./scripts/build-mac-signed.sh
```

3. Create new GitHub Release with tag `v3.1.0`

---

## Windows Release (Future)

For Windows releases, you'll need:
- Windows Code Signing Certificate ($100-400/year)
- See `CODE_SIGNING.md` for details

---

## Support

Questions? Check:
- `CODE_SIGNING.md` - Detailed code signing guide
- `CLAUDE.md` - Project architecture and roadmap
- GitHub Issues: https://github.com/oddcommunity/VAI-Studio/issues
