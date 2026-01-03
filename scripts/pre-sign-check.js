#!/usr/bin/env node
/**
 * Pre-Sign Validation Gate
 *
 * Validates the packaged Electron app AFTER electron-builder packs it
 * but BEFORE code signing begins. This catches structural issues early,
 * preventing wasted time on signing/notarization cycles.
 *
 * Usage: node pre-sign-check.js /path/to/VAI\ Studio.app
 *
 * Exit codes:
 *   0 - All validation checks passed
 *   1 - One or more validation checks failed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Format file size in human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if a path exists and log the result
 */
function checkPath(relativePath, fullPath, isRequired = true) {
  const exists = fs.existsSync(fullPath);
  const status = exists
    ? `${colors.green}✅${colors.reset}`
    : isRequired
    ? `${colors.red}❌${colors.reset}`
    : `${colors.yellow}⚠️${colors.reset}`;

  console.log(`  ${status} ${relativePath}`);

  if (exists && fs.statSync(fullPath).isFile()) {
    const size = fs.statSync(fullPath).size;
    console.log(`      Size: ${formatBytes(size)}`);
  }

  return exists;
}

/**
 * Validate app structure - check for required files and directories
 * Handles both asar-packed and unpacked apps
 */
function checkAppStructure(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}1. App Structure Validation${colors.reset}`);
  console.log(`   Checking: ${appPath}\n`);

  // Check for asar-packed structure first (production build)
  const asarPath = path.join(appPath, 'Contents/Resources/app.asar');
  const hasAsar = fs.existsSync(asarPath);

  if (hasAsar) {
    console.log(`  ${colors.green}✅${colors.reset} app.asar (ASAR-packed build)`);
    const asarSize = fs.statSync(asarPath).size;
    console.log(`      Size: ${formatBytes(asarSize)}`);

    // For asar builds, validate critical paths
    const checks = [
      {
        name: 'Electron Binary',
        path: 'Contents/MacOS/VAI Studio',
        required: true
      },
      {
        name: 'App Archive',
        path: 'Contents/Resources/app.asar',
        required: true
      },
      {
        name: 'Unpacked Native Modules',
        path: 'Contents/Resources/app.asar.unpacked',
        required: false
      },
      {
        name: 'Python Backends',
        path: 'Contents/Resources/backends',
        required: true
      },
      {
        name: 'Icon',
        path: 'Contents/Resources/icon.icns',
        required: false
      }
    ];

    let allPassed = true;

    for (const check of checks) {
      const fullPath = path.join(appPath, check.path);
      const exists = checkPath(check.path, fullPath, check.required);

      if (check.required && !exists) {
        allPassed = false;
        console.log(`      ${colors.red}ERROR: Required path missing${colors.reset}`);
      }
    }

    // Validate asar is substantial (should be > 100MB for this app)
    const minAsarSize = 100 * 1024 * 1024; // 100MB
    if (asarSize < minAsarSize) {
      console.log(`  ${colors.red}❌ app.asar too small (< 100MB)${colors.reset}`);
      console.log(`      Expected: > 100MB, Got: ${formatBytes(asarSize)}`);
      allPassed = false;
    } else {
      console.log(`  ${colors.green}✅ app.asar size is healthy${colors.reset}`);
    }

    return allPassed;
  }

  // Fallback: Check for unpacked structure (dev build)
  const checks = [
    {
      name: 'Electron Binary',
      path: 'Contents/MacOS/VAI Studio',
      required: true
    },
    {
      name: 'Main Process Bundle',
      path: 'Contents/Resources/dist-electron/main.js',
      required: true
    },
    {
      name: 'Preload Script',
      path: 'Contents/Resources/dist-electron/preload.js',
      required: true
    },
    {
      name: 'React Entry Point',
      path: 'Contents/Resources/dist-react/index.html',
      required: true
    },
    {
      name: 'Package Manifest',
      path: 'Contents/Resources/app/package.json',
      required: true
    },
    {
      name: 'Python Backends',
      path: 'Contents/Resources/backends',
      required: false
    }
  ];

  let allPassed = true;

  for (const check of checks) {
    const fullPath = path.join(appPath, check.path);
    const exists = checkPath(check.path, fullPath, check.required);

    if (check.required && !exists) {
      allPassed = false;
      console.log(`      ${colors.red}ERROR: Required path missing${colors.reset}`);
    }
  }

  return allPassed;
}

/**
 * Validate bundled dependencies - check for required node_modules
 * For asar builds, we skip detailed checks (dependencies are inside asar)
 */
function checkBundledDeps(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}2. Bundled Dependencies Validation${colors.reset}\n`);

  // For asar-packed builds, dependencies are inside the asar
  const asarPath = path.join(appPath, 'Contents/Resources/app.asar');
  if (fs.existsSync(asarPath)) {
    console.log(`  ${colors.green}✅${colors.reset} Dependencies bundled inside app.asar`);
    console.log(`      (Cannot verify individual packages in asar without extraction)`);

    // Check for unpacked native modules (ffmpeg-static)
    const unpackedPath = path.join(appPath, 'Contents/Resources/app.asar.unpacked');
    if (fs.existsSync(unpackedPath)) {
      console.log(`  ${colors.green}✅${colors.reset} Native modules unpacked at app.asar.unpacked`);

      // CRITICAL: Verify ffmpeg-static is actually unpacked
      const ffmpegPath = path.join(unpackedPath, 'node_modules/ffmpeg-static');
      if (fs.existsSync(ffmpegPath)) {
        // Find the actual ffmpeg binary
        const ffmpegBinary = path.join(ffmpegPath, 'ffmpeg');
        const ffmpegDarwin = path.join(ffmpegPath, 'darwin-arm64', 'ffmpeg');

        if (fs.existsSync(ffmpegBinary) || fs.existsSync(ffmpegDarwin)) {
          console.log(`  ${colors.green}✅${colors.reset} ffmpeg-static binary unpacked`);
        } else {
          console.log(`  ${colors.red}❌ ffmpeg-static unpacked but binary missing${colors.reset}`);
          console.log(`      Audio/video processing will fail!`);
          return false;
        }
      } else {
        console.log(`  ${colors.red}❌ ffmpeg-static NOT in app.asar.unpacked${colors.reset}`);
        console.log(`      Check asarUnpack config in package.json`);
        return false;
      }
    } else {
      console.log(`  ${colors.yellow}⚠️${colors.reset} No app.asar.unpacked directory`);
      console.log(`      ffmpeg-static may be inaccessible`);
    }

    return true;
  }

  // Fallback for unpacked builds
  const nodeModulesPath = path.join(
    appPath,
    'Contents/Resources/dist-electron/node_modules'
  );

  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`  ${colors.red}❌ node_modules not found at:${colors.reset}`);
    console.log(`      ${nodeModulesPath}`);
    return false;
  }

  console.log(`  ${colors.green}✅${colors.reset} node_modules directory exists\n`);

  const requiredPackages = [
    'electron-store',
    'electron-updater',
    'ffmpeg-static',
    'pdfkit'
  ];

  let allPassed = true;

  for (const pkg of requiredPackages) {
    const pkgPath = path.join(nodeModulesPath, pkg);
    const exists = fs.existsSync(pkgPath);
    const status = exists
      ? `${colors.green}✅${colors.reset}`
      : `${colors.red}❌${colors.reset}`;

    console.log(`  ${status} ${pkg}`);

    if (!exists) {
      allPassed = false;
      console.log(`      ${colors.red}ERROR: Required dependency missing${colors.reset}`);
    } else {
      // Check for package.json
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        try {
          const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          console.log(`      Version: ${pkgJson.version}`);
        } catch (e) {
          console.log(`      ${colors.yellow}Warning: Could not read package.json${colors.reset}`);
        }
      }
    }
  }

  return allPassed;
}

