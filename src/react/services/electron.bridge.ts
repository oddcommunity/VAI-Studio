/**
 * Electron IPC Bridge
 * Type-safe wrapper for window.electronAPI calls
 */

import type { ElectronAPI } from '@types/index'

class ElectronBridge {
  private api: ElectronAPI | null = null

  constructor() {
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.api = window.electronAPI
    } else {
      console.warn('ElectronAPI not available - running in non-Electron environment')
    }
  }

  private ensureAPI(): ElectronAPI {
    if (!this.api) {
      throw new Error('ElectronAPI is not available. Are you running in Electron?')
    }
    return this.api
  }

  // Check if running in Electron
  isElectron(): boolean {
    return this.api !== null
  }

  // File Operations
  async selectAudioFile() {
    return this.ensureAPI().selectAudioFile()
  }

  async selectMultipleAudioFiles() {
    return this.ensureAPI().selectMultipleAudioFiles()
  }

  async selectFromRecordings() {
    return this.ensureAPI().selectFromRecordings()
  }

  async getFileInfo(filePath: string) {
    return this.ensureAPI().getFileInfo(filePath)
  }

  showItemInFolder(filePath: string) {
    return this.ensureAPI().showItemInFolder(filePath)
  }

  async saveRecording(data: { blob: ArrayBuffer; mimeType: string; duration: number }) {
    return this.ensureAPI().saveRecording(data)
  }

  // Transcription
  async listBackends() {
    return this.ensureAPI().listBackends()
  }

  async transcribe(options: {
    audioPath: string
    backend: string
    modelName: string
    task?: 'transcribe' | 'translate'
    language?: string
    device?: 'auto' | 'cpu' | 'cuda'
    quantization?: 'auto' | 'fp32' | 'fp16' | 'int8'
  }) {
    return this.ensureAPI().transcribe(options)
  }

  async downloadModel(backend: string, modelName: string) {
    return this.ensureAPI().downloadModel(backend, modelName)
  }

  async exportResult(result: any, format: string, filePath: string) {
    return this.ensureAPI().exportResult(result, format, filePath)
  }

  async saveDialog(defaultName: string, filters: any[]) {
    return this.ensureAPI().saveDialog(defaultName, filters)
  }

  // HuggingFace Auth
  async getHFToken() {
    return this.ensureAPI().getHFToken()
  }

  async saveHFToken(token: string) {
    return this.ensureAPI().saveHFToken(token)
  }

  async testHFToken(token: string) {
    return this.ensureAPI().testHFToken(token)
  }

  async clearHFToken() {
    return this.ensureAPI().clearHFToken()
  }

  async openHFTokenPage() {
    return this.ensureAPI().openHFTokenPage()
  }

  // Supabase Auth
  get auth() {
    return this.ensureAPI().auth
  }

  // App Updates
  onUpdateReady(callback: (updateInfo: { version: string }) => void) {
    return this.ensureAPI().onUpdateReady(callback)
  }

  restartToUpdate() {
    return this.ensureAPI().restartToUpdate()
  }

  // Progress Events
  onProgress(callback: (data: { progress: number; message: string; stage?: string }) => void) {
    return this.ensureAPI().onProgress(callback)
  }

  // External Links
  async openExternal(url: string) {
    return this.ensureAPI().openExternal(url)
  }

  async openLicenseFile() {
    return this.ensureAPI().openLicenseFile()
  }
}

// Export singleton instance
export const electronBridge = new ElectronBridge()
