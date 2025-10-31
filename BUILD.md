# VAI Studio - Build & Distribution Guide

This guide covers building, packaging, and distributing VAI Studio for developers.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Python Bundling System](#python-bundling-system)
4. [Building for Distribution](#building-for-distribution)
5. [Platform-Specific Builds](#platform-specific-builds)
6. [Testing Builds](#testing-builds)
7. [Release Process](#release-process)
8. [Troubleshooting Build Issues](#troubleshooting-build-issues)

---

## Development Setup

### Prerequisites

- **Node.js**: v16 or higher
- **npm**: v8 or higher
- **Python**: 3.8 or higher
- **Git**: Latest version

### Install Dependencies

```bash
# Clone repository
git clone https://github.com/yourusername/localvoice-ai.git
cd localvoice-ai

# Install Node dependencies
npm install

# Install Python dependencies
pip install torch transformers openai-whisper faster-whisper
```

### Run in Development Mode

```bash
# Start with DevTools open
npm run dev

# Or start normally
npm start
```

### Development Tools

- **DevTools**: Automatically opens in dev mode
- **Hot Reload**: Not enabled - restart app to see changes
- **Logging**: Check console for errors and debug info

---

## Project Structure

```
localvoice-ai/
├── electron/              # Electron main process
│   ├── main.js           # Main process entry point
│   └── preload.js        # Preload script (IPC bridge)
│
├── src/                   # Frontend application
│   ├── index.html        # Main HTML file
│   ├── app.js            # Application logic
│   └── styles.css        # Styles and animations
│
├── backends/              # Python backend processors
│   ├── base.py           # Abstract base class
│   ├── whisper_backend.py
│   ├── voxtral_backend.py
│   └── runner.py         # CLI interface
│
├── assets/               # Application assets
│   ├── icon.icns         # macOS icon
│   ├── icon.ico          # Windows icon
│   └── icon.png          # Linux icon
│
├── package.json          # Node dependencies and build config
├── README.md
├── USER_GUIDE.md
├── QUICKSTART.md
└── BUILD.md              # This file
```

### Key Files

**electron/main.js**
- Creates application window
- Handles IPC communication
- Manages Python subprocess
- File dialogs and system integration

**electron/preload.js**
- Security bridge between main and renderer
- Exposes safe IPC methods to frontend
- No direct Node.js access from renderer

**src/app.js**
- Frontend application logic
- State management
- UI event handlers
- Toast notifications

**backends/runner.py**
- CLI interface for Python backends
- Handles: list-backends, list-models, transcribe, download
- Returns JSON to Electron

---

## Python Bundling System

VAI Studio includes an automated Python bundling system that packages Python and all dependencies for distribution. This ensures users don't need to install Python separately.

### How It Works

The build process uses a pre-build script (`scripts/prepare-python-bundle.sh`) that:

1. Creates a clean `backends-bundle/` directory
2. Copies all Python backend scripts
3. Creates a fresh virtual environment with all dependencies
4. Installs packages from `backends/requirements.txt`
5. Removes unnecessary files to reduce bundle size:
   - `__pycache__` directories
   - `.pyc` and `.pyo` compiled files
   - `.dist-info` directories
   - `tests` and `test` directories

### Automatic Execution

The bundling script runs automatically before every build:

```bash
# These commands automatically run the bundling script first:
npm run build          # Runs prebuild, then builds
npm run build:mac      # Runs prebuild, then builds for macOS
npm run build:win      # Runs prebuild, then builds for Windows
npm run build:linux    # Runs prebuild, then builds for Linux
```

### Manual Bundling

To manually create the Python bundle (useful for testing):

```bash
npm run prebuild
```

This creates `backends-bundle/` with a complete, standalone Python environment.

### Environment Detection

The application automatically detects its environment and uses the appropriate Python:

- **Development** (`npm start`): Uses `backends/venv/bin/python3`
- **Production** (packaged app): Uses bundled Python from `process.resourcesPath/backends/venv/bin/python3`
- **Docker** (optional): Uses `/app/venv/bin/python`

This is handled automatically in `electron/main.js`:

```javascript
if (app.isPackaged) {
  // Production - use bundled Python
  pythonPath = path.join(process.resourcesPath, 'backends', 'venv', 'bin', 'python3');
} else {
  // Development - use local venv
  pythonPath = path.join(__dirname, '../backends/venv/bin/python3');
}
```

### Bundle Size Optimization

The bundling script already optimizes size by removing:
- Test files and directories
- Cached Python bytecode
- Package metadata (.dist-info)

Typical bundle sizes:
- Base installation (Whisper only): ~500MB - 800MB
- With additional backends: ~1GB - 2GB

To further reduce size:
- Models are downloaded separately (not included in bundle)
- Only essential Python packages are included
- Binary libraries are platform-specific

### Troubleshooting Python Bundle

**Problem**: "Python executable not found" in production

**Solution**: Verify the bundle was created:
```bash
ls -la backends-bundle/venv/bin/
```

**Problem**: "ModuleNotFoundError" for Python dependencies

**Solution**: Rebuild the bundle and check requirements.txt:
```bash
npm run prebuild
cd backends-bundle/venv && source bin/activate && pip list
```

**Problem**: Bundle creation fails

**Solution**: Ensure Python 3.9+ is installed and accessible:
```bash
python3 --version
which python3
```

---

## Building for Distribution

### Build Configuration

Build settings are defined in `package.json` under the `build` key:

```json
{
  "build": {
    "appId": "com.vaistudio.app",
    "productName": "VAI Studio",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "src/**/*",
      "backends/**/*.py",
      "!backends/__pycache__",
      "!backends/*.pyc",
      "node_modules/**/*"
    ],
    "extraResources": [
      {
        "from": "backends-bundle",
        "to": "backends",
        "filter": [
          "**/*",
          "!**/__pycache__",
          "!**/*.pyc",
          "!**/*.pyo"
        ]
      }
    ]
  }
}
```

### Build All Platforms

```bash
# Build for all platforms (macOS, Windows, Linux)
npm run build:all
```

**Requirements**:
- Can only build for current platform without additional setup
- Cross-platform building requires platform-specific machines or CI/CD

### Build Output

Built applications appear in `dist/` directory:

```
dist/
├── mac/
│   ├── VAI Studio.app
│   └── VAI Studio.dmg
├── win-unpacked/
│   └── VAI Studio.exe
├── VAI Studio Setup.exe
├── linux-unpacked/
└── VAI-Studio-x.y.z.AppImage
```

---

## Platform-Specific Builds

### macOS

```bash
npm run build:mac
```

**Output**:
- `dist/mac/VAI Studio.app` - Application bundle
- `dist/VAI Studio-{version}.dmg` - Disk image installer
- `dist/VAI Studio-{version}-mac.zip` - Zipped app

**Requirements**:
- Must build on macOS
- Xcode Command Line Tools installed

**Code Signing** (optional):
```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "entitlements.mac.plist",
      "entitlementsInherit": "entitlements.mac.plist"
    }
  }
}
```

**Notarization** (for Gatekeeper):
```bash
# After building
xcrun altool --notarize-app \
  --primary-bundle-id "com.localvoiceai.app" \
  --username "your@email.com" \
  --password "@keychain:AC_PASSWORD" \
  --file "dist/LocalVoice AI-{version}.dmg"
```

### Windows

```bash
npm run build:win
```

**Output**:
- `dist/VAI Studio Setup {version}.exe` - NSIS installer
- `dist/VAI Studio {version}.exe` - Portable executable

**Requirements**:
- Can build on any platform with `wine` (for NSIS)
- For best results, build on Windows

**Code Signing** (optional):
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

**Installer Options**:
```json
{
  "build": {
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "installerIcon": "assets/icon.ico",
      "uninstallerIcon": "assets/icon.ico"
    }
  }
}
```

### Linux

```bash
npm run build:linux
```

**Output**:
- `dist/VAI-Studio-{version}.AppImage` - Universal Linux package
- `dist/vai-studio_{version}_amd64.deb` - Debian/Ubuntu
- `dist/vai-studio-{version}.x86_64.rpm` - Fedora/RHEL

**Requirements**:
- Build on Linux for best results
- `fakeroot` and `dpkg` for deb packages

**AppImage Benefits**:
- Works on all distributions
- No installation required
- Portable

---

## Testing Builds

### Test Before Release

1. **Functionality Testing**:
   ```bash
   # Build for your platform
   npm run build:mac  # or build:win, build:linux

   # Install and launch
   # Test all major features
   ```

2. **Features to Test**:
   - Application launches without errors
   - Backend selection and model loading
   - File selection dialog
   - Transcription works with multiple models
   - Comparison mode works
   - Export to all formats (TXT, JSON, SRT, VTT)
   - Model Manager opens and shows models
   - Settings save and persist
   - Toast notifications appear

3. **Performance Testing**:
   - Test with small models (base)
   - Test with large models (large-v3)
   - Test with different audio files
   - Test CPU vs GPU modes

4. **Error Handling**:
   - Test without Python installed
   - Test without models downloaded
   - Test with corrupted audio files
   - Test with very large files

### Automated Testing (TODO)

```bash
# Unit tests (not yet implemented)
npm test

# Integration tests (not yet implemented)
npm run test:integration

# E2E tests (not yet implemented)
npm run test:e2e
```

---

## Release Process

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes

### Pre-Release Checklist

- [ ] Update version in `package.json`
- [ ] Update `VERSION_3_PROGRESS.md` or create new version doc
- [ ] Update `CHANGELOG.md` with changes
- [ ] Test on all target platforms
- [ ] Verify Python dependencies list is current
- [ ] Check all documentation is up to date
- [ ] Test model downloads
- [ ] Test export formats
- [ ] Verify settings persist correctly

### Release Steps

1. **Update Version**:
   ```bash
   # Update version in package.json
   npm version minor  # or major/patch
   ```

2. **Create Git Tag**:
   ```bash
   git add .
   git commit -m "Release v3.0.0"
   git tag -a v3.0.0 -m "Version 3.0.0"
   git push origin main --tags
   ```

3. **Build for All Platforms**:
   ```bash
   # On macOS
   npm run build:mac

   # On Windows
   npm run build:win

   # On Linux
   npm run build:linux
   ```

4. **Create GitHub Release**:
   - Go to GitHub → Releases → New Release
   - Select tag version
   - Add release notes
   - Upload platform binaries:
     - `VAI-Studio-{version}.dmg`
     - `VAI-Studio-Setup-{version}.exe`
     - `VAI-Studio-{version}.AppImage`
     - `vai-studio_{version}_amd64.deb`
   - Publish release

5. **Update Auto-Update Server** (if configured):
   ```bash
   # Update latest.yml files
   npm run publish
   ```

### Post-Release

- [ ] Announce on social media/blog
- [ ] Update README with new features
- [ ] Monitor issues for bug reports
- [ ] Prepare hotfix if critical bugs found

---

## Troubleshooting Build Issues

### Common Build Errors

#### Error: `Cannot find module 'electron'`

**Solution**:
```bash
npm install
```

#### Error: `Python backend not found in packaged app`

**Solution**: Verify `extraResources` in `package.json` includes backends:
```json
"extraResources": [
  {
    "from": "backends",
    "to": "backends",
    "filter": ["**/*.py", "!__pycache__", "!*.pyc"]
  }
]
```

#### Error: `App won't launch on macOS (damaged/untrusted)`

**Solutions**:
1. User workaround: Right-click → Open
2. Developer: Code sign and notarize the app
3. Temporary: `xattr -cr "LocalVoice AI.app"`

#### Error: `Windows Defender blocks app`

**Solutions**:
1. Code sign with valid certificate
2. User: Add exception in Windows Security
3. Submit to Microsoft for analysis

#### Error: `Build fails on Linux - missing dependencies`

**Solution**:
```bash
# Install build dependencies
sudo apt-get install fakeroot dpkg rpm
```

#### Error: `Large bundle size (>500MB)`

**Solutions**:
1. Exclude unnecessary files in `package.json`
2. Use `asarUnpack` for large static files
3. Remove unused dependencies
4. Don't bundle Python models (download separately)

### Debug Build Issues

```bash
# Verbose electron-builder output
DEBUG=electron-builder npm run build

# Test packaging without building installer
electron-builder --dir

# Check what files are included
electron-builder --dir --prepackaged dist/linux-unpacked
```

---

## CI/CD Setup (GitHub Actions Example)

Create `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm install
      - run: npm run build:mac
      - uses: actions/upload-artifact@v3
        with:
          name: mac-build
          path: dist/*.dmg

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm install
      - run: npm run build:win
      - uses: actions/upload-artifact@v3
        with:
          name: windows-build
          path: dist/*.exe

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm install
      - run: npm run build:linux
      - uses: actions/upload-artifact@v3
        with:
          name: linux-build
          path: dist/*.AppImage
```

---

## Advanced Configuration

### Auto-Update System

Configure in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "yourusername",
      "repo": "vai-studio"
    }
  }
}
```

Add to `electron/main.js`:

```javascript
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

### Custom Installer Icon

Place icons in `assets/`:
- **macOS**: `icon.icns` (512x512)
- **Windows**: `icon.ico` (256x256)
- **Linux**: `icon.png` (512x512)

Generate icons from PNG:

```bash
# macOS
npm install -g png2icons
png2icons icon.png assets/icon.icns

# Windows
npm install -g png-to-ico
png-to-ico icon.png > assets/icon.ico
```

---

## Resources

- **electron-builder Docs**: https://www.electron.build/
- **Electron Docs**: https://www.electronjs.org/docs
- **Code Signing**: https://www.electron.build/code-signing
- **GitHub Releases**: https://docs.github.com/en/repositories/releasing-projects-on-github

---

## Contributing to Build Process

Improvements to the build process are welcome!

Areas for contribution:
- CI/CD automation
- Cross-platform building
- Automated testing
- Code signing automation
- Size optimization
- Installer improvements

See `CONTRIBUTING.md` for guidelines.

---

Happy building! 🛠️
