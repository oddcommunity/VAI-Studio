#!/usr/bin/env node
/**
 * Release Artifact Verification Script
 *
 * Validates that build artifacts meet minimum quality standards before release.
 * This catches issues that slip through the build process.
 *
 * Checks performed:
 * - File exists and is readable
 * - File size is within expected range (not too small/empty)
 * - File type/magic bytes validation
 * - Platform-specific checks (DMG mountable, NSIS structure, AppImage executable)
 *
 * Exit codes:
 *   0 - All artifacts valid
 *   1 - One or more artifacts failed validation
 *   2 - Script error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Minimum expected file sizes (in bytes)
const MIN_SIZES = {
  dmg: 50 * 1024 * 1024,    // 50MB minimum for DMG
  zip: 40 * 1024 * 1024,    // 40MB minimum for ZIP
  exe: 60 * 1024 * 1024,    // 60MB minimum for NSIS installer
  AppImage: 80 * 1024 * 1024, // 80MB minimum for AppImage
  deb: 50 * 1024 * 1024,    // 50MB minimum for deb
  rpm: 50 * 1024 * 1024     // 50MB minimum for rpm
};

// Maximum reasonable file sizes (warn if exceeded)
const MAX_SIZES = {
  dmg: 500 * 1024 * 1024,    // 500MB max
  zip: 400 * 1024 * 1024,
  exe: 400 * 1024 * 1024,
  AppImage: 600 * 1024 * 1024,
  deb: 400 * 1024 * 1024,
  rpm: 400 * 1024 * 1024
};

// Magic bytes for file type validation
const MAGIC_BYTES = {
  dmg: [0x78, 0x01], // Deflate compressed
  zip: [0x50, 0x4B], // PK
  exe: [0x4D, 0x5A], // MZ
  AppImage: [0x7F, 0x45, 0x4C, 0x46] // ELF
};

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Basic file validation (exists, readable, size)
 */
function validateBasics(filePath, type) {
  const results = { passed: true, warnings: [], errors: [] };
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    results.errors.push(`File not found: ${filePath}`);
    results.passed = false;
    return results;
  }

  // Check readable
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (e) {
    results.errors.push(`File not readable: ${filePath}`);
    results.passed = false;
    return results;
  }

  // Check file size
  const stats = fs.statSync(filePath);
  const size = stats.size;

  if (size === 0) {
    results.errors.push(`File is empty (0 bytes)`);
    results.passed = false;
    return results;
  }

  const minSize = MIN_SIZES[type];
  const maxSize = MAX_SIZES[type];

  if (minSize && size < minSize) {
    results.errors.push(`File too small: ${formatSize(size)} (expected >= ${formatSize(minSize)})`);
    results.passed = false;
  }

  if (maxSize && size > maxSize) {
    results.warnings.push(`File unusually large: ${formatSize(size)} (expected <= ${formatSize(maxSize)})`);
  }

  results.size = size;
  return results;
}

/**
 * Validate magic bytes match expected file type
 */
function validateMagicBytes(filePath, type) {
  const expected = MAGIC_BYTES[type];
  if (!expected) return { passed: true };

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(expected.length);
    fs.readSync(fd, buffer, 0, expected.length, 0);
    fs.closeSync(fd);

    for (let i = 0; i < expected.length; i++) {
      if (buffer[i] !== expected[i]) {
        return {
          passed: false,
          errors: [`Invalid file signature - expected ${type} format`]
        };
      }
    }

    return { passed: true };
  } catch (e) {
    return {
      passed: false,
      errors: [`Failed to read file header: ${e.message}`]
    };
  }
}

/**
 * macOS DMG validation
 */
function validateDMG(filePath) {
  const results = { passed: true, warnings: [], errors: [] };

  // Check if DMG can be queried (not corrupted)
  try {
    const output = execSync(`hdiutil imageinfo "${filePath}" 2>&1`, {
      encoding: 'utf8',
      timeout: 30000
    });

    // Check for valid format
    if (!output.includes('Format:')) {
      results.warnings.push('DMG format info not found');
    }

    // Check for UDIF (standard DMG format)
    if (output.includes('UDIF')) {
      // Good - standard DMG format
    } else {
      results.warnings.push('DMG is not in standard UDIF format');
    }

  } catch (e) {
    results.errors.push(`DMG appears corrupted: ${e.message}`);
    results.passed = false;
  }

  return results;
}

/**
 * Windows EXE/NSIS validation
 */
function validateEXE(filePath) {
  const results = { passed: true, warnings: [], errors: [] };

  // Read file to check for NSIS markers
  try {
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024 * 1024));

    // Check for NSIS signature
    if (buffer.indexOf('Nullsoft') === -1 && buffer.indexOf('NSIS') === -1) {
      results.warnings.push('NSIS signature not found - may not be NSIS installer');
    }

    // Check for common corruption indicators
    if (buffer.length < 1000) {
      results.errors.push('EXE file appears truncated');
      results.passed = false;
    }

  } catch (e) {
    results.errors.push(`Failed to validate EXE: ${e.message}`);
    results.passed = false;
  }

  return results;
}

