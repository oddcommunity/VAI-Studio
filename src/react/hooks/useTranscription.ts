/**
 * Transcription Hook
 * Manages transcription operations
 */

import { useCallback } from 'react'
import { transcriptionService } from '@services/transcription.service'
import { useAppStore } from '@stores/useAppStore'
import { useSettingsStore } from '@stores/useSettingsStore'
import { useToastStore } from '@stores/useToastStore'
import type { TranscribeOptions, TranscribeResult } from '../types'

export function useTranscription() {
  const {
    selectedFile,
    comparisonMode,
    batchFiles,
    setIsTranscribing,
    setTranscriptionResults,
    setUIState,
    setProgress,
    updateBatchFileStatus
  } = useAppStore()

  const { devicePreference, quantization, defaultLanguage } = useSettingsStore()
  const { showToast } = useToastStore()

  const transcribe = useCallback(async (
    models: Array<{ backend: string; model: string }>
  ) => {
    if (!selectedFile) {
      showToast('Please select an audio file', 'error')
      return
    }

    if (models.length === 0) {
      showToast('Please select at least one model', 'error')
      return
    }

    setIsTranscribing(true)
    setUIState({ welcome: false, loading: true, results: false })
    setTranscriptionResults([])
    setProgress(0, 'Initializing...')

    const results: Array<{ backend: string; model: string; result: TranscribeResult }> = []

    try {
      for (let i = 0; i < models.length; i++) {
        const { backend, model } = models[i]

        // Update progress for comparison mode
        const progressPerModel = 100 / models.length
        const baseProgress = i * progressPerModel

        setProgress(
          baseProgress,
          models.length > 1
            ? `Model ${i + 1}/${models.length}: Starting...`
            : 'Starting transcription...'
        )

        const options: TranscribeOptions = {
          audioPath: selectedFile,
          backend,
          modelName: model,
          task: backend === 'voxtral' ? 'transcribe' : undefined,
          language: defaultLanguage !== 'auto' ? defaultLanguage : undefined,
          device: devicePreference,
          quantization
        }

        const result = await transcriptionService.transcribe(options)
        results.push({ backend, model, result })

        if (!result.success) {
          showToast(`${backend}/${model} failed: ${result.error}`, 'error', 5000)
        }
      }

      setTranscriptionResults(results)
      setUIState({ loading: false, results: true })

      const successCount = results.filter(r => r.result.success).length
      if (successCount === results.length) {
        showToast('Transcription complete!', 'success')
      } else if (successCount > 0) {
        showToast(`${successCount}/${results.length} models succeeded`, 'warning', 5000)
      } else {
        showToast('All transcriptions failed', 'error', 5000)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed'
      showToast(message, 'error', 5000)
      setUIState({ loading: false, results: false, welcome: true })
    } finally {
      setIsTranscribing(false)
      setProgress(100, 'Complete')
    }
  }, [
    selectedFile,
    devicePreference,
    quantization,
    defaultLanguage,
    setIsTranscribing,
    setTranscriptionResults,
    setUIState,
    setProgress,
    showToast
  ])

  const transcribeBatch = useCallback(async (
    backend: string,
    model: string
  ) => {
    if (batchFiles.length === 0) {
      showToast('No files in batch queue', 'error')
      return
    }

    setIsTranscribing(true)
    setUIState({ welcome: false, loading: true, results: false })

    try {
      const total = batchFiles.length
      let completed = 0

      for (let i = 0; i < batchFiles.length; i++) {
        const file = batchFiles[i]

        updateBatchFileStatus(i, 'processing')
        setProgress(
          (i / total) * 100,
          `Processing ${file.name} (${i + 1}/${total})...`
        )

        const options: TranscribeOptions = {
          audioPath: file.path,
          backend,
          modelName: model,
          task: backend === 'voxtral' ? 'transcribe' : undefined,
          language: defaultLanguage !== 'auto' ? defaultLanguage : undefined,
          device: devicePreference,
          quantization
        }

        try {
          const result = await transcriptionService.transcribe(options)

          if (result.success) {
            updateBatchFileStatus(i, 'completed', result)
            completed++
          } else {
            updateBatchFileStatus(i, 'failed', result)
          }
        } catch (err) {
          updateBatchFileStatus(i, 'failed', {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      setUIState({ loading: false, results: true })
      showToast(
        `Batch complete: ${completed}/${total} successful`,
        completed === total ? 'success' : 'warning',
        5000
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch transcription failed'
      showToast(message, 'error', 5000)
      setUIState({ loading: false, results: false, welcome: true })
    } finally {
      setIsTranscribing(false)
    }
  }, [
    batchFiles,
    devicePreference,
    quantization,
    defaultLanguage,
    setIsTranscribing,
    setUIState,
    setProgress,
    updateBatchFileStatus,
    showToast
  ])

  const exportResult = useCallback(async (
    result: any,
    backend: string,
    model: string,
    format: 'txt' | 'json' | 'srt' | 'vtt'
  ) => {
    try {
      const defaultName = `transcription_${backend}_${model}_${Date.now()}`
      const exportResult = await transcriptionService.exportResult(result, format, defaultName)

      if (exportResult.success) {
        showToast('Exported successfully!', 'success')
      } else {
        showToast(exportResult.error || 'Export failed', 'error')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      showToast(message, 'error')
    }
  }, [showToast])

  return {
    transcribe,
    transcribeBatch,
    exportResult
  }
}
