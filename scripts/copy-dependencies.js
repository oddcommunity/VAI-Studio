#!/usr/bin/env node

/**
 * Smart Dependency Copier for pnpm Workspaces
 *
 * Recursively copies external modules and their transitive dependencies
 * from pnpm's .pnpm store structure to dist-electron/node_modules.
 *
 * Handles:
 * - Symlink resolution (pnpm uses symlinks extensively)
 * - Recursive dependency tree walking
 * - Circular dependency prevention
 * - Scoped packages (@odd-core/*, @odd-design-system/*)
 * - Skips unnecessary directories (tests, docs, etc.)
 */

const fs = require('fs');
const path = require('path');

// External modules that must be copied (cannot be bundled)
const EXTERNAL_MODULES = [
  // Runtime dependencies that interact with Electron
  'electron-store',
  'electron-updater',

  // Binary/asset dependencies
  'ffmpeg-static',
  'pdfkit',

  // Workspace packages are now bundled directly into main.js
  // No longer need to copy them as external dependencies
];

// Built-in Node.js modules that should never be copied
const BUILTIN_MODULES = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http',
  'http2', 'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty', 'url',
  'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
  'electron', 'fsevents', // Electron and native modules
]);

// Optional dependencies that may not exist (suppress warnings)
const OPTIONAL_MODULES = new Set([
  '@odd-core/services', // May not exist in all configurations
  'string-width-cjs',   // npm v6 compat (not needed with pnpm)
  'strip-ansi-cjs',     // npm v6 compat (not needed with pnpm)
  'wrap-ansi-cjs',      // npm v6 compat (not needed with pnpm)
]);

// Directories to skip when copying
// NOTE: 'node_modules' is NOT skipped - pnpm nests deps when versions conflict
// and we need to copy those nested node_modules (e.g., conf/node_modules/ajv)
const SKIP_DIRS = new Set([
  '.git', '.github', 'test', 'tests', '__tests__',
  'docs', 'doc', 'examples', 'example', 'coverage', '.nyc_output',
  'benchmark', 'benchmarks', '.vscode', '.idea'
]);

// File patterns to skip
const SKIP_FILES = new Set([
  '.DS_Store', 'Thumbs.db', '.gitignore', '.npmignore', '.eslintrc',
  '.editorconfig', 'tsconfig.json', 'jest.config.js', 'rollup.config.js',
  'webpack.config.js', '.travis.yml', '.github'
]);

class DependencyCopier {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.nodeModulesRoot = path.join(this.projectRoot, 'node_modules');
    this.pnpmRoot = path.join(this.nodeModulesRoot, '.pnpm');
    this.destRoot = path.join(this.projectRoot, 'dist-electron', 'node_modules');

    // Track visited packages to prevent circular dependencies
    this.visited = new Set();

