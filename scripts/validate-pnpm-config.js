#!/usr/bin/env node
/**
 * Pre-Build Validation Gate: pnpm Configuration
 *
 * This script runs BEFORE the build starts to catch configuration issues early.
 * It validates that critical pnpm settings are in place that prevent the class of
 * "transitive dependency not bundled" errors (like the ajv crash).
 *
 * Exit codes:
 *   0 - All validation checks passed
 *   1 - Critical configuration missing (build should abort)
 *   2 - Warning-level issues found (build continues with warning)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const projectRoot = path.resolve(__dirname, '..');

/**
 * Check if .npmrc contains required settings
 */
function checkNpmrc() {
  console.log(`\n${colors.cyan}${colors.bold}1. Checking .npmrc configuration${colors.reset}\n`);

  const npmrcPath = path.join(projectRoot, '.npmrc');

  if (!fs.existsSync(npmrcPath)) {
    console.log(`  ${colors.red}❌ .npmrc file not found${colors.reset}`);
    console.log(`     Create .npmrc with: node-linker=hoisted`);
    return false;
  }

  const npmrcContent = fs.readFileSync(npmrcPath, 'utf8');
  const lines = npmrcContent.split('\n').map(line => line.trim());

  // Check for node-linker=hoisted (critical)
  const hasNodeLinker = lines.some(line =>
    line.startsWith('node-linker=hoisted') ||
    line.startsWith('node-linker = hoisted')
  );

  if (!hasNodeLinker) {
    console.log(`  ${colors.red}❌ CRITICAL: node-linker=hoisted not found in .npmrc${colors.reset}`);
    console.log(`     Without this setting, transitive dependencies like 'ajv' won't be`);
    console.log(`     bundled correctly into the Electron app, causing runtime crashes.`);
    console.log(`\n     Add this line to .npmrc: node-linker=hoisted`);
    return false;
  }

  console.log(`  ${colors.green}✅ node-linker=hoisted is set${colors.reset}`);

  // Check for auto-install-peers=false (recommended)
  const hasAutoInstallPeers = lines.some(line =>
    line.startsWith('auto-install-peers=false') ||
    line.startsWith('auto-install-peers = false')
  );

  if (hasAutoInstallPeers) {
    console.log(`  ${colors.green}✅ auto-install-peers=false is set${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠️  auto-install-peers not disabled (optional)${colors.reset}`);
  }

  return true;
}

/**
 * Check if pnpm lockfile exists and is not modified
 */
function checkLockfile() {
  console.log(`\n${colors.cyan}${colors.bold}2. Checking lockfile state${colors.reset}\n`);

  const lockfilePath = path.join(projectRoot, 'pnpm-lock.yaml');

  if (!fs.existsSync(lockfilePath)) {
    console.log(`  ${colors.red}❌ pnpm-lock.yaml not found${colors.reset}`);
    console.log(`     Run 'pnpm install' to generate the lockfile`);
    return false;
  }

  console.log(`  ${colors.green}✅ pnpm-lock.yaml exists${colors.reset}`);

  // Check if lockfile has uncommitted changes
  // In CI/release builds, uncommitted lockfile changes are CRITICAL
  // They indicate deps may have drifted from what was tested
  const isReleaseBuild = process.env.CI || process.env.RELEASE_BUILD;

  try {
    const gitStatus = execSync('git status --porcelain pnpm-lock.yaml 2>/dev/null', {
      encoding: 'utf8',
      cwd: projectRoot
    }).trim();

    if (gitStatus) {
      if (isReleaseBuild) {
        console.log(`  ${colors.red}❌ pnpm-lock.yaml has uncommitted changes${colors.reset}`);
        console.log(`     In CI/release builds, lockfile must be committed.`);
        console.log(`     This ensures reproducible builds with tested dependencies.`);
        console.log(`     Fix: git add pnpm-lock.yaml && git commit`);
        return false; // BLOCK BUILD
      } else {
        console.log(`  ${colors.yellow}⚠️  pnpm-lock.yaml has uncommitted changes${colors.reset}`);
        console.log(`     (Allowed in dev builds, would BLOCK in CI/release)`);
      }
    } else {
      console.log(`  ${colors.green}✅ pnpm-lock.yaml is clean (no uncommitted changes)${colors.reset}`);
    }
  } catch (e) {
    // Not a git repo or git not available - skip this check
    console.log(`  ${colors.yellow}⚠️  Could not check git status of lockfile${colors.reset}`);
  }

  return true;
}

/**
 * Check submodule state (warning only)
 */
