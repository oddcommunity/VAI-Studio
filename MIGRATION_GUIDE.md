# Vanilla JS to React/Tamagui Migration Guide

This document captures the design system audit and business logic extraction from the VAI Studio vanilla JS codebase to enable migration to React/Tamagui.

---

## Design System Audit

### Color Palette

```json
{
  "primary": "#2563eb",
  "primaryHover": "#1d4ed8",
  "success": "#10b981",
  "successHover": "#059669",
  "error": "#ef4444",
  "backgrounds": {
    "primary": "#0f172a",
    "secondary": "#1e293b",
    "tertiary": "#334155"
  },
  "text": {
    "primary": "#f1f5f9",
    "secondary": "#cbd5e1",
    "muted": "#94a3b8"
  },
  "border": "#475569",
  "link": "#3b82f6"
}
```

### Typography

```json
{
  "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  "lineHeight": 1.6,
  "sizes": {
    "xs": "0.75rem",
    "sm": "0.875rem",
    "base": "0.9375rem",
    "lg": "1rem",
    "xl": "1.125rem",
    "2xl": "1.5rem",
    "3xl": "1.75rem",
    "4xl": "2rem"
  },
  "weights": {
    "normal": 400,
    "medium": 500,
    "semibold": 600,
    "bold": 700
  }
}
```

### Layout Structure

```json
{
  "appContainer": {
    "height": "100vh",
    "display": "flex",
    "flexDirection": "column"
  },
  "mainContent": {
    "display": "grid",
    "gridTemplateColumns": "350px 1fr",
    "overflow": "hidden"
  },
  "header": {
    "padding": "1.5rem 2rem",
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "borderBottom": "1px solid var(--border-color)"
  }
}
```

### Sidebar (Controls Panel)

```json
{
  "width": "350px",
  "padding": "1.5rem",
  "backgroundColor": "var(--bg-secondary)",
  "borderRight": "1px solid var(--border-color)",
  "overflowY": "auto"
}
```

### Control Sections

```json
{
  "marginBottom": "1.5rem",
  "heading": {
    "fontSize": "0.875rem",
    "fontWeight": 600,
    "textTransform": "uppercase",
    "letterSpacing": "0.05em",
    "color": "var(--text-muted)",
    "marginBottom": "0.75rem"
  }
}
```

### Spacing Scale

```json
{
  "0": "0",
  "0.25": "0.25rem",
  "0.5": "0.5rem",
  "0.75": "0.75rem",
  "1": "1rem",
  "1.5": "1.5rem",
  "2": "2rem",
  "4": "4rem"
}
```

### Buttons

```json
{
  "base": {
    "padding": "0.5rem 1rem",
    "borderRadius": "0.375rem",
    "fontSize": "0.875rem",
    "fontWeight": 500,
    "transition": "all 0.15s ease"
  },
  "sm": {
    "padding": "0.375rem 0.75rem",
    "fontSize": "0.75rem"
  },
  "large": {
    "width": "100%",
    "padding": "0.75rem 1.5rem",
    "fontSize": "1rem"
  },
  "variants": {
    "primary": {
      "backgroundColor": "#2563eb",
      "color": "white"
    },
    "success": {
      "backgroundColor": "#10b981",
      "color": "white"
    },
    "recordings": {
      "backgroundColor": "#334155",
      "color": "#f1f5f9",
      "border": "1px solid #475569"
    }
  }
}
```

### Inputs

```json
{
  "select": {
    "width": "100%",
    "padding": "0.625rem 0.75rem",
    "backgroundColor": "#334155",
    "color": "#f1f5f9",
    "border": "1px solid #475569",
    "borderRadius": "0.375rem",
    "fontSize": "0.875rem",
    "marginBottom": "0.5rem"
  },
  "checkbox": {
    "width": "1.25rem",
    "height": "1.25rem",
    "borderRadius": "0.25rem",
    "border": "2px solid #475569",
    "backgroundColor": "#334155"
  }
}
```

### Cards

```json
{
  "result": {
    "backgroundColor": "#1e293b",
    "border": "1px solid #475569",
    "borderRadius": "0.5rem",
    "padding": "1.5rem",
    "boxShadow": "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
  },
  "model": {
    "backgroundColor": "#334155",
    "border": "1px solid #475569",
    "borderRadius": "0.375rem",
    "padding": "1rem",
    "marginBottom": "1rem"
  }
}
```

