#!/usr/bin/env node

/**
 * Dependency checker for bundled Electron main process
 *
 * This script scans the bundled main.js for require() calls and verifies
 * that all required modules are either:
 * 1. Bundled into main.js (most dependencies)
 * 2. Present in dist-electron/node_modules (externalized dependencies)
 * 3. Native Electron modules (provided by runtime)
 *
 * Run this before building to catch missing dependencies early.
 */

const fs = require('fs');
const path = require('path');

// Modules provided by Electron runtime (don't need to be in node_modules)
const electronModules = [
  'electron',
  'fsevents', // macOS native, optional
];

// Modules that should be externalized (in dist-electron/node_modules)
const externalModules = [
  'electron-store',
  'electron-updater',
  'ffmpeg-static',
  'pdfkit',
  // Workspace packages (symlinked, must be copied not bundled)
  '@odd-core/api',
  '@odd-core/auth',
  '@odd-core/log',
  '@odd-core/storage',
  '@odd-core/types',
  '@odd-core/ui',
  '@odd-design-system/design-tokens',
  '@odd-design-system/icons',
  '@odd-design-system/ui-components',
];

// Node.js built-in modules (don't need to be in node_modules)
const builtinModules = [
  'fs', 'path', 'os', 'child_process', 'crypto', 'http', 'https',
  'net', 'stream', 'util', 'events', 'buffer', 'url', 'querystring',
  'readline', 'zlib', 'tls', 'dgram', 'dns', 'timers', 'assert',
  'console', 'process', 'v8', 'vm', 'cluster', 'tty', 'repl',
  'string_decoder', 'punycode', 'module', 'domain', 'constants',
];

