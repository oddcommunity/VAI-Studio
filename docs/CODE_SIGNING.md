# Code Signing Setup Guide

## Overview

Code signing is required for production distribution of VAI Studio. Without code signing:
- macOS users will see "App is damaged and can't be opened" warnings
- Windows users will see "Unknown publisher" warnings
- The app cannot be notarized for macOS App Store distribution

## macOS Code Signing

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at: https://developer.apple.com

2. **Developer ID Application Certificate**
   - Log into Apple Developer Account
   - Go to Certificates, Identifiers & Profiles
   - Create a new "Developer ID Application" certificate
   - Download and install the certificate in Keychain Access

### Configuration

#### Option 1: Automatic Detection (Recommended)

If you have the certificate installed in Keychain, electron-builder will auto-detect it.

In `package.json`, the `"identity": null` setting allows auto-detection.

#### Option 2: Specify Certificate Name

Update `package.json`:

```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)"
}
```

#### Option 3: Environment Variable

Set the certificate name via environment variable:

```bash
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
npm run build:mac
```

### Notarization

For macOS 10.15+ (Catalina and later), apps must be notarized:

1. **Enable App-Specific Password**
   - Go to https://appleid.apple.com
   - Generate an app-specific password

2. **Set Environment Variables**

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

3. **Add to package.json**

```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  "notarize": {
    "teamId": "YOUR_TEAM_ID"
  }
}
```

4. **Build**

```bash
npm run build:mac
```

electron-builder will automatically notarize the app using the environment variables.

### Verify macOS Signing

After building, verify the signature:

```bash
codesign --verify --deep --strict --verbose=2 "dist/mac/VAI Studio.app"
spctl -a -vvv -t install "dist/mac/VAI Studio.app"
```

---

## Windows Code Signing

### Prerequisites

1. **Code Signing Certificate** ($100-400/year)
   - Purchase from: Sectigo, DigiCert, GlobalSign, or Comodo
   - Choose "Code Signing Certificate" (EV Code Signing for instant SmartScreen reputation)

2. **Certificate File**
   - Save the `.pfx` or `.p12` file securely
   - **NEVER commit this file to version control**

### Configuration

#### Option 1: Local Certificate File

1. Place your certificate in a secure location (e.g., `~/certs/vai-studio.pfx`)

2. Update `package.json`:

```json
"win": {
  "certificateFile": "/path/to/your/certificate.pfx",
  "certificatePassword": "your-certificate-password"
}
```

⚠️ **WARNING**: Do not commit passwords to git!

#### Option 2: Environment Variables (Recommended for CI/CD)

1. Set environment variables:

```bash
export CSC_LINK="/path/to/certificate.pfx"  # or base64 encoded cert
export CSC_KEY_PASSWORD="your-certificate-password"
```

2. In `package.json`, keep values as `null`:

```json
"win": {
  "certificateFile": null,
  "certificatePassword": null
}
```

electron-builder will automatically use the environment variables.

#### Option 3: CI/CD (GitHub Actions)

Store certificate as base64 in GitHub Secrets:

```bash
# Encode certificate
base64 -i certificate.pfx -o certificate.base64.txt

# Add to GitHub Secrets:
# CSC_LINK = <contents of certificate.base64.txt>
# CSC_KEY_PASSWORD = <certificate password>
```

In GitHub Actions workflow:

```yaml
- name: Build Windows
  env:
    CSC_LINK: ${{ secrets.CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
  run: npm run build:win
```

### Verify Windows Signing

After building, verify the signature:

```powershell
# PowerShell
Get-AuthenticodeSignature "dist\VAI Studio Setup 3.0.0.exe"

# Or use signtool (Windows SDK)
signtool verify /pa "dist\VAI Studio Setup 3.0.0.exe"
```

---

## Building Without Code Signing (Development/Testing)

For local testing without code signing:

### macOS

```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:mac
```

Or set in `package.json`:

```json
"mac": {
  "identity": null
}
```

### Windows

