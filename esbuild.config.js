/**
 * esbuild configuration for bundling Electron main process
 *
 * This bundles all main process dependencies into a single file,
 * eliminating the need for node_modules in the packaged app.
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Native modules that must be externalized (cannot be bundled)
const nativeModules = [
  'electron',
  'keytar', // Native module for secure storage
  'fsevents', // macOS file watching (native)
];

// Modules that should be externalized for other reasons
const externalModules = [
  ...nativeModules,
  // These need to be external because they interact with Electron's runtime
  'electron-store',
  'electron-updater',
  // FFmpeg static binary (needs unpacking from asar)
  'ffmpeg-static',
  // PDFKit has complex asset loading
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

/**
 * Bundle the main process
 */
async function bundleMain() {
  console.log('Bundling main process...');

  try {
    await esbuild.build({
      entryPoints: ['electron/main.js'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      external: externalModules,
      outfile: 'dist-electron/main.js',
      format: 'cjs',
      sourcemap: true,
      minify: false, // Keep readable for debugging production issues
      keepNames: true, // Preserve function names for stack traces
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      // Log any issues during bundling
      logLevel: 'info',
      // Handle resolve issues gracefully
      mainFields: ['module', 'main'],
      resolveExtensions: ['.js', '.json', '.node'],
      // Preserve symlinks for workspace packages
      preserveSymlinks: false,
    });

    console.log('✓ Main process bundled successfully');
    console.log(`  Output: dist-electron/main.js`);

    // Get bundle size
    const stats = fs.statSync('dist-electron/main.js');
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  Size: ${sizeMB} MB`);

  } catch (error) {
    console.error('✗ Failed to bundle main process:', error);
    process.exit(1);
  }
}

/**
 * Bundle the preload script
 */
async function bundlePreload() {
  console.log('\nBundling preload script...');

  try {
    await esbuild.build({
      entryPoints: ['electron/preload.js'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      external: ['electron'],
      outfile: 'dist-electron/preload.js',
      format: 'cjs',
      sourcemap: true,
      minify: false,
      keepNames: true,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      logLevel: 'info',
    });

    console.log('✓ Preload script bundled successfully');
    console.log(`  Output: dist-electron/preload.js`);

  } catch (error) {
    console.error('✗ Failed to bundle preload script:', error);
    process.exit(1);
  }
}

/**
 * Bundle additional overlay scripts if they exist
 */
async function bundleOverlays() {
  const overlayPreload = 'electron/preload-overlay.js';

  if (fs.existsSync(overlayPreload)) {
    console.log('\nBundling overlay preload script...');

    try {
      await esbuild.build({
        entryPoints: [overlayPreload],
        bundle: true,
        platform: 'node',
        target: 'node20',
        external: ['electron'],
        outfile: 'dist-electron/preload-overlay.js',
        format: 'cjs',
        sourcemap: true,
        minify: false,
        keepNames: true,
        define: {
          'process.env.NODE_ENV': '"production"'
        },
        logLevel: 'info',
      });

      console.log('✓ Overlay preload script bundled successfully');

    } catch (error) {
      console.error('✗ Failed to bundle overlay preload script:', error);
      process.exit(1);
    }
  }
}

/**
 * Copy external modules that need to be in node_modules
 */
async function copyExternalModules() {
  console.log('\nCopying external modules...');

  const modulesToCopy = externalModules.filter(m => m !== 'electron' && m !== 'fsevents');

  for (const moduleName of modulesToCopy) {
    // Handle scoped packages (@scope/package)
    const srcDir = path.join('node_modules', moduleName);
    const destDir = path.join('dist-electron/node_modules', moduleName);

    // Resolve symlinks for workspace packages
    let actualSrcDir = srcDir;
    try {
      const stats = fs.lstatSync(srcDir);
      if (stats.isSymbolicLink()) {
        actualSrcDir = fs.realpathSync(srcDir);
        console.log(`  ${moduleName} is symlinked to ${actualSrcDir}`);
      }
    } catch (err) {
      console.warn(`  Warning: Could not read ${moduleName} - ${err.message}`);
      continue;
    }

    if (fs.existsSync(actualSrcDir)) {
      console.log(`  Copying ${moduleName}...`);

      // Create destination directory (handles scoped packages like @odd-core/auth)
      fs.mkdirSync(path.dirname(destDir), { recursive: true });

      // Copy the module (simple recursive copy)
      copyRecursiveSync(actualSrcDir, destDir);
    } else {
      console.warn(`  Warning: ${moduleName} not found at ${actualSrcDir}`);
    }
  }

  console.log('✓ External modules copied');
}

/**
 * Recursive copy helper
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * Main build function
 */
async function build() {
  console.log('='.repeat(60));
  console.log('Bundling Electron processes with esbuild');
  console.log('='.repeat(60));

  // Create output directory
  if (!fs.existsSync('dist-electron')) {
    fs.mkdirSync('dist-electron', { recursive: true });
  }

  // Bundle main and preload
  await bundleMain();
  await bundlePreload();
  await bundleOverlays();

  // Copy external modules
  await copyExternalModules();

  console.log('\n' + '='.repeat(60));
  console.log('✓ Bundling complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Run smoke test: npm run smoke-test');
  console.log('  2. Build production: npm run build:mac');
}

// Run if called directly
if (require.main === module) {
  build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}

module.exports = { build, bundleMain, bundlePreload };
