/**
 * Audio Service
 * Handles audio file selection, recording, and playback
 */

import { electronBridge } from './electron.bridge'
import { sanitizeFilePathForUrl, isValidFilePath } from '../utils/sanitize'

export class AudioService {
  private audioRecorder: MediaRecorder | null = null
  private recordingChunks: Blob[] = []
  private recordingStartTime: number = 0
  private timerInterval: NodeJS.Timeout | null = null

  /**
   * Select a single audio file
   */
  async selectAudioFile() {
    return electronBridge.selectAudioFile()
  }

  /**
   * Select multiple audio files
   */
  async selectMultipleAudioFiles() {
    return electronBridge.selectMultipleAudioFiles()
  }

  /**
   * Select from recorded audio files
   */
  async selectFromRecordings() {
    return electronBridge.selectFromRecordings()
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath: string) {
    return electronBridge.getFileInfo(filePath)
  }

  /**
   * Show file in system folder
   */
  showItemInFolder(filePath: string) {
    electronBridge.showItemInFolder(filePath)
  }

  /**
   * Check if audio recording is supported
   */
  isRecordingSupported(): boolean {
    return typeof navigator !== 'undefined' &&
           typeof navigator.mediaDevices !== 'undefined' &&
           typeof MediaRecorder !== 'undefined'
  }

  /**
   * Start audio recording
   */
  async startRecording(onTimeUpdate?: (seconds: number) => void): Promise<void> {
    if (!this.isRecordingSupported()) {
      throw new Error('Audio recording is not supported in this browser')
    }

    let stream: MediaStream | null = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Determine supported MIME type
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      }

      this.audioRecorder = new MediaRecorder(stream, { mimeType })
      this.recordingChunks = []
      this.recordingStartTime = Date.now()

      this.audioRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordingChunks.push(e.data)
        }
      }

      this.audioRecorder.start()

      // Start timer
      if (onTimeUpdate) {
        this.timerInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000)
          onTimeUpdate(elapsed)
        }, 1000)
      }
    } catch (error) {
      // Clean up stream if it was acquired but subsequent operations failed
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      console.error('[AudioService] Recording error:', error)
      throw new Error('Failed to start recording: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Stop audio recording
   */
  async stopRecording(): Promise<{ blob: Blob; mimeType: string; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.audioRecorder) {
        reject(new Error('No active recording'))
        return
      }

      // Store values before cleanup to avoid accessing after null assignment
      const mimeType = this.audioRecorder.mimeType
      const stream = this.audioRecorder.stream

      this.audioRecorder.onstop = () => {
        const blob = new Blob(this.recordingChunks, { type: mimeType })
        const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000)

        // Clean up timer
        if (this.timerInterval) {
          clearInterval(this.timerInterval)
          this.timerInterval = null
        }

        // Stop all tracks
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }

        resolve({
          blob,
          mimeType,
          duration
        })

        this.audioRecorder = null
        this.recordingChunks = []
      }

      this.audioRecorder.stop()
    })
  }

  /**
   * Save recording to disk
   */
  async saveRecording(blob: Blob, mimeType: string, duration: number) {
    // Convert blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer()

    return electronBridge.saveRecording({
      blob: arrayBuffer,
      mimeType,
      duration
    })
  }

  /**
   * Create audio element for playback
   */
  createAudioPlayer(filePath: string): HTMLAudioElement {
    if (!isValidFilePath(filePath)) {
      throw new Error('Invalid file path')
    }
    const audio = new Audio()
    // Encode the path to handle special characters safely
    audio.src = `file://${sanitizeFilePathForUrl(filePath)}`
    return audio
  }

  /**
   * Format duration in seconds to MM:SS
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }
}

// Export singleton instance
export const audioService = new AudioService()
