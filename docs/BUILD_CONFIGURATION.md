# Build Configuration Guide

This guide explains how to configure VAI Studio with your personal credentials for code signing and distribution.

## ⚠️ IMPORTANT: Privacy & Security

This repository has been sanitized to remove the original developer's personal information. **You must add your own credentials** to build signed, notarized releases.

**DO NOT commit your personal credentials to version control!**

---

## Table of Contents

1. [Required Credentials](#required-credentials)
2. [macOS Code Signing Setup](#macos-code-signing-setup)
3. [Configuration Locations](#configuration-locations)
4. [Environment Variables Method (Recommended)](#environment-variables-method-recommended)
5. [Verification](#verification)
6. [Security Best Practices](#security-best-practices)

---

## Required Credentials

To build and distribute production-ready macOS apps, you need:

### 1. Apple Developer Account
- **Cost**: $99/year
- **Sign up**: https://developer.apple.com

### 2. Developer ID Application Certificate
- **What**: Allows code signing for macOS apps distributed outside the App Store
- **Where to get**: Apple Developer Portal → Certificates, Identifiers & Profiles

### 3. Apple Team ID
- **What**: 10-character identifier (e.g., `ABC123XYZ9`)
- **Where to find**: Apple Developer Portal → Membership page

### 4. App-Specific Password
- **What**: Password for notarization (different from your Apple ID password)
- **Where to generate**: https://appleid.apple.com → Security → App-Specific Passwords

---

## macOS Code Signing Setup

### Step 1: Get Your Apple Developer Certificate

1. Log into https://developer.apple.com
2. Go to **Certificates, Identifiers & Profiles**
3. Click **Certificates** → **+** (Create new)
4. Select **Developer ID Application**
5. Follow the prompts to create a CSR (Certificate Signing Request)
6. Download the certificate and double-click to install in **Keychain Access**

### Step 2: Find Your Team ID

1. Go to https://developer.apple.com/account
2. Click **Membership** in the sidebar
3. Your **Team ID** is displayed (10-character code)
4. Example: `6L989H4F6A`

### Step 3: Verify Certificate is Installed

Open Terminal and run:

```bash
security find-identity -v -p codesigning
```

You should see output like:

```
1) ABC123XYZ9 "Developer ID Application: Your Name (ABC123XYZ9)"
```

**Note the certificate name** - you'll need it for configuration.

### Step 4: Generate App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID (the one linked to your Developer account)
3. Under **Security** → **App-Specific Passwords**
4. Click **Generate password**
5. Name it: `VAI Studio Notarization`
6. **Copy and save the generated password** (format: `xxxx-xxxx-xxxx-xxxx`)

---

## Configuration Locations

You need to update the following files with your credentials:

### 1. `package.json` (Lines 79-84)

**Current (placeholder):**
```json
"identity": "Developer ID Application: YOUR_NAME (YOUR_TEAM_ID)",
"notarize": {
  "teamId": "YOUR_TEAM_ID"
}
```

**Replace with your actual certificate:**
```json
"identity": "Developer ID Application: John Doe (ABC123XYZ9)",
"notarize": {
  "teamId": "ABC123XYZ9"
}
```

**How to get your exact certificate name:**
```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

Copy the entire string in quotes, including your name and Team ID.

---

### 2. `scripts/build-mac-signed.sh` (Line 89)

**Current (placeholder):**
```bash
APPLE_TEAM_ID="${APPLE_TEAM_ID:-YOUR_TEAM_ID}" npm run build:mac
```

**Option A: Edit the script directly:**
```bash
APPLE_TEAM_ID="${APPLE_TEAM_ID:-ABC123XYZ9}" npm run build:mac
```

**Option B: Use environment variable (recommended):**
Leave the script as-is and set `APPLE_TEAM_ID` in your environment (see below).

---

## Environment Variables Method (Recommended)

Instead of hardcoding credentials in files, use environment variables. This keeps your credentials secure and out of version control.

### Setup (One-time)

Add these to your `~/.zshrc` (or `~/.bash_profile` if using bash):

```bash
# Apple Developer Credentials for VAI Studio
export APPLE_ID="your-email@example.com"           # Your Apple Developer account email
export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"    # App-specific password from Step 4
export APPLE_TEAM_ID="ABC123XYZ9"                  # Your 10-character Team ID
```

**Replace the placeholder values with your actual credentials.**

Then reload your shell:

```bash
source ~/.zshrc
```

### Verification

Check that variables are set:

```bash
echo $APPLE_ID
echo $APPLE_TEAM_ID
# Don't echo the password - it's secret!
```

### Using Environment Variables for Builds

With environment variables set, you can:

1. **Leave `package.json` as-is** - The notarization will use `$APPLE_TEAM_ID`
2. **Leave `scripts/build-mac-signed.sh` as-is** - It will read from environment
3. **Build securely**:

```bash
./scripts/build-mac-signed.sh
```

The script will automatically use your environment variables for notarization.

---

## Build Process

Once configured, build your signed app:

```bash
# Navigate to project
cd ~/Projects/VAI-Studio

# Ensure environment variables are set (check above)
echo $APPLE_ID  # Should output your email

# Run the build script
./scripts/build-mac-signed.sh
```

The script will:
1. ✅ Verify your certificate is installed
2. ✅ Prepare Python bundle
3. ✅ Build the macOS app
4. ✅ Sign with your Developer ID
5. ✅ Notarize with Apple (requires credentials)
6. ✅ Create DMG and ZIP files

Output will be in `dist/` folder.

---

## Verification

### Check Code Signature

After building, verify the app is properly signed:

```bash
codesign --verify --deep --strict --verbose=2 "dist/mac/VAI Studio.app"
```

Expected output:
```
dist/mac/VAI Studio.app: valid on disk
dist/mac/VAI Studio.app: satisfies its Designated Requirement
```

### Check Notarization

Verify the app passed Apple's notarization:

```bash
spctl -a -vvv -t install "dist/mac/VAI Studio.app"
```

Expected output:
```
dist/mac/VAI Studio.app: accepted
source=Notarized Developer ID
```

### Test the App

Open the DMG and test the app:

```bash
open "dist/VAI Studio-3.0.0.dmg"
```

Install the app and verify:
- ✅ Opens without security warnings
- ✅ All features work correctly
- ✅ No "damaged" or "unverified developer" errors

---

## Windows Code Signing (Future)

For Windows releases, you'll need a Windows Code Signing Certificate.

**Recommended providers:**
- **Sectigo** (formerly Comodo): ~$100-200/year
- **DigiCert**: ~$300-400/year
- **GlobalSign**: ~$200-300/year

**Configuration (when ready):**

Edit `package.json`:

```json
"win": {
  "certificateFile": null,  // Use environment variable instead
  "certificatePassword": null
}
```

Set environment variables:

```bash
export CSC_LINK="/path/to/your/certificate.pfx"
export CSC_KEY_PASSWORD="your-certificate-password"
```

Then build:

```bash
npm run build:win
```

---

## Security Best Practices

### ✅ DO:

1. **Use environment variables** for all sensitive credentials
2. **Keep credentials in password manager** (1Password, Bitwarden, etc.)
3. **Verify `.gitignore` excludes** certificate files before committing
4. **Rotate app-specific passwords** annually
5. **Use different passwords** for different apps/services
6. **Review commits** before pushing to ensure no credentials leaked

### ❌ DON'T:

1. **Never commit certificates** to version control
2. **Never hardcode passwords** in scripts or config files
3. **Never share certificates** via email or messaging apps
4. **Never use production certificates** on public CI/CD (use secrets instead)
5. **Never commit `.env` files** with real credentials

### Check Before Committing

Before pushing to GitHub, verify no credentials are exposed:

```bash
# Search for potential credential leaks
git diff --cached | grep -i "password\|secret\|key\|token\|certificate"

# Check for certificate files
git status | grep -E "\.(pfx|p12|cer|mobileprovision)$"

# Verify .gitignore is working
git status --ignored
```

---

## Troubleshooting

### "Certificate not found"

**Problem**: Build script can't find your Developer ID certificate.

**Solution**:
```bash
# List all code signing identities
security find-identity -v -p codesigning

# If missing, re-download from Apple Developer Portal
# Double-click the .cer file to install in Keychain Access
```

### "Notarization failed"

**Problem**: Apple rejected the notarization request.

**Common causes:**
1. Wrong app-specific password → Regenerate at appleid.apple.com
2. Expired password → Generate a new one
3. Wrong Apple ID → Check `$APPLE_ID` matches your Developer account email
4. Missing entitlements → Verify `build/entitlements.mac.plist` exists

**Check notarization status:**
```bash
xcrun notarytool history --apple-id $APPLE_ID
```

### "Build succeeds but app shows security warning"

**Problem**: App is signed but not notarized.

**Solution**: Ensure environment variables are set:
```bash
echo $APPLE_ID
echo $APPLE_ID_PASSWORD
echo $APPLE_TEAM_ID
```

Then rebuild:
```bash
./scripts/build-mac-signed.sh
```

### "Variable not set" error

**Problem**: Environment variables not loaded.

**Solution**:
```bash
# Reload shell configuration
source ~/.zshrc  # or ~/.bash_profile

# Verify variables are set
env | grep APPLE
```

---

## CI/CD Setup (GitHub Actions)

For automated builds, store credentials as **GitHub Secrets**:

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `APPLE_ID` - Your Apple Developer email
   - `APPLE_ID_PASSWORD` - App-specific password
   - `APPLE_TEAM_ID` - Your 10-character Team ID
   - `CSC_LINK` - Base64-encoded certificate (for auto-signing)
   - `CSC_KEY_PASSWORD` - Certificate keychain password

**Example workflow** (`.github/workflows/release.yml`):

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Build and sign
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: ./scripts/build-mac-signed.sh

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: VAI-Studio-macOS
          path: dist/*.dmg
```

---

## Summary

### Quick Checklist

Before building your first release:

- [ ] Apple Developer Account active ($99/year)
- [ ] Developer ID Application certificate installed
- [ ] Team ID identified (10-character code)
- [ ] App-specific password generated
- [ ] Environment variables set in `~/.zshrc`
- [ ] `package.json` updated with your certificate name
- [ ] Build script tested successfully
- [ ] App verified (signed and notarized)

### File Summary

Files that need your credentials:

1. **`package.json`** - Certificate identity and Team ID
2. **`~/.zshrc`** - Environment variables (APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID)
3. **Keychain Access** - Developer ID Application certificate installed

Files that DON'T need changes (if using environment variables):

- `scripts/build-mac-signed.sh` - Uses `${APPLE_TEAM_ID:-YOUR_TEAM_ID}` pattern
- `.gitignore` - Already configured to exclude certificates

---

## Support

Need help with code signing?

- **Apple Developer Support**: https://developer.apple.com/support/code-signing/
- **electron-builder Docs**: https://www.electron.build/code-signing
- **VAI Studio Issues**: https://github.com/oddcommunity/VAI-Studio/issues

---

## References

- [Apple Developer Portal](https://developer.apple.com)
- [App-Specific Passwords](https://appleid.apple.com)
- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [CODE_SIGNING.md](CODE_SIGNING.md) - Detailed code signing reference

---

**Last Updated**: November 2024
**For**: VAI Studio v3.0.0+
