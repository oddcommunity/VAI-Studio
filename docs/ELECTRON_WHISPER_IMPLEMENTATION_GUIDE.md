# Electron Local Whisper.cpp Transcription Implementation Guide

**For Engineers Building Similar Features**

This guide provides a complete walkthrough for implementing local speech-to-text transcription in Electron apps using whisper.cpp, based on the production-ready implementation in Privately-v0.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Step 1: Create Whisper Package](#step-1-create-whisper-package)
5. [Step 2: Implement Audio Processor](#step-2-implement-audio-processor)
6. [Step 3: Setup IPC Handlers](#step-3-setup-ipc-handlers)
7. [Step 4: Create React Component](#step-4-create-react-component)
8. [Step 5: Register Everything](#step-5-register-everything)
9. [Installation & Build](#installation--build)
10. [Testing](#testing)
11. [Common Issues](#common-issues)
12. [Performance Optimization](#performance-optimization)
13. [Security Best Practices](#security-best-practices)

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                        │
│                                                             │
│  ┌──────────────┐     ┌──────────────┐                    │
│  │ VoiceRecorder │────▶│ MediaRecorder│                    │
│  │  Component   │     │     API      │                    │
│  └──────────────┘     └──────────────┘                    │
│         │                    │                             │
│         │                    ▼                             │
│         │            Capture Audio                         │
│         │            (WebM/Opus)                           │
│         │                    │                             │
│         ▼                    ▼                             │
│   IPC Invoke ◀───────────────┘                            │
│   (contextBridge)                                          │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                           │
│                                                             │
│  ┌──────────────┐     ┌──────────────┐                    │
│  │ IPC Handlers │────▶│Audio Processor│                    │
│  │              │     │   (FFmpeg)   │                    │
│  └──────────────┘     └──────────────┘                    │
│         │                    │                             │
│         │                    ▼                             │
│         │            Convert to WAV                        │
│         │            (16kHz mono PCM)                      │
│         │                    │                             │
│         │                    ▼                             │
│         │           ┌──────────────┐                       │
│         │           │   Whisper    │                       │
│         └──────────▶│   Package    │                       │
│                     │(nodejs-whisper)                      │
│                     └──────────────┘                       │
│                            │                               │
│                            ▼                               │
│                     Transcription                          │
│                            │                               │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
              Return Text to Renderer
```

### Key Components

1. **Renderer Process** (React Component)
   - Captures audio using MediaRecorder API
   - Manages recording state and UI
   - Sends audio chunks via IPC

2. **Main Process** (IPC Handlers)
   - Receives audio chunks
   - Orchestrates conversion and transcription
   - Manages temp file cleanup

3. **Audio Processor** (FFmpeg)
   - Converts WebM/Opus to WAV
   - Extracts audio duration
   - Validates audio files

4. **Whisper Package** (nodejs-whisper)
   - Local speech-to-text transcription
   - Automatic model download and caching
   - Zero network calls for privacy

---

## Prerequisites

### System Requirements

```bash
# Node.js 18+ (for native fetch support)
node --version  # Should be v18.0.0 or higher

# pnpm (or npm/yarn)
pnpm --version
```

### Dependencies to Install

```json
{
  "dependencies": {
    "nodejs-whisper": "^0.1.20",      // Whisper.cpp bindings
    "fluent-ffmpeg": "^2.1.2",        // FFmpeg wrapper
    "ffmpeg-static": "^5.2.0",        // FFmpeg binary
    "fs-extra": "^11.2.0",            // Enhanced file operations
    "electron-log": "^5.0.0"          // Logging
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24" // TypeScript types
  }
}
```

---

## Project Structure

Create this folder structure in your Electron project:

```
your-electron-app/
├── packages/
│   └── whisper/                    # Whisper package
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Public API
│           ├── whisper-backend.ts  # Core transcription
│           └── types.ts            # TypeScript types
│
└── apps/
    └── electron/
        ├── package.json
        └── src/
            ├── main/
            │   ├── audio-processor.ts    # FFmpeg audio processing
            │   ├── voice-handlers.ts     # IPC handlers
            │   ├── main.ts               # Electron main entry
            │   └── preload.mts           # Preload script
            └── renderer/
                └── src/
                    └── components/
                        └── VoiceRecorder.tsx  # React component
```

---

## Step 1: Create Whisper Package

### 1.1 Create Package Directory

```bash
mkdir -p packages/whisper/src
cd packages/whisper
```

### 1.2 Create `package.json`

```json
{
  "name": "@app/whisper",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "nodejs-whisper": "^0.1.20",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0"
  }
}
```

### 1.3 Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 Create `src/types.ts`

```typescript
/**
 * Whisper model sizes (larger = more accurate but slower)
 */
export type ModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large';

/**
 * Options for transcription
 */
export interface TranscriptionOptions {
  /**
   * Model size to use
   * @default 'base'
   */
  modelSize?: ModelSize;

  /**
   * Language code (e.g., 'en', 'es', 'fr')
   * Use 'auto' for automatic detection
   * @default 'auto'
   */
  language?: string;

  /**
   * Number of CPU threads to use
   * @default Math.floor(cpus / 2)
   */
  threads?: number;

  /**
   * Temperature for sampling (0.0 = deterministic)
   * @default 0.0
   */
  temperature?: number;
}

/**
 * Result from transcription
 */
export interface TranscriptionResult {
  /**
   * Transcribed text
   */
  text: string;

  /**
   * Detected or specified language
   */
  language: string;

  /**
   * Audio duration in seconds
   */
  duration: number;

  /**
   * Processing time in milliseconds
   */
  processingTime: number;

  /**
   * Model used for transcription
   */
  modelUsed: string;
}
```

### 1.5 Create `src/whisper-backend.ts`

```typescript
/**
 * Whisper Backend - Core transcription using nodejs-whisper
 */
import os from 'os';
import { nodewhisper } from 'nodejs-whisper';
import type { TranscriptionOptions, TranscriptionResult } from './types.js';

/**
 * Transcribe audio file to text using Whisper
 *
 * @param audioPath Path to audio file (WAV 16kHz mono recommended)
 * @param options Transcription options
 * @returns Transcription result with text, language, timing
 */
export async function transcribeAudio(
  audioPath: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  // Model configuration
  const modelSize = options?.modelSize || 'base';
  const modelName = options?.language === 'en' ? `${modelSize}.en` : modelSize;

  // Thread allocation (half of available CPUs, minimum 1)
  const threads = options?.threads || Math.max(1, Math.floor(os.cpus().length / 2));

  console.log(`[Whisper] Transcribing with model: ${modelName}, threads: ${threads}`);

  try {
    // nodejs-whisper automatically downloads and caches models
    const result = await nodewhisper(audioPath, {
      modelName: modelName,
      whisperOptions: {
        outputInText: true,
        language: options?.language || 'auto',
        temperature: options?.temperature !== undefined ? options.temperature : 0.0,
        threads: threads,
      },
    });

    const processingTime = Date.now() - startTime;

    // Extract text from result
    const text = typeof result === 'string' ? result : (result as any)?.text || '';

    console.log(`[Whisper] Transcription complete in ${processingTime}ms`);

    return {
      text: text.trim(),
      language: options?.language || 'auto',
      duration: 0, // Duration should be set by caller using AudioProcessor
      processingTime,
      modelUsed: `whisper-${modelSize}`,
    };
  } catch (error) {
    console.error('[Whisper] Transcription failed:', error);
    throw new Error(`Whisper transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### 1.6 Create `src/index.ts`

```typescript
/**
 * Whisper Package - Local speech-to-text transcription
 */

// Export types
export type {
  TranscriptionOptions,
  TranscriptionResult,
  ModelSize,
} from './types.js';

// Export main function
export { transcribeAudio } from './whisper-backend.js';
```

### 1.7 Build the Package

```bash
cd packages/whisper
pnpm install
pnpm build
```

**Verify build:**
```bash
ls -la dist/
# Should show: index.js, index.d.ts, whisper-backend.js, types.js, etc.
```

---

## Step 2: Implement Audio Processor

### 2.1 Create `apps/electron/src/main/audio-processor.ts`

```typescript
/**
 * AudioProcessor - Converts audio files to WAV format for whisper.cpp
 *
 * Uses FFmpeg to convert WebM/Opus (from MediaRecorder) to WAV 16kHz mono PCM
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// Set FFmpeg binary path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export class AudioProcessor {
  /**
   * Convert audio file to WAV 16kHz mono PCM
   *
   * @param inputPath Path to input audio file (WebM, MP3, etc.)
   * @returns Path to converted WAV file
   */
  async convertToWav(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace(/\.\w+$/, '.wav');

    console.log(`[AudioProcessor] Converting ${inputPath} to WAV...`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioChannels(1)          // Mono
        .audioFrequency(16000)     // 16kHz sample rate (whisper.cpp requirement)
        .audioCodec('pcm_s16le')   // 16-bit PCM
        .format('wav')             // WAV container
        .on('start', (cmd) => {
          console.log(`[AudioProcessor] FFmpeg command: ${cmd}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[AudioProcessor] Processing: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log(`[AudioProcessor] Conversion complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`[AudioProcessor] Conversion error:`, err);
          reject(new Error(`FFmpeg conversion failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Get audio file duration in seconds
   *
   * @param audioPath Path to audio file
   * @returns Duration in seconds
   */
  async getDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  /**
   * Validate audio file format
   *
   * @param audioPath Path to audio file
   * @returns true if valid for whisper.cpp
   */
  async validateAudioFile(audioPath: string): Promise<boolean> {
    try {
      const exists = await fs.pathExists(audioPath);
      if (!exists) {
        return false;
      }

      // Check file size (must be > 0)
      const stats = await fs.stat(audioPath);
      if (stats.size === 0) {
        return false;
      }

      // Try to get metadata
      await this.getDuration(audioPath);

      return true;
    } catch (error) {
      console.error(`[AudioProcessor] Validation failed:`, error);
      return false;
    }
  }

  /**
   * Clean up temporary audio files
   *
   * @param sessionId Recording session ID
   */
  async cleanupTempFiles(sessionId: string): Promise<void> {
    const tempDir = os.tmpdir();
    const patterns = [
      path.join(tempDir, `voice-${sessionId}.webm`),
      path.join(tempDir, `voice-${sessionId}.wav`),
    ];

    for (const filePath of patterns) {
      try {
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          console.log(`[AudioProcessor] Cleaned up: ${filePath}`);
        }
      } catch (error) {
        console.warn(`[AudioProcessor] Failed to clean up ${filePath}:`, error);
      }
    }
  }
}

// Singleton instance
let audioProcessorInstance: AudioProcessor | null = null;

/**
 * Get singleton AudioProcessor instance
 */
export function getAudioProcessor(): AudioProcessor {
  if (!audioProcessorInstance) {
    audioProcessorInstance = new AudioProcessor();
  }
  return audioProcessorInstance;
}
```

---

## Step 3: Setup IPC Handlers

### 3.1 Create `apps/electron/src/main/voice-handlers.ts`

```typescript
/**
 * Voice Recording IPC Handlers
 */
import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import log from 'electron-log';
import { transcribeAudio } from '@app/whisper';
import { getAudioProcessor } from './audio-processor.js';

// File size limit (100MB)
const MAX_AUDIO_SIZE = 100 * 1024 * 1024;

// Transcription timeout (5 minutes)
const TRANSCRIPTION_TIMEOUT = 5 * 60 * 1000;

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Register all voice-related IPC handlers
 */
export function registerVoiceHandlers(): void {
  /**
   * Start voice recording session
   */
  ipcMain.handle('voice:start-recording', async (event, { sessionId }) => {
    try {
      log.info(`[VoiceHandlers] Starting recording session: ${sessionId}`);

      // Validate session ID format (prevent path traversal)
      if (!/^[0-9]+-[a-f0-9-]+$/.test(sessionId)) {
        throw new Error('Invalid session ID format');
      }

      // Create temp file path
      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, `voice-${sessionId}.webm`);

      // Ensure temp directory exists
      await fs.ensureDir(tempDir);

      // Initialize empty file
      await fs.writeFile(tempPath, Buffer.alloc(0));

      log.info(`[VoiceHandlers] Created temp file: ${tempPath}`);

      return { success: true, sessionId };
    } catch (error) {
      log.error('[VoiceHandlers] Failed to start recording:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Save audio chunk to temp file
   */
  ipcMain.handle('voice:save-audio-chunk', async (event, { sessionId, chunk }) => {
    try {
      // Validate session ID
      if (!/^[0-9]+-[a-f0-9-]+$/.test(sessionId)) {
        throw new Error('Invalid session ID format');
      }

      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, `voice-${sessionId}.webm`);

      // Check file size limit
      if (await fs.pathExists(tempPath)) {
        const stats = await fs.stat(tempPath);
        if (stats.size + chunk.byteLength > MAX_AUDIO_SIZE) {
          throw new Error(`Audio file too large: max ${MAX_AUDIO_SIZE / 1024 / 1024}MB`);
        }
      }

      // Append chunk to file
      await fs.appendFile(tempPath, Buffer.from(chunk));

      return { success: true };
    } catch (error) {
      log.error('[VoiceHandlers] Failed to save audio chunk:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Transcribe recorded audio
   */
  ipcMain.handle('voice:transcribe', async (event, { sessionId }) => {
    const audioProcessor = getAudioProcessor();
    const tempDir = os.tmpdir();
    const webmPath = path.join(tempDir, `voice-${sessionId}.webm`);
    let wavPath: string | null = null;

    try {
      log.info(`[VoiceHandlers] Starting transcription for session: ${sessionId}`);

      // Validate session ID
      if (!/^[0-9]+-[a-f0-9-]+$/.test(sessionId)) {
        throw new Error('Invalid session ID format');
      }

      // Validate audio file exists and has content
      if (!(await fs.pathExists(webmPath))) {
        throw new Error('Audio file not found');
      }

      const stats = await fs.stat(webmPath);
      if (stats.size === 0) {
        throw new Error('Audio file is empty');
      }

      if (stats.size > MAX_AUDIO_SIZE) {
        throw new Error(
          `Audio file too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_AUDIO_SIZE / 1024 / 1024}MB)`
        );
      }

      log.info(`[VoiceHandlers] Audio file size: ${(stats.size / 1024).toFixed(1)}KB`);

      // Convert to WAV
      log.info('[VoiceHandlers] Converting audio to WAV...');
      wavPath = await audioProcessor.convertToWav(webmPath);
      log.info(`[VoiceHandlers] Conversion complete: ${wavPath}`);

      // Get audio duration
      const duration = await audioProcessor.getDuration(wavPath);
      log.info(`[VoiceHandlers] Audio duration: ${duration.toFixed(2)}s`);

      // Transcribe with timeout
      log.info('[VoiceHandlers] Starting transcription...');
      const result = await withTimeout(
        transcribeAudio(wavPath, {
          modelSize: 'base',
          language: 'en',
        }),
        TRANSCRIPTION_TIMEOUT,
        `Transcription timeout after ${TRANSCRIPTION_TIMEOUT / 1000}s`
      );

      log.info(`[VoiceHandlers] Transcription complete: ${result.text.substring(0, 100)}...`);

      // Clean up temp files
      await fs.remove(webmPath);
      await fs.remove(wavPath);
      log.info('[VoiceHandlers] Temp files cleaned up');

      return {
        success: true,
        text: result.text,
        language: result.language,
        duration: duration,
        processingTime: result.processingTime,
        modelUsed: result.modelUsed,
      };
    } catch (error) {
      log.error('[VoiceHandlers] Transcription failed:', error);

      // Clean up ALL temp files even on error
      try {
        if (await fs.pathExists(webmPath)) {
          await fs.remove(webmPath);
        }
        if (wavPath && await fs.pathExists(wavPath)) {
          await fs.remove(wavPath);
        }
      } catch (cleanupError) {
        log.warn(`[VoiceHandlers] Failed to clean up temp files:`, cleanupError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  log.info('[VoiceHandlers] Voice handlers registered');
}
```

### 3.2 Update `apps/electron/src/main/preload.mts`

Add voice methods to the contextBridge API:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...

  // Voice recording and transcription
  startVoiceRecording: (sessionId: string) =>
    ipcRenderer.invoke('voice:start-recording', { sessionId }),

  saveAudioChunk: (sessionId: string, chunk: ArrayBuffer) =>
    ipcRenderer.invoke('voice:save-audio-chunk', { sessionId, chunk }),

  transcribeVoice: (sessionId: string) =>
    ipcRenderer.invoke('voice:transcribe', { sessionId }),
});
```

### 3.3 Update TypeScript types

Create `apps/electron/src/renderer/src/types/electron.d.ts`:

```typescript
export interface ElectronAPI {
  // Voice methods
  startVoiceRecording: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  saveAudioChunk: (sessionId: string, chunk: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
  transcribeVoice: (sessionId: string) => Promise<{
    success: boolean;
    text?: string;
    language?: string;
    duration?: number;
    processingTime?: number;
    modelUsed?: string;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

### 3.4 Register handlers in `apps/electron/src/main/main.ts`

```typescript
import { app, BrowserWindow } from 'electron';
import { registerVoiceHandlers } from './voice-handlers.js';

app.whenReady().then(() => {
  // Register IPC handlers
  registerVoiceHandlers();

  // ... create window, etc.
});
```

---

## Step 4: Create React Component

### 4.1 Create `apps/electron/src/renderer/src/components/VoiceRecorder.tsx`

```typescript
import React, { useState, useCallback, useRef } from 'react';

interface VoiceRecorderProps {
  /**
   * Callback when transcription completes successfully
   */
  onTranscriptionComplete?: (text: string) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptionComplete,
  onError,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    let stream: MediaStream | null = null;

    try {
      // Request microphone access
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Generate secure session ID
      const sessionId = `${Date.now()}-${crypto.randomUUID()}`;
      sessionIdRef.current = sessionId;

      // Initialize recording session on main process
      const initResult = await window.electronAPI.startVoiceRecording(sessionId);
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize recording');
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      // Handle audio data chunks
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && sessionIdRef.current) {
          const arrayBuffer = await event.data.arrayBuffer();
          await window.electronAPI.saveAudioChunk(sessionIdRef.current, arrayBuffer);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Release microphone
        stream?.getTracks().forEach((track) => track.stop());
      };

      // Start recording with 1-second chunks
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      console.log('[VoiceRecorder] Recording started');
    } catch (error) {
      console.error('[VoiceRecorder] Failed to start recording:', error);

      // Cleanup stream on error
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      setIsRecording(false);

      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      onError?.(errorMessage);
    }
  }, [onError]);

  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    const sessionId = sessionIdRef.current;

    if (!mediaRecorder || !sessionId) {
      return;
    }

    try {
      // Stop recording
      mediaRecorder.stop();
      setIsRecording(false);
      setIsTranscribing(true);

      console.log('[VoiceRecorder] Recording stopped, starting transcription...');

      // Wait a bit for final chunks to be saved
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Transcribe audio
      const result = await window.electronAPI.transcribeVoice(sessionId);

      if (result.success && result.text) {
        console.log('[VoiceRecorder] Transcription complete:', result.text);
        onTranscriptionComplete?.(result.text);
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('[VoiceRecorder] Transcription failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
      onError?.(errorMessage);
    } finally {
      setIsTranscribing(false);
      mediaRecorderRef.current = null;
      sessionIdRef.current = null;
    }
  }, [onTranscriptionComplete, onError]);

  return (
    <div className="voice-recorder">
      {!isRecording && !isTranscribing && (
        <button
          onClick={startRecording}
          className="record-button"
          title="Start recording"
        >
          🎤 Start Recording
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          className="stop-button"
          title="Stop recording"
        >
          ⏹️ Stop Recording
        </button>
      )}

      {isTranscribing && (
        <div className="transcribing-indicator">
          ⏳ Transcribing...
        </div>
      )}
    </div>
  );
};
```

### 4.2 Use the Component

```typescript
import React, { useCallback } from 'react';
import { VoiceRecorder } from './components/VoiceRecorder';

function App() {
  const handleTranscription = useCallback((text: string) => {
    // Insert text into your editor
    console.log('Transcribed text:', text);
    // Example: insert at cursor position in your text editor
  }, []);

  const handleError = useCallback((error: string) => {
    // Show error to user
    console.error('Voice recording error:', error);
    alert(`Error: ${error}`);
  }, []);

  return (
    <div>
      <VoiceRecorder
        onTranscriptionComplete={handleTranscription}
        onError={handleError}
      />
    </div>
  );
}
```

---

## Step 5: Register Everything

### 5.1 Update `apps/electron/package.json`

Add dependencies and workspace reference:

```json
{
  "name": "your-electron-app",
  "dependencies": {
    "@app/whisper": "workspace:*",
    "fluent-ffmpeg": "^2.1.2",
    "ffmpeg-static": "^5.2.0",
    "fs-extra": "^11.2.0",
    "electron-log": "^5.0.0"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24",
    "@types/fs-extra": "^11.0.4"
  }
}
```

### 5.2 Install Dependencies

```bash
# In project root (if using monorepo)
pnpm install

# Or in electron app directory
cd apps/electron
pnpm install
```

---

## Installation & Build

### Full Setup Process

```bash
# 1. Install all dependencies
cd /your/project/root
pnpm install

# 2. Build whisper package
cd packages/whisper
pnpm build

# 3. Verify build
ls -la dist/
# Should show: index.js, index.d.ts, whisper-backend.js, types.js

# 4. Build electron app
cd ../../apps/electron
pnpm build

# 5. Run in development
pnpm dev
```

### First Run Expectations

**First transcription:**
- Whisper model will be downloaded automatically (75-466MB depending on model size)
- Download time: 30-60 seconds depending on internet speed
- Models are cached in `~/.cache/whisper` for future use

**Subsequent transcriptions:**
- No download needed
- Fast transcription (2-20 seconds depending on audio length and model)

---

## Testing

### Basic Functionality Test

```bash
# 1. Start app in development
cd apps/electron
pnpm dev

# 2. Test recording workflow:
# - Click "Start Recording" button
# - Speak for 10 seconds: "This is a test recording"
# - Click "Stop Recording" button
# - Wait for transcription (should take 2-5 seconds)
# - Verify text appears in your editor
```

### Error Handling Tests

```typescript
// Test 1: Deny microphone permission
// Expected: User-friendly error message

// Test 2: Record empty audio (silence)
// Expected: Graceful handling, possibly "No speech detected"

// Test 3: Close app during recording
// Expected: Temp files cleaned up, no leftover files in /tmp

// Test 4: Very long recording (>5 minutes)
// Expected: Timeout error after 5 minutes
```

### Security Tests

```bash
# Test 1: Check session IDs are secure
# Look in logs - should see UUIDs like: 1234567890-a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6

# Test 2: Verify temp file cleanup
ls /tmp/voice-*
# Should be empty after transcription completes

# Test 3: Check for network calls
# Open DevTools Network tab during recording
# Should see ZERO network requests (all processing is local)
```

---

## Common Issues

### Issue 1: "Module not found: @app/whisper"

**Cause:** Whisper package not built

**Fix:**
```bash
cd packages/whisper
pnpm install
pnpm build
```

### Issue 2: "FFmpeg not found"

**Cause:** ffmpeg-static not installed

**Fix:**
```bash
cd apps/electron
pnpm install ffmpeg-static --save
```

### Issue 3: "Microphone permission denied"

**Cause:** User denied microphone access

**Fix:**
- macOS: System Preferences → Security & Privacy → Microphone
- Windows: Settings → Privacy → Microphone
- Linux: Check PulseAudio/ALSA settings

### Issue 4: "Model download failed"

**Cause:** Network issue or disk space

**Fix:**
```bash
# Check disk space
df -h

# Check internet connection
ping -c 3 huggingface.co

# Manually download model
wget https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
mkdir -p ~/.cache/whisper
mv ggml-base.en.bin ~/.cache/whisper/
```

### Issue 5: "require() of ES Module not supported"

**Cause:** Using `require()` in ESM module

**Fix:**
```typescript
// ❌ Wrong
const os = require('os');

// ✅ Correct
import os from 'os';
```

Ensure `package.json` has:
```json
{
  "type": "module"
}
```

### Issue 6: Temp files not cleaned up

**Cause:** Error occurred before cleanup

**Fix:** Add cleanup to error handlers:
```typescript
try {
  // ... transcription
} finally {
  // Always cleanup
  await audioProcessor.cleanupTempFiles(sessionId);
}
```

---

## Performance Optimization

### 1. Choose Right Model Size

```typescript
// For real-time transcription (fast, acceptable accuracy)
{ modelSize: 'tiny' }  // ~75MB, 1-2s per 10s audio

// For balanced performance (recommended)
{ modelSize: 'base' }  // ~142MB, 2-4s per 10s audio

// For high accuracy (slower)
{ modelSize: 'small' } // ~466MB, 4-6s per 10s audio
```

### 2. Optimize Thread Count

```typescript
import os from 'os';

// Use half of available CPUs (recommended)
const threads = Math.max(1, Math.floor(os.cpus().length / 2));

// For real-time applications, use fewer threads to avoid blocking
const threads = Math.min(4, Math.floor(os.cpus().length / 2));
```

### 3. Enable English-Specific Models

```typescript
// If you know audio is in English, use English-specific model
{
  modelSize: 'base',
  language: 'en'  // Uses base.en instead of base (20% faster)
}
```

### 4. Chunk Size Optimization

```typescript
// Smaller chunks = more frequent IPC calls but better progress
mediaRecorder.start(500);  // 500ms chunks

// Larger chunks = fewer IPC calls but less responsive
mediaRecorder.start(2000); // 2s chunks

// Recommended: 1 second (balanced)
mediaRecorder.start(1000);
```

### 5. Pre-warm Model (Optional)

```typescript
// On app startup, transcribe a dummy file to pre-load model
import { transcribeAudio } from '@app/whisper';

async function prewarmWhisper() {
  try {
    // Create 1-second silent WAV file
    const silentWav = await createSilentWav();
    await transcribeAudio(silentWav, { modelSize: 'base' });
    console.log('Whisper model pre-loaded');
  } catch (error) {
    console.warn('Failed to pre-warm Whisper:', error);
  }
}
```

---

## Security Best Practices

### 1. Secure Session IDs

```typescript
// ✅ GOOD: Cryptographically secure
const sessionId = `${Date.now()}-${crypto.randomUUID()}`;

// ❌ BAD: Predictable, not secure
const sessionId = `${Date.now()}-${Math.random().toString(36)}`;
```

### 2. Validate Session IDs

```typescript
// Prevent path traversal attacks
if (!/^[0-9]+-[a-f0-9-]+$/.test(sessionId)) {
  throw new Error('Invalid session ID format');
}
```

### 3. File Size Limits

```typescript
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB

if (stats.size > MAX_AUDIO_SIZE) {
  throw new Error('Audio file too large');
}
```

### 4. Timeout Protection

```typescript
const TRANSCRIPTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const result = await withTimeout(
  transcribeAudio(wavPath),
  TRANSCRIPTION_TIMEOUT,
  'Transcription timeout'
);
```

### 5. Complete Cleanup

```typescript
try {
  // ... transcription
} catch (error) {
  // Always cleanup, even on error
  if (await fs.pathExists(webmPath)) await fs.remove(webmPath);
  if (wavPath && await fs.pathExists(wavPath)) await fs.remove(wavPath);
  throw error;
}
```

### 6. Context Isolation

Ensure `webPreferences` in BrowserWindow:

```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    contextIsolation: true,    // ✅ Enable context isolation
    nodeIntegration: false,     // ✅ Disable node integration
    sandbox: true,              // ✅ Enable sandbox
  },
});
```

### 7. Permission Validation

```typescript
// Always check microphone permission before recording
try {
  await navigator.mediaDevices.getUserMedia({ audio: true });
} catch (error) {
  if (error.name === 'NotAllowedError') {
    alert('Microphone permission denied. Please enable in system settings.');
  }
}
```

---

## Expected Performance Metrics

### Transcription Speed (Intel i7/M1)

| Audio Length | Model  | Transcription Time | Realtime Factor |
|-------------|--------|-------------------|-----------------|
| 10 seconds  | tiny   | 1-2 seconds       | 5-10x faster    |
| 10 seconds  | base   | 2-4 seconds       | 2.5-5x faster   |
| 10 seconds  | small  | 4-6 seconds       | 1.6-2.5x faster |
| 60 seconds  | tiny   | 5-10 seconds      | 6-12x faster    |
| 60 seconds  | base   | 10-20 seconds     | 3-6x faster     |
| 60 seconds  | small  | 20-30 seconds     | 2-3x faster     |

### Model Sizes

| Model  | Size  | Download Time (10 Mbps) | Accuracy |
|--------|-------|------------------------|----------|
| tiny   | 75MB  | 60 seconds             | Good     |
| base   | 142MB | 114 seconds            | Better   |
| small  | 466MB | 372 seconds            | Best     |

### Resource Usage

| Operation      | CPU Usage | Memory Usage | Disk I/O    |
|---------------|-----------|--------------|-------------|
| Recording     | 5-10%     | 50-100MB     | Minimal     |
| FFmpeg Convert| 30-50%    | 100-200MB    | High (temp) |
| Transcription | 50-100%   | 200-500MB    | Minimal     |

---

## Troubleshooting Commands

```bash
# Check if whisper package built correctly
ls -la packages/whisper/dist/

# Check if FFmpeg binary exists
ls -la node_modules/ffmpeg-static/

# Check whisper models cache
ls -la ~/.cache/whisper/

# Check for leftover temp files
ls -la /tmp/voice-*

# Test FFmpeg installation
npx ffmpeg-static -version

# Check TypeScript compilation
cd apps/electron
pnpm run typecheck

# View electron logs
tail -f ~/.config/Electron/logs/main.log
```

---

## Summary Checklist

Before deploying to production, verify:

- [ ] Whisper package built successfully (`packages/whisper/dist/` exists)
- [ ] All dependencies installed (`pnpm install` completed)
- [ ] TypeScript compilation passes (no errors)
- [ ] FFmpeg binary bundled (`ffmpeg-static` installed)
- [ ] IPC handlers registered in main.ts
- [ ] contextBridge properly exposes voice methods
- [ ] Session IDs use `crypto.randomUUID()`
- [ ] File size validation implemented
- [ ] Timeout protection added
- [ ] Temp file cleanup works on all paths
- [ ] Error messages user-friendly
- [ ] Microphone permission handling works
- [ ] Context isolation enabled
- [ ] Successfully tested end-to-end workflow

---

## Additional Resources

- **nodejs-whisper Documentation:** https://github.com/ariym/nodejs-whisper
- **whisper.cpp Repository:** https://github.com/ggerganov/whisper.cpp
- **Electron IPC Guide:** https://www.electronjs.org/docs/latest/tutorial/ipc
- **MediaRecorder API:** https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- **FFmpeg Audio Filters:** https://ffmpeg.org/ffmpeg-filters.html#Audio-Filters

---

**Document Created:** Based on production implementation in Privately-v0
**Last Updated:** November 7, 2025
**Tested On:** Electron 28+, Node.js 18+, macOS/Windows/Linux
**License:** Use freely for your projects
