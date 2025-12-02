/**
 * Application State Store
 * Manages global app state using Zustand
 */

import { create } from 'zustand'
import type { Backend, BatchFile, RecordedAudio, TranscribeResult } from '@types/index'

interface AppState {
  // Models & Backends
  backends: Record<string, Backend>
  selectedBackend: string | null
  selectedModel: string | null

  // File Selection
  selectedFile: string | null
  batchMode: boolean
  batchFiles: BatchFile[]
  batchProcessing: boolean

  // Transcription
  comparisonMode: boolean
  activeTranscriptions: number
  isTranscribing: boolean
  transcriptionResults: Array<{
    backend: string
    model: string
    result: TranscribeResult
  }>

  // Recording
  isRecording: boolean
  recordedAudio: RecordedAudio | null
  currentAudioPlayer: HTMLAudioElement | null

  // Progress
  progress: number
  progressMessage: string
  progressStage?: 'downloading' | 'loading' | 'transcribing'

  // UI State
  showWelcomeScreen: boolean
  showLoadingScreen: boolean
  showResults: boolean

  // Actions
  setBackends: (backends: Record<string, Backend>) => void
  setSelectedBackend: (backend: string | null) => void
  setSelectedModel: (model: string | null) => void
  setSelectedFile: (file: string | null) => void
  setBatchMode: (enabled: boolean) => void
  addBatchFiles: (files: string[]) => void
  removeBatchFile: (index: number) => void
  clearBatchFiles: () => void
  updateBatchFileStatus: (index: number, status: BatchFile['status'], result?: TranscribeResult) => void
  setComparisonMode: (enabled: boolean) => void
  setIsRecording: (recording: boolean) => void
  setRecordedAudio: (audio: RecordedAudio | null) => void
  setCurrentAudioPlayer: (player: HTMLAudioElement | null) => void
  setProgress: (progress: number, message: string, stage?: 'downloading' | 'loading' | 'transcribing') => void
  setIsTranscribing: (transcribing: boolean) => void
  setTranscriptionResults: (results: Array<{ backend: string; model: string; result: TranscribeResult }>) => void
  setUIState: (state: { welcome?: boolean; loading?: boolean; results?: boolean }) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial State
  backends: {},
  selectedBackend: null,
  selectedModel: null,
  selectedFile: null,
  batchMode: false,
  batchFiles: [],
  batchProcessing: false,
  comparisonMode: false,
  activeTranscriptions: 0,
  isTranscribing: false,
  transcriptionResults: [],
  isRecording: false,
  recordedAudio: null,
  currentAudioPlayer: null,
  progress: 0,
  progressMessage: '',
  progressStage: undefined,
  showWelcomeScreen: true,
  showLoadingScreen: false,
  showResults: false,

  // Actions
  setBackends: (backends) => set({ backends }),

  setSelectedBackend: (backend) => set({ selectedBackend: backend }),

  setSelectedModel: (model) => set({ selectedModel: model }),

  setSelectedFile: (file) => set({ selectedFile: file }),

  setBatchMode: (enabled) => set({ batchMode: enabled }),

  addBatchFiles: (files) =>
    set((state) => {
      const existingPaths = new Set(state.batchFiles.map(f => f.path))
      const newFiles = files
        .filter(path => !existingPaths.has(path))
        .map(path => ({
          path,
          name: path.split('/').pop()?.split('\\').pop() || path,
          status: 'pending' as const
        }))

      return {
        batchFiles: [...state.batchFiles, ...newFiles],
        batchMode: true
      }
    }),

  removeBatchFile: (index) =>
    set((state) => ({
      batchFiles: state.batchFiles.filter((_, i) => i !== index),
      batchMode: state.batchFiles.length > 1
    })),

  clearBatchFiles: () => set({ batchFiles: [], batchMode: false }),

  updateBatchFileStatus: (index, status, result) =>
    set((state) => ({
      batchFiles: state.batchFiles.map((file, i) =>
        i === index ? { ...file, status, result } : file
      )
    })),

  setComparisonMode: (enabled) => set({ comparisonMode: enabled }),

  setIsRecording: (recording) => set({ isRecording: recording }),

  setRecordedAudio: (audio) => set({ recordedAudio: audio }),

  setCurrentAudioPlayer: (player) => set({ currentAudioPlayer: player }),

  setProgress: (progress, message, stage) =>
    set({ progress, progressMessage: message, progressStage: stage }),

  setIsTranscribing: (transcribing) => set({ isTranscribing: transcribing }),

  setTranscriptionResults: (results) => set({ transcriptionResults: results }),

  setUIState: (state) =>
    set((current) => ({
      showWelcomeScreen: state.welcome ?? current.showWelcomeScreen,
      showLoadingScreen: state.loading ?? current.showLoadingScreen,
      showResults: state.results ?? current.showResults
    })),

  reset: () =>
    set({
      selectedFile: null,
      batchMode: false,
      batchFiles: [],
      batchProcessing: false,
      comparisonMode: false,
      activeTranscriptions: 0,
      isTranscribing: false,
      transcriptionResults: [],
      isRecording: false,
      recordedAudio: null,
      currentAudioPlayer: null,
      progress: 0,
      progressMessage: '',
      progressStage: undefined,
      showWelcomeScreen: true,
      showLoadingScreen: false,
      showResults: false
    })
}))