/**
 * Linux AppImage validation
 */
function validateAppImage(filePath) {
  const results = { passed: true, warnings: [], errors: [] };

  // Check if file is executable
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
  } catch (e) {
    results.errors.push('AppImage is not executable');
    results.passed = false;
  }

  // Check ELF header more thoroughly
  try {
    const buffer = Buffer.alloc(64);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 64, 0);
    fs.closeSync(fd);

    // Check ELF magic
    if (buffer[0] !== 0x7F || buffer[1] !== 0x45 || buffer[2] !== 0x4C || buffer[3] !== 0x46) {
      results.errors.push('Invalid ELF header');
      results.passed = false;
    }

    // Check architecture (should be x86_64 for our builds)
    if (buffer[4] !== 2) { // 2 = 64-bit
      results.warnings.push('AppImage is not 64-bit');
    }

  } catch (e) {
    results.errors.push(`Failed to validate ELF header: ${e.message}`);
    results.passed = false;
  }

  // Check for AppImage signature
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.indexOf('AppImage') === -1) {
      results.warnings.push('AppImage signature not found in binary');
    }
  } catch (e) {
    // Ignore - file might be too large to read into memory
  }

  return results;
}

/**
 * Main validation orchestrator
 */
function validateArtifact(filePath) {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');

  console.log(`\n${colors.cyan}${colors.bold}Validating: ${filename}${colors.reset}`);
  console.log('-'.repeat(50));

  let type = ext;
  if (filename.includes('AppImage')) type = 'AppImage';

  const allResults = {
    basic: validateBasics(filePath, type),
    magic: validateMagicBytes(filePath, type)
  };

  // Platform-specific validation
  if (type === 'dmg' && process.platform === 'darwin') {
    allResults.platform = validateDMG(filePath);
  } else if (type === 'exe') {
    allResults.platform = validateEXE(filePath);
  } else if (type === 'AppImage') {
    allResults.platform = validateAppImage(filePath);
  }

  // Report results
  let passed = true;
  let warnings = [];
  let errors = [];

  for (const [check, result] of Object.entries(allResults)) {
    if (!result.passed) passed = false;
    if (result.warnings) warnings.push(...result.warnings);
    if (result.errors) errors.push(...result.errors);
  }

  // Print size info
  if (allResults.basic.size) {
    console.log(`  Size: ${formatSize(allResults.basic.size)}`);
  }

  // Print warnings
  for (const warning of warnings) {
    console.log(`  ${colors.yellow}⚠️  ${warning}${colors.reset}`);
  }

  // Print errors
  for (const error of errors) {
    console.log(`  ${colors.red}❌ ${error}${colors.reset}`);
  }

  // Print summary
  if (passed) {
    console.log(`  ${colors.green}✅ Validation passed${colors.reset}`);
  } else {
    console.log(`  ${colors.red}❌ Validation FAILED${colors.reset}`);
  }

  return passed;
}

/**
 * Find and validate all artifacts in dist/
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  RELEASE ARTIFACT VERIFICATION');
  console.log('='.repeat(60));

  const distPath = path.join(__dirname, '..', 'dist');

  if (!fs.existsSync(distPath)) {
    console.log(`\n${colors.red}ERROR: dist/ directory not found${colors.reset}`);
    console.log('Run the build first: pnpm run build:mac\n');
    process.exit(2);
  }

  // Find all release artifacts
  const artifacts = [];
  const patterns = [
    /\.dmg$/i,
    /-arm64\.zip$/i,
    /\.exe$/i,
    /\.AppImage$/i,
    /\.deb$/i,
    /\.rpm$/i
  ];

  function findArtifacts(dir, depth = 0) {
    // Only scan top 2 levels of dist/ to avoid finding nested files in .app bundles
    if (depth > 2) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      // Skip .app bundles - they're not release artifacts, they contain them
      if (file.endsWith('.app')) continue;

      if (stat.isDirectory() && file !== 'node_modules') {
        findArtifacts(fullPath, depth + 1);
      } else if (stat.isFile()) {
        for (const pattern of patterns) {
          if (pattern.test(file)) {
            artifacts.push(fullPath);
            break;
          }
        }
      }
    }
  }

  findArtifacts(distPath);

  if (artifacts.length === 0) {
    console.log(`\n${colors.yellow}No release artifacts found in dist/${colors.reset}`);
    console.log('Expected: .dmg, .zip, .exe, .AppImage, .deb, or .rpm files\n');
    process.exit(0);
  }

  console.log(`\nFound ${artifacts.length} artifact(s):`);
  artifacts.forEach(a => console.log(`  - ${path.relative(distPath, a)}`));

  // Validate each
  let allPassed = true;
  for (const artifact of artifacts) {
    if (!validateArtifact(artifact)) {
      allPassed = false;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log(`${colors.green}${colors.bold}✅ All ${artifacts.length} artifact(s) passed validation${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Some artifacts failed validation${colors.reset}`);
    console.log('Fix the issues above before releasing.\n');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { validateArtifact, validateBasics, validateDMG, validateEXE, validateAppImage };