function extractRequires(code) {
  // Match require('module-name') calls
  const requireRegex = /require\(['"]([@\w\-\/\.]+)['"]\)/g;
  const requires = new Set();

  let match;
  while ((match = requireRegex.exec(code)) !== null) {
    const moduleName = match[1];

    // Ignore relative requires (bundled files)
    if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
      continue;
    }

    // Extract package name (handle @scope/package)
    let packageName = moduleName;
    if (moduleName.startsWith('@')) {
      // @scope/package or @scope/package/subpath
      const parts = moduleName.split('/');
      packageName = `${parts[0]}/${parts[1]}`;
    } else {
      // package or package/subpath
      packageName = moduleName.split('/')[0];
    }

    requires.add(packageName);
  }

  return Array.from(requires);
}

function checkBundledFile() {
  console.log('Checking bundled main.js dependencies...\n');

  const bundledMainPath = path.join(__dirname, '../dist-electron/main.js');

  if (!fs.existsSync(bundledMainPath)) {
    console.error('ERROR: dist-electron/main.js not found');
    console.error('Run ./scripts/bundle-electron.sh first\n');
    return false;
  }

  const code = fs.readFileSync(bundledMainPath, 'utf8');
  const requires = extractRequires(code);

  console.log(`Found ${requires.length} unique require() calls:\n`);

  let hasErrors = false;
  const missing = [];
  const correct = [];

  for (const moduleName of requires.sort()) {
    // Check if it's a built-in module
    if (builtinModules.includes(moduleName)) {
      correct.push(`  ✓ ${moduleName} (Node.js built-in)`);
      continue;
    }

    // Check if it's an Electron module
    if (electronModules.includes(moduleName)) {
      correct.push(`  ✓ ${moduleName} (Electron runtime)`);
      continue;
    }

    // Check if it should be external
    if (externalModules.includes(moduleName)) {
      const externalPath = path.join(__dirname, '../dist-electron/node_modules', moduleName);
      if (fs.existsSync(externalPath)) {
        correct.push(`  ✓ ${moduleName} (external, found in node_modules)`);
      } else {
        missing.push(`  ✗ ${moduleName} (external, but MISSING from dist-electron/node_modules)`);
        hasErrors = true;
      }
      continue;
    }

    // If we get here, the module should have been bundled but might not be
    // We can't easily verify if it was bundled, so just note it
    correct.push(`  ? ${moduleName} (should be bundled - verify manually if issues occur)`);
  }

  // Print results
  if (correct.length > 0) {
    correct.forEach(line => console.log(line));
  }

  if (missing.length > 0) {
    console.log('\n❌ ERRORS:\n');
    missing.forEach(line => console.log(line));
    console.log('\nFix: Update esbuild.config.js to copy these modules to dist-electron/node_modules\n');
  }

  return !hasErrors;
}

function checkPreload() {
  console.log('\n' + '='.repeat(60));
  console.log('Checking bundled preload.js dependencies...\n');

  const preloadPath = path.join(__dirname, '../dist-electron/preload.js');

  if (!fs.existsSync(preloadPath)) {
    console.error('ERROR: dist-electron/preload.js not found');
    console.error('Run ./scripts/bundle-electron.sh first\n');
    return false;
  }

  const code = fs.readFileSync(preloadPath, 'utf8');
  const requires = extractRequires(code);

  console.log(`Found ${requires.length} unique require() calls:\n`);

  let hasErrors = false;

  for (const moduleName of requires.sort()) {
    if (moduleName === 'electron') {
      console.log(`  ✓ ${moduleName} (Electron runtime)`);
    } else if (builtinModules.includes(moduleName)) {
      console.log(`  ✓ ${moduleName} (Node.js built-in)`);
    } else {
      console.log(`  ✗ ${moduleName} (should not be in preload - security risk)`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log('\n❌ Preload should only require electron and built-ins\n');
  }

  return !hasErrors;
}

function checkTransitiveDependencies(nodeModulesPath) {
  console.log('\n' + '='.repeat(60));
  console.log('Checking transitive dependencies...\n');

  if (!fs.existsSync(nodeModulesPath)) {
    console.error(`ERROR: ${nodeModulesPath} not found`);
    console.error('Run ./scripts/bundle-electron.sh first\n');
    return false;
  }

  // Only check transitive deps for non-workspace external modules
  const packagesToCheck = externalModules.filter(pkg => !pkg.startsWith('@odd'));

  console.log(`Checking transitive dependencies for: ${packagesToCheck.join(', ')}\n`);

  let hasErrors = false;
  const allModulesToSkip = [...builtinModules, ...electronModules];

  for (const packageName of packagesToCheck) {
    const packagePath = path.join(nodeModulesPath, packageName);

    if (!fs.existsSync(packagePath)) {
      console.log(`  ⚠ ${packageName} not found in node_modules (skipping transitive check)`);
      continue;
    }

    const packageJsonPath = path.join(packagePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.log(`  ⚠ ${packageName}/package.json not found (skipping)`);
      continue;
    }

    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (err) {
      console.log(`  ⚠ Failed to parse ${packageName}/package.json: ${err.message}`);
      continue;
    }

    const dependencies = packageJson.dependencies || {};
    const depNames = Object.keys(dependencies);

    if (depNames.length === 0) {
      console.log(`  ✓ ${packageName} (no transitive dependencies)`);
      continue;
    }

    console.log(`  ${packageName}:`);

    for (const depName of depNames.sort()) {
      // Skip built-in modules and Electron modules
      if (allModulesToSkip.includes(depName)) {
        console.log(`    ✓ ${packageName} → ${depName} (built-in/electron)`);
        continue;
      }

      // Check if transitive dependency exists
      // First check top-level, then check nested under parent package
      // (pnpm nests deps when there are version conflicts)
      let depPath = path.join(nodeModulesPath, depName);
      let location = 'top-level';

      if (!fs.existsSync(depPath)) {
        // Check nested under parent package (e.g., conf/node_modules/ajv)
        const nestedPath = path.join(nodeModulesPath, packageName, 'node_modules', depName);
        if (fs.existsSync(nestedPath)) {
          depPath = nestedPath;
          location = 'nested';
        }
      }

      if (fs.existsSync(depPath)) {
        console.log(`    ✓ ${packageName} → ${depName} (${location})`);
      } else {
        console.log(`    ✗ ${packageName} → ${depName} (MISSING - checked both top-level and nested)`);
        hasErrors = true;
      }
    }

    console.log('');
  }

  if (hasErrors) {
    console.log('❌ Transitive dependency check FAILED\n');
    console.log('Fix: Update esbuild.config.js or run npm install in dist-electron/\n');
  } else {
    console.log('✓ All transitive dependencies present\n');
  }

  return !hasErrors;
}

/**
 * Check that workspace packages are actually bundled into main.js
 * This catches the case where esbuild externalized them instead of bundling
 */
function checkWorkspacePackagesBundled() {
  console.log('\n' + '='.repeat(60));
  console.log('Checking workspace packages are bundled...\n');

  const bundledMainPath = path.join(__dirname, '../dist-electron/main.js');

  if (!fs.existsSync(bundledMainPath)) {
    console.log('ERROR: dist-electron/main.js not found');
    return false;
  }

  const code = fs.readFileSync(bundledMainPath, 'utf8');

  // These are critical symbols that MUST be in the bundle
  // They come from @odd-core/* packages
  const requiredSymbols = [
    // From @odd-core/auth - authentication functionality
    { pattern: /supabase|createClient|signIn|signOut/i, name: 'Supabase auth code', critical: true },

    // From @odd-core/storage - storage functionality
    { pattern: /electron-store|Store/i, name: 'Electron store code', critical: true },

    // From @odd-core/log - logging
    { pattern: /console\.(log|error|warn|info)/i, name: 'Logging code', critical: false },

    // General electron code
    { pattern: /BrowserWindow|ipcMain|app\./i, name: 'Electron main process code', critical: true },

    // Auto-updater
    { pattern: /autoUpdater|electron-updater/i, name: 'Auto-updater code', critical: true },
  ];

  let hasErrors = false;
  let criticalMissing = [];

  for (const { pattern, name, critical } of requiredSymbols) {
    if (pattern.test(code)) {
      console.log(`  ✓ ${name}`);
    } else {
      if (critical) {
        console.log(`  ✗ ${name} (CRITICAL - MISSING)`);
        criticalMissing.push(name);
        hasErrors = true;
      } else {
        console.log(`  ? ${name} (not found, may be optional)`);
      }
    }
  }

  // Also verify bundle is substantial
  const bundleSizeKB = code.length / 1024;
  const minBundleSizeKB = 500; // Bundle should be at least 500KB

  console.log(`\n  Bundle size: ${bundleSizeKB.toFixed(0)} KB`);

  if (bundleSizeKB < minBundleSizeKB) {
    console.log(`  ✗ Bundle too small (< ${minBundleSizeKB} KB) - workspace packages may not be bundled`);
    hasErrors = true;
  } else {
    console.log(`  ✓ Bundle size is healthy`);
  }

  if (hasErrors) {
    console.log('\n❌ Workspace package bundling check FAILED');
    if (criticalMissing.length > 0) {
      console.log(`Missing critical code: ${criticalMissing.join(', ')}`);
    }
    console.log('\nPossible causes:');
    console.log('  1. esbuild.config.js has workspace packages in "external"');
    console.log('  2. Workspace packages failed to resolve');
    console.log('  3. Build ran with wrong configuration\n');
  } else {
    console.log('\n✓ Workspace packages appear to be bundled correctly\n');
  }

  return !hasErrors;
}

/**
 * Check package.json integrity for all external modules
 */
function checkPackageJsonIntegrity(nodeModulesPath) {
  console.log('='.repeat(60));
  console.log('Checking package.json integrity...\n');

  if (!fs.existsSync(nodeModulesPath)) {
    console.log('⚠ node_modules not found, skipping integrity check');
    return true;
  }

  const packagesToCheck = ['electron-store', 'electron-updater', 'ffmpeg-static', 'pdfkit'];
  let hasErrors = false;

  for (const pkg of packagesToCheck) {
    const pkgPath = path.join(nodeModulesPath, pkg, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      console.log(`  ⚠ ${pkg}/package.json not found`);
      continue;
    }

    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      // Validate required fields
      if (!pkgJson.name || !pkgJson.version) {
        console.log(`  ✗ ${pkg}/package.json missing name or version`);
        hasErrors = true;
      } else if (!pkgJson.main && !pkgJson.exports) {
        console.log(`  ⚠ ${pkg}/package.json missing main entry point`);
      } else {
        console.log(`  ✓ ${pkg}@${pkgJson.version}`);
      }
    } catch (e) {
      console.log(`  ✗ ${pkg}/package.json is corrupted: ${e.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log('\n❌ Package.json integrity check FAILED\n');
  } else {
    console.log('\n✓ All package.json files are valid\n');
  }

  return !hasErrors;
}

function main() {
  console.log('='.repeat(60));
  console.log('Dependency Checker for Bundled Electron Main Process');
  console.log('='.repeat(60));
  console.log('');

  const mainOk = checkBundledFile();
  const preloadOk = checkPreload();

  const nodeModulesPath = path.join(__dirname, '../dist-electron/node_modules');
  const transitiveOk = checkTransitiveDependencies(nodeModulesPath);
  const workspaceOk = checkWorkspacePackagesBundled();
  const integrityOk = checkPackageJsonIntegrity(nodeModulesPath);

  console.log('\n' + '='.repeat(60));

  const allOk = mainOk && preloadOk && transitiveOk && workspaceOk && integrityOk;

  if (allOk) {
    console.log('✓ All dependencies are accounted for');
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.log('✗ Dependency issues found - fix before building');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractRequires, checkBundledFile, checkPreload, checkTransitiveDependencies };
