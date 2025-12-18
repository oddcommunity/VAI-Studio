/**
 * afterPack Hook - Validation and Pre-signing
 *
 * This hook runs after electron-builder packs the app but before code signing.
 * It performs two critical steps:
 *
 * STEP 1: PRE-SIGN VALIDATION GATE
 * - Validates app structure (required files exist)
 * - Validates bundled dependencies (node_modules)
 * - Validates bundle integrity (size, content checks)
 * - ABORTS build if any validation fails (saves 10-20 min of signing time)
 *
 * STEP 2: PYTHON BINARY PRE-SIGNING
 * - Pre-signs all Python native binaries (.so, .dylib)
 * - Prevents timeout issues during main signing phase
 * - The Python venv contains 444+ native binaries
 * - Signing 22K+ files can cause exit code 144 (timeout)
 * - Pre-signing critical binaries reduces load on main signing step
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function afterPack(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only process macOS builds
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping Python binary pre-signing: not macOS');
    return;
  }

  // Skip if no code signing identity is set
  const identity = process.env.CSC_NAME || process.env.CSC_LINK;
  if (!identity && process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false') {
    console.log('Skipping Python binary pre-signing: code signing disabled');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  // ========================================
  // STEP 1: PRE-SIGN VALIDATION GATE
  // ========================================
  console.log('\n========================================');
  console.log('Running pre-sign validation checks...');
  console.log('========================================\n');

  try {
    const preSignCheckScript = path.join(__dirname, 'pre-sign-check.js');
    execSync(`node "${preSignCheckScript}" "${appPath}"`, {
      encoding: 'utf8',
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('\n❌ Pre-sign validation failed!');
    console.error('Aborting build to prevent signing broken artifacts.\n');
    process.exit(1);
  }

  // ========================================
  // STEP 2: PYTHON BINARY PRE-SIGNING
  // ========================================
  const pythonVenvPath = path.join(appPath, 'Contents/Resources/backends/venv');

  // Check if Python venv exists
  if (!fs.existsSync(pythonVenvPath)) {
    console.log('Skipping Python binary pre-signing: no venv found');
    return;
  }

  console.log('\n========================================');
  console.log('Pre-signing Python native binaries...');
  console.log('========================================\n');

  try {
    const scriptPath = path.join(__dirname, 'sign-python-binaries.sh');

    // Run the signing script
    const output = execSync(`"${scriptPath}" "${appPath}"`, {
      encoding: 'utf8',
      stdio: 'inherit',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for output
    });

    console.log('\n========================================');
    console.log('Python binary pre-signing complete');
    console.log('========================================\n');
  } catch (error) {
    console.error('Python binary pre-signing failed:', error.message);
    // Don't throw - let electron-builder's main signing handle it
    console.warn('Continuing with main signing step...');
  }
};