function checkSubmodules() {
  console.log(`\n${colors.cyan}${colors.bold}3. Checking submodule state${colors.reset}\n`);

  const submodules = ['odd-core', 'odd-design-system'];
  let hasWarnings = false;

  for (const submodule of submodules) {
    const submodulePath = path.join(projectRoot, submodule);

    if (!fs.existsSync(submodulePath)) {
      console.log(`  ${colors.yellow}⚠️  ${submodule}/ not found${colors.reset}`);
      console.log(`     Run: git submodule update --init --recursive`);
      hasWarnings = true;
      continue;
    }

    // Check if submodule directory has files
    const gitDir = path.join(submodulePath, '.git');
    if (!fs.existsSync(gitDir)) {
      console.log(`  ${colors.yellow}⚠️  ${submodule}/ exists but is not initialized${colors.reset}`);
      console.log(`     Run: git submodule update --init --recursive`);
      hasWarnings = true;
      continue;
    }

    console.log(`  ${colors.green}✅ ${submodule}/ is initialized${colors.reset}`);

    // Check for uncommitted changes in submodule
    try {
      const status = execSync(`git -C "${submodulePath}" status --porcelain 2>/dev/null`, {
        encoding: 'utf8'
      }).trim();

      if (status) {
        console.log(`  ${colors.yellow}⚠️  ${submodule}/ has uncommitted changes${colors.reset}`);
        hasWarnings = true;
      }
    } catch (e) {
      // Ignore git errors
    }
  }

  if (!hasWarnings) {
    console.log(`  ${colors.green}✅ All submodules are clean${colors.reset}`);
  }

  // Submodule issues are warnings, not blockers
  return true;
}

/**
 * Verify pnpm is being used (not npm or yarn) and check version
 */
function checkPackageManager() {
  console.log(`\n${colors.cyan}${colors.bold}4. Checking package manager${colors.reset}\n`);

  const MIN_PNPM_VERSION = '8.0.0';

  // Check if pnpm is available
  let pnpmVersion;
  try {
    pnpmVersion = execSync('pnpm --version 2>/dev/null', {
      encoding: 'utf8'
    }).trim();

    console.log(`  ${colors.green}✅ pnpm ${pnpmVersion} is available${colors.reset}`);
  } catch (e) {
    console.log(`  ${colors.red}❌ pnpm is not installed or not in PATH${colors.reset}`);
    console.log(`     Install pnpm: npm install -g pnpm`);
    return false;
  }

  // Version comparison
  const versionParts = pnpmVersion.split('.').map(Number);
  const minParts = MIN_PNPM_VERSION.split('.').map(Number);

  let versionOk = true;
  for (let i = 0; i < minParts.length; i++) {
    if ((versionParts[i] || 0) < minParts[i]) {
      versionOk = false;
      break;
    } else if ((versionParts[i] || 0) > minParts[i]) {
      break;
    }
  }

  if (!versionOk) {
    console.log(`  ${colors.yellow}⚠️  pnpm version ${pnpmVersion} is below recommended ${MIN_PNPM_VERSION}${colors.reset}`);
    console.log(`     Consider upgrading: npm install -g pnpm@latest`);
  } else {
    console.log(`  ${colors.green}✅ pnpm version >= ${MIN_PNPM_VERSION}${colors.reset}`);
  }

  // Verify node_modules was created by pnpm (has .pnpm folder for hoisted)
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  const pnpmFolderPath = path.join(nodeModulesPath, '.pnpm');

  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`  ${colors.yellow}⚠️  node_modules not found - run 'pnpm install'${colors.reset}`);
    return true; // Not a blocker, install will create it
  }

  if (!fs.existsSync(pnpmFolderPath)) {
    console.log(`  ${colors.yellow}⚠️  node_modules/.pnpm not found${colors.reset}`);
    console.log(`     This might indicate npm/yarn was used instead of pnpm`);
    console.log(`     Run: rm -rf node_modules && pnpm install`);
  } else {
    console.log(`  ${colors.green}✅ node_modules was created by pnpm${colors.reset}`);
  }

  return true;
}

/**
 * Check that workspace packages resolve correctly
 */
