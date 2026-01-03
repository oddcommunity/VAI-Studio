/**
 * afterPack Hook - Validation, Runtime Testing, and Pre-signing
 *
 * This hook runs after electron-builder packs the app but before code signing.
 * It performs three critical steps:
 *
 * STEP 1: PRE-SIGN VALIDATION GATE (Static)
 * - Validates app structure (required files exist)
 * - Validates bundled dependencies (node_modules)
 * - Validates bundle integrity (size, content checks)
 * - ABORTS build if any validation fails (saves 10-20 min of signing time)
 *
 * STEP 2: RUNTIME LAUNCH TEST (Dynamic)
 * - Actually launches the packaged .app to verify it starts
 * - Waits 5 seconds, then checks if process is still alive
 * - Catches runtime failures that static checks miss (e.g., ajv crash)
 * - ABORTS build if app crashes on startup
 *
 * STEP 3: PYTHON BINARY PRE-SIGNING
 * - Pre-signs all Python native binaries (.so, .dylib)
 * - Prevents timeout issues during main signing phase
 * - The Python venv contains 444+ native binaries
 * - Signing 22K+ files can cause exit code 144 (timeout)
 * - Pre-signing critical binaries reduces load on main signing step
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
 * Runtime Launch Test - Actually run the app to verify it starts
 *
 * This catches runtime failures that static checks cannot detect, such as:
 * - Missing transitive dependencies (ajv crash)
 * - Native module load failures
 * - Invalid bundle structure that passes static checks
 *
 * @param {string} appPath - Path to the .app bundle
 * @returns {Promise<boolean>} - true if app launched successfully
 */
