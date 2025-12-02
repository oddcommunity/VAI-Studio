/**
 * Transcription Service
 * Handles single and batch transcription operations
 */

import { electronBridge } from './electron.bridge'
import type { TranscribeOptions, TranscribeResult } from '../types'

export class TranscriptionService {
  /**
   * Transcribe a single audio file
   */
  async transcribe(options: TranscribeOptions): Promise<TranscribeResult> {
    try {
      const result = await electronBridge.transcribe({
        audioPath: options.audioPath,
        backend: options.backend,
        modelName: options.modelName,
        task: options.backend === 'voxtral' ? 'transcribe' : options.task,
        language: options.language,
        device: options.device,
        quantization: options.quantization
      })

      return result
    } catch (error) {
      console.error('[TranscriptionService] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transcription error'
      }
    }
  }

  /**
   * Transcribe multiple audio files in sequence
   */
  async transcribeBatch(
    files: string[],
    options: Omit<TranscribeOptions, 'audioPath'>
  ): Promise<TranscribeResult[]> {
    const results: TranscribeResult[] = []

    for (const filePath of files) {
      try {
        const result = await this.transcribe({
          ...options,
          audioPath: filePath
        })
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Export transcription result to file
   */
  async exportResult(result: any, format: 'txt' | 'json' | 'srt' | 'vtt', defaultName: string) {
    try {
      const filters = [
        { name: 'Plain Text', extensions: ['txt'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'SRT Subtitles', extensions: ['srt'] },
        { name: 'WebVTT Subtitles', extensions: ['vtt'] }
      ]

      const saveResult = await electronBridge.saveDialog(
        `${defaultName}.${format}`,
        [filters.find(f => f.extensions[0] === format)!]
      )

      if (saveResult.success && !saveResult.canceled && saveResult.filePath) {
        const exportResult = await electronBridge.exportResult(result, format, saveResult.filePath)
        return exportResult
      }

      return { success: false, error: 'Save dialog canceled' }
    } catch (error) {
      console.error('[TranscriptionService] Export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService()