function checkWorkspaceResolution() {
  console.log(`\n${colors.cyan}${colors.bold}5. Checking workspace resolution${colors.reset}\n`);

  const workspacePackages = [
    '@odd-core/api',
    '@odd-core/auth',
    '@odd-core/log',
    '@odd-core/storage',
    '@odd-core/types',
    '@odd-core/ui',
    '@odd-design-system/design-tokens',
    '@odd-design-system/icons',
    '@odd-design-system/ui-components'
  ];

  let hasErrors = false;
  let foundCount = 0;

  for (const pkg of workspacePackages) {
    const pkgPath = path.join(projectRoot, 'node_modules', pkg);

    if (fs.existsSync(pkgPath)) {
      foundCount++;
      // Check if it's a symlink (correct) or real folder (might be npm install)
      const stats = fs.lstatSync(pkgPath);
      if (stats.isSymbolicLink()) {
        // Verify symlink target exists
        try {
          const target = fs.realpathSync(pkgPath);
          if (fs.existsSync(target)) {
            console.log(`  ${colors.green}✅${colors.reset} ${pkg} → ${path.relative(projectRoot, target)}`);
          } else {
            console.log(`  ${colors.red}❌ ${pkg} symlink broken${colors.reset}`);
            hasErrors = true;
          }
        } catch (e) {
          console.log(`  ${colors.red}❌ ${pkg} symlink unresolvable${colors.reset}`);
          hasErrors = true;
        }
      } else {
        console.log(`  ${colors.yellow}⚠️${colors.reset} ${pkg} (not a symlink - may be npm installed)`);
      }
    } else {
      console.log(`  ${colors.red}❌ ${pkg} not found${colors.reset}`);
      hasErrors = true;
    }
  }

  console.log(`\n  Found ${foundCount}/${workspacePackages.length} workspace packages`);

  if (hasErrors) {
    console.log(`\n  ${colors.red}Some workspace packages are missing or broken${colors.reset}`);
    console.log(`  Run: pnpm install`);
  } else {
    console.log(`  ${colors.green}✅ All workspace packages resolve correctly${colors.reset}`);
  }

  // Workspace resolution issues are critical
  return !hasErrors;
}

/**
 * Check extraResources paths exist before build
 */
function checkExtraResourcesPaths() {
  console.log(`\n${colors.cyan}${colors.bold}6. Checking extraResources paths${colors.reset}\n`);

  const extraResources = [
    { path: 'backends-bundle', required: false, description: 'Python backends' },
    { path: 'scripts/python-wrapper.sh', required: false, description: 'Python wrapper script' },
    { path: 'models', required: false, description: 'ML models' }
  ];

  let allFound = true;

  for (const resource of extraResources) {
    const fullPath = path.join(projectRoot, resource.path);

    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(fullPath);
        console.log(`  ${colors.green}✅${colors.reset} ${resource.path}/ (${files.length} items)`);
      } else {
        console.log(`  ${colors.green}✅${colors.reset} ${resource.path}`);
      }
    } else {
      if (resource.required) {
        console.log(`  ${colors.red}❌ ${resource.path} - ${resource.description} (REQUIRED)${colors.reset}`);
        allFound = false;
      } else {
        console.log(`  ${colors.yellow}⚠️${colors.reset} ${resource.path} - ${resource.description} (optional)`);
      }
    }
  }

  return allFound;
}

/**
 * Check for required environment variables (signed builds only)
 */