### Modals

```json
{
  "overlay": {
    "backgroundColor": "rgba(0, 0, 0, 0.75)",
    "backdropFilter": "blur(4px)"
  },
  "content": {
    "backgroundColor": "#1e293b",
    "border": "1px solid #475569",
    "borderRadius": "0.5rem",
    "maxWidth": "700px",
    "maxHeight": "90vh",
    "boxShadow": "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
  },
  "header": {
    "padding": "1.5rem",
    "borderBottom": "1px solid #475569"
  },
  "body": {
    "padding": "1.5rem"
  },
  "footer": {
    "padding": "1rem 1.5rem",
    "borderTop": "1px solid #475569",
    "display": "flex",
    "justifyContent": "space-between"
  }
}
```

### Toasts

```json
{
  "container": {
    "position": "fixed",
    "top": "1rem",
    "right": "1rem",
    "zIndex": 9999
  },
  "toast": {
    "backgroundColor": "#1e293b",
    "border": "1px solid #475569",
    "borderRadius": "0.5rem",
    "padding": "1rem 1.5rem",
    "minWidth": "300px",
    "boxShadow": "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
  },
  "variants": {
    "success": { "borderLeftColor": "#10b981", "borderLeftWidth": "4px" },
    "error": { "borderLeftColor": "#ef4444", "borderLeftWidth": "4px" },
    "info": { "borderLeftColor": "#2563eb", "borderLeftWidth": "4px" }
  }
}
```

### Progress Bars

```json
{
  "container": {
    "width": "100%",
    "height": "8px",
    "backgroundColor": "#334155",
    "borderRadius": "4px",
    "overflow": "hidden"
  },
  "fill": {
    "height": "100%",
    "background": "linear-gradient(90deg, #10b981, #059669)",
    "transition": "width 0.3s ease"
  }
}
```

### Animations

```json
{
  "fadeIn": "0.3s ease",
  "slideUp": "0.3s ease",
  "slideInLeft": "0.4s ease-out",
  "scaleIn": "0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  "spin": "0.8s linear infinite",
  "pulse": "1.5s ease-in-out infinite"
}
```

### Shadows

```json
{
  "default": "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
  "modal": "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  "toast": "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
  "hover": "0 8px 12px -2px rgba(0, 0, 0, 0.3)"
}
```

### Border Radius

```json
{
  "sm": "0.25rem",
  "md": "0.375rem",
  "lg": "0.5rem",
  "full": "50%"
}
```

---

## Business Logic Extraction

### Functions to Extract into TypeScript Services

| Function | Purpose | Source | Electron API |
|----------|---------|--------|--------------|
| `loadBackends()` | Fetch available STT backends/models | `app.js:243` | `electronAPI.listBackends()` |
| `handleTranscribe()` | Transcribe audio with selected model | `app.js:522` | `electronAPI.transcribe()` |
| `handleBatchTranscribe()` | Batch transcription | `app.js:737` | `electronAPI.transcribe()` |
| `loadBuildInfo()` | Get app version info | `app.js:105` | `fetch('build-info.json')` |
| `loadSettings()` / `saveSettings()` | Settings persistence | `app.js:969` | `localStorage` |
| `downloadModel()` | Download STT model | `app.js:1490` | `electronAPI.downloadModel()` |
| `startRecording()` / `stopRecording()` | Audio recording | `app.js:1586` | `AudioRecorder` class |
| `exportResult()` | Export transcription | `app.js:900` | `electronAPI.exportResult()` |

### Electron API Calls to Wrap

```typescript
// File operations
window.electronAPI.selectAudioFile()
window.electronAPI.selectMultipleAudioFiles()
window.electronAPI.selectFromRecordings()
window.electronAPI.getFileInfo(filePath)
window.electronAPI.showItemInFolder(filePath)
window.electronAPI.saveRecording(data)

// Transcription
window.electronAPI.listBackends()
window.electronAPI.transcribe(options)
window.electronAPI.downloadModel(backend, modelName)
window.electronAPI.exportResult(result, format, filePath)

// HuggingFace Auth
window.electronAPI.getHFToken()
window.electronAPI.saveHFToken(token)
window.electronAPI.testHFToken(token)
window.electronAPI.clearHFToken()
window.electronAPI.openHFTokenPage()

// App Updates
window.electronAPI.onUpdateReady(callback)
window.electronAPI.restartToUpdate()

// Progress
window.electronAPI.onProgress(callback)

// External Links
window.electronAPI.openExternal(url)
window.electronAPI.openLicenseFile()
```

