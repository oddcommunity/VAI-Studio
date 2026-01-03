#!/usr/bin/env node
/**
 * React Bundle Integrity Check
 *
 * Validates the Vite-built React bundle after build.
 * Catches corrupted builds, missing entry points, and size regressions.
 *
 * Run after: pnpm run build:react
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const projectRoot = path.resolve(__dirname, '..');
const distReactPath = path.join(projectRoot, 'dist-react');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function checkReactBundle() {
  console.log('\n========================================');
  console.log('  REACT BUNDLE INTEGRITY CHECK');
  console.log('========================================\n');

  let hasErrors = false;
  let hasWarnings = false;

  // 1. Check dist-react directory exists
  if (!fs.existsSync(distReactPath)) {
    console.log(`${colors.red}❌ dist-react/ directory not found${colors.reset}`);
    console.log('   Run: pnpm run build:react');
    return false;
  }
  console.log(`${colors.green}✅${colors.reset} dist-react/ directory exists`);

  // 2. Check index.html exists and has content
  const indexPath = path.join(distReactPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log(`${colors.red}❌ dist-react/index.html not found${colors.reset}`);
    hasErrors = true;
  } else {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const indexSize = Buffer.byteLength(indexContent, 'utf8');

    console.log(`${colors.green}✅${colors.reset} index.html exists (${formatBytes(indexSize)})`);

    // Check for critical elements
    if (!indexContent.includes('<div id="root">') && !indexContent.includes('id="root"')) {
      console.log(`${colors.red}❌ index.html missing root element${colors.reset}`);
      hasErrors = true;
    }

    if (!indexContent.includes('<script')) {
      console.log(`${colors.red}❌ index.html missing script tags${colors.reset}`);
      hasErrors = true;
    }

    // Check for Vite build markers
    if (!indexContent.includes('assets/')) {
      console.log(`${colors.yellow}⚠️${colors.reset} index.html may not reference built assets`);
      hasWarnings = true;
    }
  }

  // 3. Check assets directory
  const assetsPath = path.join(distReactPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    console.log(`${colors.red}❌ dist-react/assets/ not found${colors.reset}`);
    hasErrors = true;
  } else {
    const assetFiles = fs.readdirSync(assetsPath);
    const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
    const cssFiles = assetFiles.filter(f => f.endsWith('.css'));

    console.log(`${colors.green}✅${colors.reset} assets/ contains ${assetFiles.length} files`);
    console.log(`   - ${jsFiles.length} JavaScript files`);
    console.log(`   - ${cssFiles.length} CSS files`);

    if (jsFiles.length === 0) {
      console.log(`${colors.red}❌ No JavaScript bundles found${colors.reset}`);
      hasErrors = true;
    }

    // Check main bundle size
    const mainBundle = jsFiles.find(f => f.includes('index') || jsFiles[0]);
    if (mainBundle) {
      const bundlePath = path.join(assetsPath, mainBundle);
      const bundleSize = fs.statSync(bundlePath).size;
      const bundleSizeKB = bundleSize / 1024;

      console.log(`   Main bundle: ${mainBundle} (${formatBytes(bundleSize)})`);

      // Warn if bundle is suspiciously small (< 100KB) or large (> 10MB)
      if (bundleSizeKB < 100) {
        console.log(`${colors.yellow}⚠️${colors.reset} Main bundle seems small - may be incomplete`);
        hasWarnings = true;
      } else if (bundleSizeKB > 10240) {
        console.log(`${colors.yellow}⚠️${colors.reset} Main bundle > 10MB - consider code splitting`);
        hasWarnings = true;
      }
    }
  }

  // 4. Calculate total bundle size
  let totalSize = 0;
  function calculateDirSize(dir) {
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        calculateDirSize(filePath);
      } else {
        totalSize += fs.statSync(filePath).size;
      }
    }
  }
  calculateDirSize(distReactPath);

  console.log(`\n   Total dist-react size: ${formatBytes(totalSize)}`);

  // Size thresholds
  const minSizeMB = 0.5; // At least 500KB
  const maxSizeMB = 50; // No more than 50MB

  if (totalSize < minSizeMB * 1024 * 1024) {
    console.log(`${colors.red}❌ Bundle too small (< ${minSizeMB}MB) - build may be incomplete${colors.reset}`);
    hasErrors = true;
  } else if (totalSize > maxSizeMB * 1024 * 1024) {
    console.log(`${colors.yellow}⚠️${colors.reset} Bundle large (> ${maxSizeMB}MB) - consider optimization`);
    hasWarnings = true;
  }

  // 5. Check for common build artifacts that shouldn't be there
  const unwantedFiles = ['.DS_Store', 'node_modules', '.git'];
  for (const unwanted of unwantedFiles) {
    if (fs.existsSync(path.join(distReactPath, unwanted))) {
      console.log(`${colors.yellow}⚠️${colors.reset} Unwanted file/folder in dist: ${unwanted}`);
      hasWarnings = true;
    }
  }

  // Summary
  console.log('\n========================================');
  if (hasErrors) {
    console.log(`${colors.red}${colors.bold}❌ React bundle validation FAILED${colors.reset}`);
    console.log('Fix the errors above before building.\n');
    return false;
  } else if (hasWarnings) {
    console.log(`${colors.yellow}${colors.bold}⚠️ React bundle has warnings${colors.reset}`);
    console.log('Build will continue, but review warnings.\n');
    return true;
  } else {
    console.log(`${colors.green}${colors.bold}✅ React bundle validation passed!${colors.reset}\n`);
    return true;
  }
}

// Run if executed directly
if (require.main === module) {
  const success = checkReactBundle();
  process.exit(success ? 0 : 1);
}

module.exports = { checkReactBundle };