async function runLaunchTest(appPath) {
  console.log(`\n${colors.cyan}${colors.bold}RUNTIME LAUNCH TEST${colors.reset}`);
  console.log(`Testing: ${appPath}\n`);

  const executablePath = path.join(appPath, 'Contents/MacOS/VAI Studio');

  if (!fs.existsSync(executablePath)) {
    console.log(`${colors.red}❌ Executable not found: ${executablePath}${colors.reset}`);
    return false;
  }

  console.log(`  Launching app for smoke test...`);

  return new Promise((resolve) => {
    const startTime = Date.now();
    const testDurationMs = 10000; // 10 seconds - longer for thorough testing
    let stdout = '';
    let stderr = '';
    let crashed = false;
    let exitCode = null;
    let memoryWarning = false;

    // Track successful startup indicators
    let startupIndicators = {
      electronReady: false,
      windowCreated: false,
      noFatalErrors: true
    };

    // Spawn the app process
    const proc = spawn(executablePath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: {
        ...process.env,
        // Disable GPU to avoid issues in CI/headless environments
        ELECTRON_DISABLE_GPU: '1',
        // Indicate this is a test run
        VAI_STUDIO_SMOKE_TEST: '1',
        // Enable more verbose logging for diagnostics
        ELECTRON_ENABLE_LOGGING: '1'
      }
    });

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;

      // Look for successful startup indicators
      if (text.includes('App ready') || text.includes('ready')) {
        startupIndicators.electronReady = true;
      }
      if (text.includes('BrowserWindow') || text.includes('window')) {
        startupIndicators.windowCreated = true;
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;

      // Check for common crash indicators
      const errorText = text.toLowerCase();
      if (
        errorText.includes('cannot find module') ||
        errorText.includes('module not found') ||
        errorText.includes('fatal error') ||
        errorText.includes('uncaught exception') ||
        errorText.includes('unhandled rejection')
      ) {
        crashed = true;
        startupIndicators.noFatalErrors = false;
      }

      // Check for memory issues
      if (errorText.includes('heap out of memory') || errorText.includes('allocation failed')) {
        memoryWarning = true;
      }

      // Check for native module issues
      if (errorText.includes('.node') && errorText.includes('error')) {
        console.log(`  ${colors.yellow}⚠️ Possible native module issue detected${colors.reset}`);
      }
    });

    proc.on('error', (err) => {
      console.log(`${colors.red}❌ Failed to start app: ${err.message}${colors.reset}`);
      crashed = true;
      resolve(false);
    });

    proc.on('exit', (code) => {
      exitCode = code;
      const elapsed = Date.now() - startTime;

      // If app exited before our test duration, it likely crashed
      if (elapsed < testDurationMs) {
        crashed = true;
        console.log(`${colors.red}❌ App exited early after ${elapsed}ms with code ${code}${colors.reset}`);

        if (stderr) {
          console.log(`\n${colors.red}STDERR output:${colors.reset}`);
          // Show relevant error lines, not just the first 2000 chars
          const errorLines = stderr.split('\n').filter(line =>
            line.toLowerCase().includes('error') ||
            line.toLowerCase().includes('cannot find') ||
            line.toLowerCase().includes('failed') ||
            line.toLowerCase().includes('exception')
          );
          if (errorLines.length > 0) {
            console.log(errorLines.slice(0, 20).join('\n'));
          } else {
            console.log(stderr.slice(0, 2000));
          }
        }
      }
    });

    // Wait for test duration
    setTimeout(() => {
      if (proc.exitCode === null) {
        // App is still running - success!
        const elapsed = Date.now() - startTime;
        console.log(`  ${colors.green}✅ App stayed alive for ${(elapsed / 1000).toFixed(1)} seconds${colors.reset}`);

        // Report startup indicators
        if (startupIndicators.electronReady) {
          console.log(`  ${colors.green}✅ Electron app ready signal received${colors.reset}`);
        }
        if (startupIndicators.windowCreated) {
          console.log(`  ${colors.green}✅ Window creation detected${colors.reset}`);
        }
        if (memoryWarning) {
          console.log(`  ${colors.yellow}⚠️ Memory warnings detected - monitor in production${colors.reset}`);
        }

        // Kill the test process gracefully
        proc.kill('SIGTERM');

        // Give it a moment to clean up
        setTimeout(() => {
          if (proc.exitCode === null) {
            proc.kill('SIGKILL');
          }
          resolve(true);
        }, 2000);
      } else if (crashed) {
        // App crashed during test
        resolve(false);
      } else {
        // App exited but didn't crash (unusual)
        console.log(`  ${colors.yellow}⚠️ App exited with code ${exitCode} during test${colors.reset}`);
        resolve(false);
      }
    }, testDurationMs);
  });
}

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
  // STEP 2: RUNTIME LAUNCH TEST
  // ========================================
  console.log('\n========================================');
  console.log('Running runtime launch test...');
  console.log('========================================\n');

  const launchTestPassed = await runLaunchTest(appPath);

  if (!launchTestPassed) {
    console.error('\n❌ Runtime launch test failed!');
    console.error('The packaged app crashed on startup.');
    console.error('This often indicates missing transitive dependencies.');
    console.error('\nCommon fixes:');
    console.error('  1. Ensure node-linker=hoisted is in .npmrc');
    console.error('  2. Run: rm -rf node_modules && pnpm install');
    console.error('  3. Check scripts/copy-dependencies.js includes all deps\n');
    console.error('Aborting build to prevent signing broken artifacts.\n');
    process.exit(1);
  }

  console.log(`\n${colors.green}✅ Runtime launch test passed!${colors.reset}\n`);

  // ========================================
  // STEP 3: PYTHON RUNTIME TEST
  // ========================================
  const pythonVenvPath = path.join(appPath, 'Contents/Resources/backends/venv');

  if (fs.existsSync(pythonVenvPath)) {
    console.log('\n========================================');
    console.log('Running Python runtime test...');
    console.log('========================================\n');

    const pythonBin = path.join(pythonVenvPath, 'bin/python3');

    if (fs.existsSync(pythonBin)) {
      try {
        // Test 1: Python interpreter runs
        console.log('  Testing Python interpreter...');
        const versionOutput = execSync(`"${pythonBin}" --version`, { encoding: 'utf8' });
        console.log(`  ${colors.green}✅ ${versionOutput.trim()}${colors.reset}`);

        // Test 2: Key modules can be imported
        console.log('  Testing module imports...');
        const importTest = `
import sys
errors = []

# Core modules that MUST work
required = ['json', 'os', 'subprocess']
for mod in required:
    try:
        __import__(mod)
    except ImportError as e:
        errors.append(f"{mod}: {e}")

# ML modules (may not all be present depending on build)
optional = ['numpy', 'torch', 'whisper']
for mod in optional:
    try:
        __import__(mod)
        print(f"  ✓ {mod}")
    except ImportError:
        print(f"  - {mod} (not installed)")

if errors:
    print("ERRORS:")
    for e in errors:
        print(f"  ✗ {e}")
    sys.exit(1)

print("OK")
`;
        const importOutput = execSync(`"${pythonBin}" -c "${importTest.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
          encoding: 'utf8',
          timeout: 30000
        });

        if (importOutput.includes('ERRORS:')) {
          console.log(`  ${colors.red}❌ Python module import failed${colors.reset}`);
          console.log(importOutput);
          console.error('Python backend will crash at runtime. Fix venv before releasing.');
          process.exit(1);
        }

        console.log(`  ${colors.green}✅ Python runtime test passed${colors.reset}`);

      } catch (error) {
        console.log(`  ${colors.red}❌ Python runtime test failed: ${error.message}${colors.reset}`);
        console.error('The bundled Python environment is broken.');
        console.error('Rebuild with: ./scripts/prepare-python-bundle.sh');
        process.exit(1);
      }
    } else {
      console.log(`  ${colors.yellow}⚠️ Python binary not found at expected path${colors.reset}`);
      console.log(`     Expected: ${pythonBin}`);
    }
  }

  // ========================================
  // STEP 4: PYTHON BINARY PRE-SIGNING
  // ========================================

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