---

## Proposed TypeScript Service Structure

```
src/
├── services/
│   ├── transcription.service.ts    # Transcribe, batch transcribe
│   ├── model.service.ts            # List backends, download models
│   ├── audio.service.ts            # Recording, file selection
│   ├── settings.service.ts         # Load/save settings
│   ├── auth.service.ts             # HuggingFace + Supabase auth
│   └── electron.bridge.ts          # Wrapper for all electronAPI calls
├── types/
│   └── index.ts                    # TypeScript interfaces (from @odd-core/types)
└── hooks/
    ├── useTranscription.ts
    ├── useModels.ts
    ├── useAudioRecorder.ts
    ├── useSettings.ts
    └── useAuth.ts
```

---

## Sample Service: transcription.service.ts

```typescript
import type { TranscribeOptions, TranscribeResult } from '@odd-core/types';

export interface TranscriptionService {
  transcribe(options: TranscribeOptions): Promise<TranscribeResult>;
  transcribeBatch(files: string[], options: Omit<TranscribeOptions, 'audioPath'>): Promise<TranscribeResult[]>;
}

export async function transcribe(options: TranscribeOptions): Promise<TranscribeResult> {
  const result = await window.electronAPI.transcribe({
    audioPath: options.audioPath,
    backend: options.backend,
    modelName: options.modelName,
    task: options.backend === 'voxtral' ? 'transcribe' : undefined
  });

  return result;
}

export async function transcribeBatch(
  files: string[],
  options: Omit<TranscribeOptions, 'audioPath'>
): Promise<TranscribeResult[]> {
  const results: TranscribeResult[] = [];

  for (const filePath of files) {
    try {
      const result = await transcribe({
        ...options,
        audioPath: filePath
      });
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}
```

---

## Sample Service: model.service.ts

```typescript
export interface Backend {
  name: string;
  available: boolean;
  models: Model[];
}

export interface Model {
  name: string;
  size: string;
  params: string;
  wer: string;
  installed: boolean;
  features?: string[];
  company?: string;
}

export async function listBackends(): Promise<Record<string, Backend>> {
  const result = await window.electronAPI.listBackends();

  if (!result.success) {
    throw new Error(result.error || 'Failed to load backends');
  }

  return result.backends;
}

export async function downloadModel(backend: string, modelName: string): Promise<void> {
  const result = await window.electronAPI.downloadModel(backend, modelName);

  if (!result.success) {
    throw new Error(result.error || 'Failed to download model');
  }
}
```

---

## Component Mapping (Vanilla -> React/Tamagui)

| Vanilla Element | React Component | Tamagui Component |
|-----------------|-----------------|-------------------|
| `.app-container` | `<AppLayout>` | `<YStack>` |
| `.app-header` | `<Header>` | `<XStack>` |
| `.controls-panel` | `<Sidebar>` | `<YStack>` |
| `.control-section` | `<ControlSection>` | `<YStack>` |
| `.results-panel` | `<ResultsPanel>` | `<YStack>` |
| `.result-card` | `<ResultCard>` | `<Card>` |
| `.modal` | `<Modal>` | `<Sheet>` or `<Dialog>` |
| `.btn` | `<Button>` | `<Button>` |
| `.select-input` | `<Select>` | `<Select>` |
| `.toast` | `<Toast>` | `<Toast>` |
| `.progress-bar` | `<ProgressBar>` | `<Progress>` |

---

## Migration Checklist

- [ ] Set up Tamagui theme with design tokens from this audit
- [ ] Create TypeScript service layer (no DOM manipulation)
- [ ] Build React hooks wrapping services
- [ ] Create Tamagui components matching vanilla design
- [ ] Wire up Electron IPC bridge
- [ ] Migrate screens one at a time
- [ ] Test all functionality end-to-end
- [ ] Remove vanilla JS code

---

## Notes

- All colors use dark theme (slate/gray palette)
- Layout is two-column: 350px sidebar + fluid main area
- Modals use backdrop blur effect
- Animations are subtle and quick (0.15s - 0.4s)
- Toast notifications appear top-right
- Progress bars use green gradient fill
