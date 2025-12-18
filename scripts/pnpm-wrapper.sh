#!/bin/bash
# Wrapper for pnpm that speeds up electron-builder by returning minimal deps
# for the problematic 'pnpm list --prod --json --depth Infinity' command

# Check if this is the slow command that hangs on monorepos
if [[ "$*" == "list --prod --json --depth Infinity" ]]; then
    # Return minimal valid structure - electron-builder needs workspaces field
    cat << 'EOF'
[
  {
    "name": "vai-studio",
    "version": "1.0.0",
    "path": "/Users/exeai/Projects/VAI Studio",
    "private": true,
    "dependencies": {}
  }
]
EOF
    exit 0
fi

# For all other commands, pass through to real pnpm
exec /Users/exeai/Library/pnpm/pnpm "$@"
