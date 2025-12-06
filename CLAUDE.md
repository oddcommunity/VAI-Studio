# VAI Studio - Development Guidelines

## Architecture Overview

VAI Studio is an Electron-based application that combines business logic with frontend and backend components. It relies on two core submodules for shared functionality:

### Core Dependencies (Submodules)

| Submodule | Path | Purpose |
|-----------|------|---------|
| **OddCore** | `odd-core/` | Authentication, OAuth, onboarding flow, encryption, and core utilities |
| **OddDesignSystem** | `odd-design-system/` | All UI components (React Native, React Web, Tamagui) |

## Critical Rules

### 1. UI Components - TAMAGUI ONLY, NEVER CSS

**ALWAYS use OddDesignSystem for ALL UI components.** Do not create custom UI primitives.

> **NEVER USE CSS FOR UI FIXES.** Our stack is Tamagui + React. All styling must be done through Tamagui props, not CSS files, className, or inline CSS styles. CSS will not work because Tamagui manages its own styling internally.

- Import from `odd-design-system/packages/ui-components`
- Use Tamagui components exclusively (XStack, YStack, Text, Button, etc.)
- Fonts: Grandstander (headings), Satoshi (body)
- Follow the existing theme system (vai, vai_dark, etc.)

```typescript
// Correct - use Tamagui props
<YStack overflow="scroll" maxHeight={400} padding={16}>

// WRONG - never use CSS or className for styling
<div className="scrollable" style={{ overflow: 'scroll' }}>
```

```typescript
// Correct
import { XStack, YStack, Text, Button } from '@odd/ui-components'

// Incorrect - never do this
import { View } from 'react-native'
```

### 2. Authentication & Core Services

**ALWAYS use OddCore for:**
- User authentication
- OAuth flows
- Onboarding sequences
- Data encryption
- Session management

```typescript
// Import auth from OddCore
import { useAuth, AuthProvider } from '@odd/core'
```

### 3. Business Logic Location

VAI Studio contains app-specific logic:
- `src/react/` - React frontend components and state
- `backends/` - Python ML/AI backends
- `electron/` - Electron main process, IPC handlers

## Submodule Management

### Before Starting Work

Always ensure submodules are up to date:

```bash
git submodule update --init --recursive
```

### Updating Submodules

When OddCore or OddDesignSystem have updates:

```bash
# Pull latest changes for all submodules
git submodule update --remote --merge

# Or update specific submodule
cd odd-core && git pull origin main && cd ..
cd odd-design-system && git pull origin main && cd ..

# Commit the submodule update
git add odd-core odd-design-system
git commit -m "chore: update submodules to latest"
```

### Making Changes to Submodules

If you need to modify OddCore or OddDesignSystem:

1. Make changes in the submodule directory
2. Commit and push changes to the submodule's repository
3. Return to VAI Studio root and commit the submodule reference update

```bash
# Example: updating odd-design-system
cd odd-design-system
# make changes...
git add . && git commit -m "feat: add new component"
git push origin main
cd ..

# Update reference in VAI Studio
git add odd-design-system
git commit -m "chore: update odd-design-system submodule"
```

## Development Workflow

### Running the App

```bash
# Start Vite dev server (React)
pnpm run dev:react

# Start Electron (in separate terminal)
pnpm run dev
```

### Project Structure

```
VAI Studio/
├── odd-core/              # Submodule: auth, OAuth, encryption
├── odd-design-system/     # Submodule: UI components
├── src/
│   └── react/             # React frontend (business logic)
├── backends/              # Python ML backends
├── electron/              # Electron main process
└── index.html             # Entry point
```

## Claude Code Context Management

To reduce context usage and avoid frequent compacting:

### Avoid Background Tasks for Dev Servers

**Don't** run dev servers as background tasks in Claude Code. Each background task generates reminders that consume ~200 bytes per message. With many tasks, this adds up fast.

```bash
# BAD - creates persistent background task
pnpm run dev  # (run_in_background: true)

# GOOD - run in a separate terminal window instead
# Terminal 1: pnpm run dev:react
# Terminal 2: pnpm run dev
```

### Clean Up After Sessions

- Use `/tasks` to view running background tasks
- Kill unused tasks when done
- Restart Claude Code to clear stale task trackers from previous sessions

### Start Fresh for New Features

- Context from previous features isn't always needed
- Starting a new conversation for distinct features reduces bloat
- Use `pnpm run build:react` before `pnpm run dev` to ensure latest changes

### Build vs Dev Server

Since Electron loads from `dist-react/` in development mode:

```bash
# Always rebuild before testing changes
pnpm run build:react && pnpm run dev
```

## Code Review Checklist

Before submitting changes, verify:

- [ ] No custom UI primitives - all components from OddDesignSystem
- [ ] Auth/encryption uses OddCore APIs
- [ ] Submodules are at expected commits
- [ ] Business logic is in VAI Studio, not submodules (unless intentional)