/**
 * Validate main bundle - check size and integrity
 * For asar builds, validates the asar file instead
 */
function checkMainBundle(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}3. Main Bundle Validation${colors.reset}\n`);

  // For asar-packed builds
  const asarPath = path.join(appPath, 'Contents/Resources/app.asar');
  if (fs.existsSync(asarPath)) {
    const stats = fs.statSync(asarPath);
    const sizeInBytes = stats.size;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    console.log(`  Bundle: app.asar (ASAR archive)`);
    console.log(`  Bundle size: ${formatBytes(sizeInBytes)}`);

    // For this app, asar should be > 100MB (contains React, electron code, node_modules)
    const minSizeMB = 100;
    if (sizeInMB < minSizeMB) {
      console.log(`  ${colors.red}❌ Bundle too small (< ${minSizeMB}MB)${colors.reset}`);
      console.log(`      This likely indicates a broken or incomplete build`);
      return false;
    }

    console.log(`  ${colors.green}✅ Bundle size is healthy${colors.reset}`);
    console.log(`  ${colors.green}✅ ASAR archive present and validated${colors.reset}`);

    return true;
  }

  // Fallback for unpacked builds
  const mainJsPath = path.join(
    appPath,
    'Contents/Resources/dist-electron/main.js'
  );

  if (!fs.existsSync(mainJsPath)) {
    console.log(`  ${colors.red}❌ main.js not found${colors.reset}`);
    return false;
  }

  const stats = fs.statSync(mainJsPath);
  const sizeInBytes = stats.size;
  const sizeInKB = sizeInBytes / 1024;
  const minSizeKB = 100;

  console.log(`  Bundle path: ${mainJsPath}`);
  console.log(`  Bundle size: ${formatBytes(sizeInBytes)}`);

  if (sizeInKB < minSizeKB) {
    console.log(`  ${colors.red}❌ Bundle too small (< ${minSizeKB}KB)${colors.reset}`);
    console.log(`      This likely indicates a broken or incomplete build`);
    return false;
  }

  console.log(`  ${colors.green}✅ Bundle size is healthy${colors.reset}`);

  // Quick sanity check - should contain electron imports
  try {
    const content = fs.readFileSync(mainJsPath, 'utf8');
    const hasElectronImport = content.includes('electron');

    if (!hasElectronImport) {
      console.log(`  ${colors.yellow}⚠️  Warning: No 'electron' references found${colors.reset}`);
      console.log(`      This may indicate a build problem`);
    } else {
      console.log(`  ${colors.green}✅ Contains Electron imports${colors.reset}`);
    }
  } catch (e) {
    console.log(`  ${colors.yellow}⚠️  Could not read bundle contents${colors.reset}`);
  }

  return true;
}

/**
 * Validate Info.plist - protocol handler, bundle ID, etc.
 */
function checkInfoPlist(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}4. Info.plist Validation${colors.reset}\n`);

  const plistPath = path.join(appPath, 'Contents/Info.plist');

  if (!fs.existsSync(plistPath)) {
    console.log(`  ${colors.red}❌ Info.plist not found${colors.reset}`);
    return false;
  }

  console.log(`  ${colors.green}✅${colors.reset} Info.plist exists`);

  let allPassed = true;

  try {
    // Use plutil to convert plist to JSON for parsing
    const plistJson = execSync(`plutil -convert json -o - "${plistPath}"`, {
      encoding: 'utf8'
    });
    const plist = JSON.parse(plistJson);

    // Check bundle identifier
    const bundleId = plist.CFBundleIdentifier;
    if (bundleId === 'com.vaistudio.app') {
      console.log(`  ${colors.green}✅${colors.reset} Bundle ID: ${bundleId}`);
    } else {
      console.log(`  ${colors.yellow}⚠️${colors.reset} Bundle ID: ${bundleId} (expected: com.vaistudio.app)`);
    }

    // Check protocol handler (CRITICAL for OAuth)
    const urlTypes = plist.CFBundleURLTypes;
    if (urlTypes && Array.isArray(urlTypes)) {
      const schemes = urlTypes.flatMap(t => t.CFBundleURLSchemes || []);
      if (schemes.includes('vai-studio')) {
        console.log(`  ${colors.green}✅${colors.reset} Protocol handler: vai-studio:// registered`);
      } else {
        console.log(`  ${colors.red}❌ Protocol handler: vai-studio:// NOT registered${colors.reset}`);
        console.log(`      Found schemes: ${schemes.join(', ') || 'none'}`);
        console.log(`      OAuth callbacks will fail without this!`);
        allPassed = false;
      }
    } else {
      console.log(`  ${colors.red}❌ No CFBundleURLTypes found - protocol handler missing${colors.reset}`);
      allPassed = false;
    }

    // Check version
    const version = plist.CFBundleShortVersionString;
    const build = plist.CFBundleVersion;
    console.log(`  ${colors.green}✅${colors.reset} Version: ${version} (${build})`);

    // Check hardened runtime entitlement reference
    if (plist.NSAppleEventsUsageDescription) {
      console.log(`  ${colors.green}✅${colors.reset} AppleEvents usage description present`);
    }

  } catch (e) {
    console.log(`  ${colors.yellow}⚠️${colors.reset} Could not parse Info.plist: ${e.message}`);
    // Don't fail - plutil might not be available on all systems
  }

  return allPassed;
}