Simply leave `certificateFile` as `null` or unset the environment variables:

```bash
unset CSC_LINK
unset CSC_KEY_PASSWORD
npm run build:win
```

⚠️ **Note**: Unsigned builds will show security warnings to users!

---

## Security Best Practices

### DO:
- ✅ Store certificates in secure locations (encrypted drives, password managers)
- ✅ Use environment variables for passwords
- ✅ Use GitHub Secrets for CI/CD
- ✅ Rotate certificates before expiration
- ✅ Keep certificate passwords complex and unique

### DON'T:
- ❌ Commit certificates to version control
- ❌ Commit passwords to version control
- ❌ Share certificates via email or Slack
- ❌ Use the same password for multiple certificates
- ❌ Store certificates in public cloud storage

### .gitignore

Ensure these are in your `.gitignore`:

```gitignore
# Code signing certificates
*.pfx
*.p12
*.cer
*.mobileprovision

# Environment files with secrets
.env.local
.env.signing
```

---

## Troubleshooting

### macOS: "No identity found"

**Solution**: Verify certificate is installed in Keychain Access:

```bash
security find-identity -v -p codesigning
```

You should see: `Developer ID Application: Your Name (TEAM_ID)`

### macOS: Notarization fails

**Solution**: Check notarization status:

```bash
xcrun notarytool log <submission-id> --apple-id <your-apple-id>
```

Common issues:
- Expired app-specific password
- Wrong Team ID
- Missing entitlements

### Windows: "Cannot find certificate"

**Solution**: Verify certificate file exists and password is correct:

```bash
# Test certificate
openssl pkcs12 -info -in certificate.pfx -noout
```

### Windows: SmartScreen warnings

**Solution**:
- Use EV Code Signing Certificate (instant reputation)
- Or build reputation over time (100+ downloads without reports)
- Submit to Microsoft SmartScreen for reputation building

---

## Production Release Checklist

Before releasing v3.0.0:

### macOS
- [ ] Apple Developer Account active
- [ ] Developer ID Application certificate installed
- [ ] App-specific password generated
- [ ] Environment variables set (APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID)
- [ ] Notarization enabled in package.json
- [ ] Test build and verify notarization
- [ ] Test on macOS 10.15+ and 14.0+

### Windows
- [ ] Code signing certificate purchased
- [ ] Certificate file (.pfx) saved securely
- [ ] Environment variables set (CSC_LINK, CSC_KEY_PASSWORD)
- [ ] Test build and verify signature
- [ ] Test on Windows 10 and Windows 11

### Linux
- [ ] No code signing required (AppImage, DEB, RPM)
- [ ] Test on Ubuntu 22.04, Fedora 38

---

## Cost Summary

| Platform | Certificate Type | Annual Cost | Required? |
|----------|-----------------|-------------|-----------|
| macOS | Developer ID Application | $99 | Yes |
| Windows | Standard Code Signing | $100-200 | Recommended |
| Windows | EV Code Signing | $300-400 | Best (instant SmartScreen) |
| Linux | N/A | $0 | No signing needed |

**Total Annual Cost**: $200-500/year

---

## Quick Start for First Release

1. **Get Certificates**
   - Apple: https://developer.apple.com → Certificates → Developer ID Application
   - Windows: Purchase from Sectigo/DigiCert

2. **Set Environment Variables**

```bash
# macOS
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# Windows
export CSC_LINK="path/to/certificate.pfx"
export CSC_KEY_PASSWORD="your-cert-password"
```

3. **Build**

```bash
npm run build:all
```

4. **Verify**

```bash
# macOS
codesign --verify dist/mac/VAI\ Studio.app

# Windows
signtool verify /pa dist/VAI\ Studio\ Setup\ 3.0.0.exe
```

5. **Upload to GitHub Release**

Upload files from `dist/` to your GitHub Release page.

---

## Support

For issues with code signing:
- macOS: https://developer.apple.com/support/code-signing/
- Windows: https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools

For electron-builder code signing: https://www.electron.build/code-signing
