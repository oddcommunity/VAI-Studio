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
  'keytar',
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

function main() {
  console.log('='.repeat(60));
  console.log('Dependency Checker for Bundled Electron Main Process');
  console.log('='.repeat(60));
  console.log('');

  const mainOk = checkBundledFile();
  const preloadOk = checkPreload();

  console.log('\n' + '='.repeat(60));

  if (mainOk && preloadOk) {
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

module.exports = { extractRequires, checkBundledFile, checkPreload };