/**
 * Validate entitlements files exist (before signing attempt)
 */
function checkEntitlements(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}5. Entitlements Validation${colors.reset}\n`);

  const projectRoot = path.resolve(__dirname, '..');
  const entitlementsPath = path.join(projectRoot, 'build/entitlements.mac.plist');

  if (!fs.existsSync(entitlementsPath)) {
    console.log(`  ${colors.red}❌ Entitlements file not found: build/entitlements.mac.plist${colors.reset}`);
    console.log(`      Code signing will fail without this file!`);
    return false;
  }

  console.log(`  ${colors.green}✅${colors.reset} build/entitlements.mac.plist exists`);

  // Validate it's parseable
  try {
    const plistJson = execSync(`plutil -convert json -o - "${entitlementsPath}"`, {
      encoding: 'utf8'
    });
    const entitlements = JSON.parse(plistJson);

    // Check for hardened runtime entitlements
    const keys = Object.keys(entitlements);
    console.log(`  ${colors.green}✅${colors.reset} Entitlements valid (${keys.length} keys)`);

    if (entitlements['com.apple.security.cs.allow-jit']) {
      console.log(`      - JIT compilation allowed`);
    }
    if (entitlements['com.apple.security.cs.allow-unsigned-executable-memory']) {
      console.log(`      - Unsigned executable memory allowed`);
    }
    if (entitlements['com.apple.security.cs.disable-library-validation']) {
      console.log(`      - Library validation disabled`);
    }

  } catch (e) {
    console.log(`  ${colors.yellow}⚠️${colors.reset} Could not validate entitlements: ${e.message}`);
  }

  return true;
}

/**
 * Validate extra resources (models, scripts, etc.)
 */
function checkExtraResources(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}6. Extra Resources Validation${colors.reset}\n`);

  let allPassed = true;

  const resourcesPath = path.join(appPath, 'Contents/Resources');

  // Check models directory
  const modelsPath = path.join(resourcesPath, 'models');
  if (fs.existsSync(modelsPath)) {
    const modelFiles = fs.readdirSync(modelsPath);
    if (modelFiles.length > 0) {
      console.log(`  ${colors.green}✅${colors.reset} Models directory: ${modelFiles.length} files`);

      // Validate model files are not truncated/corrupted
      let modelIssues = 0;
      for (const file of modelFiles) {
        const filePath = path.join(modelsPath, file);
        const stats = fs.statSync(filePath);

        // Check for suspiciously small files (likely corrupted)
        if (stats.isFile()) {
          if (stats.size === 0) {
            console.log(`      ${colors.red}❌ ${file}: Empty file (0 bytes)${colors.reset}`);
            modelIssues++;
          } else if (file.endsWith('.bin') && stats.size < 1024 * 1024) {
            // .bin model files should be at least 1MB
            console.log(`      ${colors.yellow}⚠️${colors.reset} ${file}: Suspiciously small (${formatBytes(stats.size)})`);
          } else {
            console.log(`      ✓ ${file}: ${formatBytes(stats.size)}`);
          }
        }
      }

      if (modelIssues > 0) {
        console.log(`  ${colors.red}❌ ${modelIssues} model file(s) appear corrupted${colors.reset}`);
        allPassed = false;
      }
    } else {
      console.log(`  ${colors.yellow}⚠️${colors.reset} Models directory exists but is empty`);
    }
  } else {
    console.log(`  ${colors.yellow}⚠️${colors.reset} Models directory not found (may be downloaded at runtime)`);
  }

  // Check Python wrapper script
  const wrapperPath = path.join(resourcesPath, 'scripts/python-wrapper.sh');
  if (fs.existsSync(wrapperPath)) {
    console.log(`  ${colors.green}✅${colors.reset} Python wrapper script exists`);

    // Check if executable
    try {
      fs.accessSync(wrapperPath, fs.constants.X_OK);
      console.log(`  ${colors.green}✅${colors.reset} Python wrapper script is executable`);
    } catch (e) {
      console.log(`  ${colors.red}❌ Python wrapper script is NOT executable${colors.reset}`);
      allPassed = false;
    }
  } else {
    console.log(`  ${colors.yellow}⚠️${colors.reset} Python wrapper script not found`);
  }

  // Check backends directory has Python files
  const backendsPath = path.join(resourcesPath, 'backends');
  if (fs.existsSync(backendsPath)) {
    // Look for main.py or similar
    const hasPythonEntry = fs.existsSync(path.join(backendsPath, 'main.py')) ||
                          fs.existsSync(path.join(backendsPath, 'api.py')) ||
                          fs.existsSync(path.join(backendsPath, 'server.py'));

    if (hasPythonEntry) {
      console.log(`  ${colors.green}✅${colors.reset} Python backend entry point found`);
    } else {
      console.log(`  ${colors.yellow}⚠️${colors.reset} No obvious Python entry point (main.py, api.py, server.py)`);
    }

    // Check for venv
    const venvPath = path.join(backendsPath, 'venv');
    if (fs.existsSync(venvPath)) {
      console.log(`  ${colors.green}✅${colors.reset} Python venv bundled`);
    } else {
      console.log(`  ${colors.yellow}⚠️${colors.reset} Python venv not bundled (may be created at runtime)`);
    }
  }

  return allPassed;
}

