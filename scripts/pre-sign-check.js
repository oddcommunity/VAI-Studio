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
 */
function checkAppStructure(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}1. App Structure Validation${colors.reset}`);
  console.log(`   Checking: ${appPath}\n`);

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
 */
function checkBundledDeps(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}2. Bundled Dependencies Validation${colors.reset}\n`);

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
 */
function checkMainBundle(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}3. Main Bundle Validation${colors.reset}\n`);

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
    bundle: checkMainBundle(appPath)
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