function checkEnvironmentVariables() {
  console.log(`\n${colors.cyan}${colors.bold}7. Checking environment variables${colors.reset}\n`);

  const isSignedBuild = !process.env.CSC_IDENTITY_AUTO_DISCOVERY ||
                         process.env.CSC_IDENTITY_AUTO_DISCOVERY !== 'false';
  const isReleaseBuild = process.env.CI || process.env.RELEASE_BUILD;

  if (!isSignedBuild) {
    console.log(`  ${colors.yellow}⚠️${colors.reset} Unsigned build (CSC_IDENTITY_AUTO_DISCOVERY=false)`);
    console.log(`     Skipping signing-related env var checks`);
    return true;
  }

  if (!isReleaseBuild) {
    console.log(`  ${colors.yellow}⚠️${colors.reset} Dev build detected`);
    console.log(`     Signing env vars will be checked but not required`);
  }

  let allPresent = true;
  let hasWarnings = false;

  // Code signing variables
  const signingVars = [
    { name: 'CSC_LINK', alt: 'CSC_NAME', desc: 'Code signing certificate' },
    { name: 'CSC_KEY_PASSWORD', desc: 'Certificate password', sensitive: true }
  ];

  // Notarization variables (macOS only)
  const notarizeVars = [
    { name: 'APPLE_ID', desc: 'Apple ID for notarization' },
    { name: 'APPLE_APP_SPECIFIC_PASSWORD', desc: 'App-specific password', sensitive: true },
    { name: 'APPLE_TEAM_ID', desc: 'Apple Team ID' }
  ];

  console.log(`  Code Signing:`);
  for (const v of signingVars) {
    const value = process.env[v.name];
    const altValue = v.alt ? process.env[v.alt] : null;

    if (value || altValue) {
      const display = v.sensitive ? '********' : (value || altValue).substring(0, 20) + '...';
      console.log(`    ${colors.green}✅${colors.reset} ${v.name}${v.alt ? ` or ${v.alt}` : ''}: ${display}`);
    } else {
      if (isReleaseBuild) {
        console.log(`    ${colors.red}❌ ${v.name} - ${v.desc} (REQUIRED for release)${colors.reset}`);
        allPresent = false;
      } else {
        console.log(`    ${colors.yellow}⚠️${colors.reset} ${v.name} - ${v.desc} (not set)`);
        hasWarnings = true;
      }
    }
  }

  console.log(`\n  Notarization (macOS):`);
  for (const v of notarizeVars) {
    const value = process.env[v.name];

    if (value) {
      const display = v.sensitive ? '********' : value.substring(0, 20) + '...';
      console.log(`    ${colors.green}✅${colors.reset} ${v.name}: ${display}`);
    } else {
      if (isReleaseBuild) {
        console.log(`    ${colors.red}❌ ${v.name} - ${v.desc} (REQUIRED for release)${colors.reset}`);
        allPresent = false;
      } else {
        console.log(`    ${colors.yellow}⚠️${colors.reset} ${v.name} - ${v.desc} (not set)`);
        hasWarnings = true;
      }
    }
  }

  if (!allPresent && isReleaseBuild) {
    console.log(`\n  ${colors.red}Missing required environment variables for release build.${colors.reset}`);
    console.log(`  ${colors.cyan}See CLAUDE.md for setup instructions.${colors.reset}`);
    return false;
  }

  if (hasWarnings && !isReleaseBuild) {
    console.log(`\n  ${colors.yellow}Some signing variables missing (OK for dev builds)${colors.reset}`);
  }

  return true;
}

/**
 * Main validation orchestrator
 */
function main() {
  console.log('\n');
  console.log('========================================');
  console.log('  PRE-BUILD VALIDATION GATE');
  console.log('  Comprehensive Build Readiness Check');
  console.log('========================================');

  const results = {
    npmrc: checkNpmrc(),
    lockfile: checkLockfile(),
    submodules: checkSubmodules(),
    packageManager: checkPackageManager(),
    workspaceResolution: checkWorkspaceResolution(),
    extraResources: checkExtraResourcesPaths(),
    envVariables: checkEnvironmentVariables()
  };

  // Print summary
  console.log('\n========================================');
  console.log('  VALIDATION SUMMARY');
  console.log('========================================\n');

  // Critical checks that block the build
  // envVariables only blocks in CI/RELEASE_BUILD mode (handled internally)
  const isReleaseBuild = process.env.CI || process.env.RELEASE_BUILD;
  const criticalPassed = results.npmrc &&
                         results.packageManager &&
                         results.workspaceResolution &&
                         results.lockfile &&
                         (isReleaseBuild ? results.envVariables : true);

  for (const [check, passed] of Object.entries(results)) {
    const status = passed
      ? `${colors.green}✅ PASS${colors.reset}`
      : `${colors.red}❌ FAIL${colors.reset}`;
    const label = check.charAt(0).toUpperCase() + check.slice(1);
    console.log(`  ${status} ${label}`);
  }

  console.log('\n========================================\n');

  if (!criticalPassed) {
    console.log(`${colors.red}${colors.bold}❌ Critical validation failed!${colors.reset}`);
    console.log(`${colors.red}Aborting build. Fix the issues above and try again.${colors.reset}\n`);
    console.log(`${colors.yellow}Common fixes:${colors.reset}`);
    console.log(`${colors.cyan}  1. Add to .npmrc: node-linker=hoisted${colors.reset}`);
    console.log(`${colors.cyan}  2. Run: pnpm install${colors.reset}`);
    console.log(`${colors.cyan}  3. Run: git submodule update --init --recursive${colors.reset}\n`);
    process.exit(1);
  }

  console.log(`${colors.green}${colors.bold}✅ All critical checks passed!${colors.reset}`);
  console.log(`${colors.green}Proceeding with build...${colors.reset}\n`);
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  checkNpmrc,
  checkLockfile,
  checkSubmodules,
  checkPackageManager,
  checkWorkspaceResolution,
  checkExtraResourcesPaths,
  checkEnvironmentVariables
};