/**
 * Validate native modules architecture (macOS)
 */
function checkNativeModules(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}7. Native Modules Architecture${colors.reset}\n`);

  const unpackedPath = path.join(appPath, 'Contents/Resources/app.asar.unpacked');

  if (!fs.existsSync(unpackedPath)) {
    console.log(`  ${colors.yellow}⚠️${colors.reset} No unpacked native modules found`);
    return true;
  }

  let allPassed = true;

  // Find all .node files
  function findNodeFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findNodeFiles(fullPath, files);
      } else if (entry.name.endsWith('.node')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const nodeFiles = findNodeFiles(unpackedPath);

  if (nodeFiles.length === 0) {
    console.log(`  ${colors.green}✅${colors.reset} No .node files to validate`);
    return true;
  }

  console.log(`  Found ${nodeFiles.length} native module(s)`);

  // Check architecture of each .node file
  const expectedArch = process.arch === 'arm64' ? 'arm64' : 'x86_64';

  for (const nodeFile of nodeFiles.slice(0, 5)) { // Check first 5
    try {
      const fileOutput = execSync(`file "${nodeFile}"`, { encoding: 'utf8' });
      const relativePath = path.relative(unpackedPath, nodeFile);

      if (fileOutput.includes(expectedArch) || fileOutput.includes('universal')) {
        console.log(`  ${colors.green}✅${colors.reset} ${relativePath}`);
      } else {
        console.log(`  ${colors.red}❌ ${relativePath} - wrong architecture${colors.reset}`);
        console.log(`      Expected: ${expectedArch}`);
        console.log(`      Got: ${fileOutput.trim()}`);
        allPassed = false;
      }
    } catch (e) {
      console.log(`  ${colors.yellow}⚠️${colors.reset} Could not check ${path.basename(nodeFile)}`);
    }
  }

  if (nodeFiles.length > 5) {
    console.log(`  ... and ${nodeFiles.length - 5} more`);
  }

  return allPassed;
}

/**
 * Main validation orchestrator
 */
function main() {
  console.log('\n');
  console.log('========================================');
  console.log('  PRE-SIGN VALIDATION GATE');
  console.log('========================================');

  // Get app path from command line
  const appPath = process.argv[2];

  if (!appPath) {
    console.error(`\n${colors.red}ERROR: No app path provided${colors.reset}`);
    console.error('Usage: node pre-sign-check.js /path/to/VAI\\ Studio.app\n');
    process.exit(1);
  }

  if (!fs.existsSync(appPath)) {
    console.error(`\n${colors.red}ERROR: App path does not exist:${colors.reset}`);
    console.error(`  ${appPath}\n`);
    process.exit(1);
  }

  // Run all validation checks
  const results = {
    structure: checkAppStructure(appPath),
    dependencies: checkBundledDeps(appPath),
    bundle: checkMainBundle(appPath),
    infoPlist: checkInfoPlist(appPath),
    entitlements: checkEntitlements(appPath),
    resources: checkExtraResources(appPath),
    nativeModules: checkNativeModules(appPath)
  };

  // Print summary
  console.log('\n========================================');
  console.log('  VALIDATION SUMMARY');
  console.log('========================================\n');

  const allPassed = Object.values(results).every(result => result === true);

  for (const [check, passed] of Object.entries(results)) {
    const status = passed
      ? `${colors.green}✅ PASS${colors.reset}`
      : `${colors.red}❌ FAIL${colors.reset}`;
    const label = check.charAt(0).toUpperCase() + check.slice(1);
    console.log(`  ${status} ${label}`);
  }

  console.log('\n========================================\n');

  if (allPassed) {
    console.log(`${colors.green}${colors.bold}✅ All validation checks passed!${colors.reset}`);
    console.log(`${colors.green}Proceeding with code signing...${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Validation failed!${colors.reset}`);
    console.log(`${colors.red}Aborting build to prevent signing broken artifacts.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { checkAppStructure, checkBundledDeps, checkMainBundle };