    // Track statistics
    this.stats = {
      copiedPackages: 0,
      totalSize: 0,
      skippedBuiltins: 0,
      errors: []
    };
  }

  /**
   * Main entry point - copy all external modules and their dependencies
   */
  async copyAll() {
    console.log('='.repeat(60));
    console.log('Smart Dependency Copier for pnpm Workspaces');
    console.log('='.repeat(60));
    console.log(`\nSource: ${this.nodeModulesRoot}`);
    console.log(`Destination: ${this.destRoot}\n`);

    // Clean destination
    if (fs.existsSync(this.destRoot)) {
      console.log('Cleaning existing node_modules...');
      fs.rmSync(this.destRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(this.destRoot, { recursive: true });

    // Copy each external module
    for (const moduleName of EXTERNAL_MODULES) {
      if (BUILTIN_MODULES.has(moduleName)) {
        this.stats.skippedBuiltins++;
        continue;
      }

      console.log(`\nProcessing: ${moduleName}`);
      await this.copyModuleRecursive(moduleName);
    }

    this.printSummary();
  }

  /**
   * Recursively copy a module and all its dependencies
   * @param {string} moduleName - Name of the module to copy
   * @param {number} depth - Current recursion depth for indentation
   * @param {string|null} parentPnpmPath - Path to parent's pnpm node_modules for relative resolution
   */
  async copyModuleRecursive(moduleName, depth = 0, parentPnpmPath = null) {
    // Skip if already visited
    if (this.visited.has(moduleName)) {
      return;
    }

    // Skip built-in modules
    if (BUILTIN_MODULES.has(moduleName)) {
      this.stats.skippedBuiltins++;
      return;
    }

    // Skip optional modules (suppress warnings)
    if (OPTIONAL_MODULES.has(moduleName)) {
      return;
    }

    this.visited.add(moduleName);
    const indent = '  '.repeat(depth);

    try {
      // Resolve the module path (handles symlinks)
      // First try relative to parent (pnpm's proper resolution), then global
      const modulePath = this.resolveModulePath(moduleName, parentPnpmPath);

      if (!modulePath) {
        // Only warn for non-optional modules
        if (!OPTIONAL_MODULES.has(moduleName)) {
          console.warn(`${indent}⚠ Could not resolve: ${moduleName}`);
          this.stats.errors.push(`Could not resolve: ${moduleName}`);
        }
        return;
      }

      // Read package.json to get dependencies
      const packageJsonPath = path.join(modulePath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        console.warn(`${indent}⚠ No package.json: ${moduleName}`);
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Copy the module
      const destPath = path.join(this.destRoot, moduleName);
      console.log(`${indent}→ Copying ${moduleName}...`);

      const size = await this.copyDirectory(modulePath, destPath);
      this.stats.copiedPackages++;
      this.stats.totalSize += size;

      // Determine the pnpm path for this module's dependencies
      // pnpm stores packages at: .pnpm/<pkg>@<ver>/node_modules/<pkg>
      // The parent directory of <pkg> contains symlinks to its dependencies
      const currentPnpmPath = this.getPnpmNodeModulesPath(modulePath);

      // Recursively copy dependencies
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.optionalDependencies
      };

      if (dependencies && Object.keys(dependencies).length > 0) {
        console.log(`${indent}  Dependencies: ${Object.keys(dependencies).length}`);

        for (const depName of Object.keys(dependencies)) {
          if (!BUILTIN_MODULES.has(depName) && !this.visited.has(depName)) {
            await this.copyModuleRecursive(depName, depth + 1, currentPnpmPath);
          }
        }
      }

    } catch (error) {
      console.error(`${indent}✗ Error processing ${moduleName}:`, error.message);
      this.stats.errors.push(`${moduleName}: ${error.message}`);
    }
  }

  /**
   * Get the pnpm node_modules path for a resolved module
   * This is the directory containing symlinks to the module's dependencies
   */
  getPnpmNodeModulesPath(modulePath) {
    // modulePath is like: .pnpm/conf@14.0.0/node_modules/conf
    // We want: .pnpm/conf@14.0.0/node_modules (the parent)
    const parentDir = path.dirname(modulePath);

    // Verify this looks like a pnpm node_modules directory
    if (parentDir.includes('.pnpm') && parentDir.endsWith('node_modules')) {
      return parentDir;
    }

    return null;
  }

  /**
   * Resolve module path, handling pnpm symlinks
   * @param {string} moduleName - Name of the module to resolve
   * @param {string|null} parentPnpmPath - Path to parent's pnpm node_modules for relative resolution
   */
  resolveModulePath(moduleName, parentPnpmPath = null) {
    // FIRST: Try resolving relative to parent package (pnpm's proper resolution)
    // This ensures we get the correct version that the parent depends on
    if (parentPnpmPath) {
      const relativeModulePath = path.join(parentPnpmPath, moduleName);
      if (fs.existsSync(relativeModulePath)) {
        const stats = fs.lstatSync(relativeModulePath);
        if (stats.isSymbolicLink()) {
          // Resolve symlink to actual location
          return fs.realpathSync(relativeModulePath);
        }
        return relativeModulePath;
      }
    }

    // Try direct path in root node_modules (for workspace packages)
    const directPath = path.join(this.nodeModulesRoot, moduleName);

    if (fs.existsSync(directPath)) {
      const stats = fs.lstatSync(directPath);

      if (stats.isSymbolicLink()) {
        // Resolve symlink to actual location
        return fs.realpathSync(directPath);
      }

      return directPath;
    }

    // Try to find in .pnpm store (fallback)
    // pnpm structure: .pnpm/<package>@<version>/node_modules/<package>
    if (fs.existsSync(this.pnpmRoot)) {
      const pnpmDirs = fs.readdirSync(this.pnpmRoot);

      // For scoped packages like @odd-core/auth
      const searchName = moduleName.startsWith('@')
        ? moduleName.replace('/', '+')  // @odd-core/auth -> @odd-core+auth
        : moduleName;

      // Find matching package directories and sort by version (descending)
      // This ensures we get the latest version when multiple versions exist
      const matchingDirs = pnpmDirs
        .filter(dir => dir.startsWith(searchName + '@') || dir === searchName)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

      for (const matchingDir of matchingDirs) {
        const pnpmModulePath = path.join(
          this.pnpmRoot,
          matchingDir,
          'node_modules',
          moduleName
        );

        if (fs.existsSync(pnpmModulePath)) {
          return pnpmModulePath;
        }
      }
    }

    return null;
  }

  /**
   * Copy directory recursively, skipping unnecessary files
   */
  async copyDirectory(src, dest) {
    let totalSize = 0;

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      // Skip unnecessary directories and files
      if (SKIP_DIRS.has(entry.name) || SKIP_FILES.has(entry.name)) {
        continue;
      }

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        totalSize += await this.copyDirectory(srcPath, destPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        try {
          // For symlinks, copy the actual file content
          if (entry.isSymbolicLink()) {
            const realPath = fs.realpathSync(srcPath);
            if (fs.existsSync(realPath)) {
              fs.copyFileSync(realPath, destPath);
              const stats = fs.statSync(realPath);
              totalSize += stats.size;
            }
          } else {
            fs.copyFileSync(srcPath, destPath);
            const stats = fs.statSync(srcPath);
            totalSize += stats.size;
          }
        } catch (error) {
          // Skip files that can't be copied (e.g., permission issues)
          console.warn(`  Warning: Could not copy ${entry.name}: ${error.message}`);
        }
      }
    }

    return totalSize;
  }

  /**
   * Print summary statistics
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('Copy Complete!');
    console.log('='.repeat(60));
    console.log(`\nStatistics:`);
    console.log(`  Packages copied: ${this.stats.copiedPackages}`);
    console.log(`  Total size: ${this.formatSize(this.stats.totalSize)}`);
    console.log(`  Built-in modules skipped: ${this.stats.skippedBuiltins}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠ Errors encountered: ${this.stats.errors.length}`);
      this.stats.errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log(`\n✓ No errors`);
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Format bytes to human-readable size
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

// Run if called directly
if (require.main === module) {
  const copier = new DependencyCopier();
  copier.copyAll().catch(error => {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { DependencyCopier };
