#!/usr/bin/env node
/**
 * pnpm wrapper for electron-builder builds
 *
 * electron-builder runs `pnpm list --prod --json --depth Infinity` which
 * causes OOM in large pnpm workspaces. This wrapper intercepts that specific
 * command and limits the depth to prevent memory issues.
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);

// Detect the problematic command pattern
const isListCommand = args[0] === 'list';
const hasDepthInfinity = args.includes('--depth') &&
  (args[args.indexOf('--depth') + 1] === 'Infinity' ||
   args.some(a => a === '--depth=Infinity'));

if (isListCommand && hasDepthInfinity) {
  // Replace Infinity depth with a reasonable limit
  const newArgs = args.map((arg, i) => {
    if (arg === 'Infinity' && args[i - 1] === '--depth') {
      return '3';  // Limit to depth 3
    }
    if (arg === '--depth=Infinity') {
      return '--depth=3';
    }
    return arg;
  });

  console.error('[pnpm-wrapper] Limiting depth to 3 to prevent OOM');

  const pnpm = spawn('pnpm', newArgs, {
    stdio: 'inherit',
    shell: true
  });

  pnpm.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  // Pass through to real pnpm
  const pnpm = spawn('pnpm', args, {
    stdio: 'inherit',
    shell: true
  });

  pnpm.on('exit', (code) => {
    process.exit(code || 0);
  });
}
