import { useCallback, useEffect, useMemo, useState } from 'react'
import { Theme } from 'tamagui'
import { VAIStudioScreen, WelcomeScreen } from '../components/VAIStudio'
import { ResultsPanel } from '../components/ResultsPanel'
import { useAppStore } from '../stores/useAppStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useToastStore } from '../stores/useToastStore'
import { audioService } from '../services/audio.service'
import { transcriptionService } from '../services/transcription.service'
import { modelService } from '../services/model.service'
import { electronBridge } from '../services/electron.bridge'
import type { TranscriptionResultItem } from '../components/ResultsPanel'

interface VAIStudioFeatureScreenProps {
  onAdvancedSettings?: () => void
  onManageModels?: () => void
}

export function VAIStudioFeatureScreen({
  onAdvancedSettings,
  onManageModels,
}: VAIStudioFeatureScreenProps) {
  // Global state
  const {
    backends,
    setBackends,
    selectedFile,
    setSelectedFile,
    selectedModel,
    setSelectedModel,
    comparisonMode,
    setComparisonMode,
    isTranscribing,
    setIsTranscribing,
    isRecording,
    setIsRecording,
    batchFiles,
    addBatchFiles,
    removeBatchFile,
    clearBatchFiles,
    updateBatchFileStatus,
    transcriptionResults,
    setTranscriptionResults,
    setUIState,
    setProgress,
  } = useAppStore()

  // Settings for transcription
  const {
    devicePreference,
    quantization,
    defaultLanguage,
  } = useSettingsStore()

  const { showToast } = useToastStore()

  // Comparison mode: track multiple selected models
  const [comparisonModels, setComparisonModels] = useState<string[]>([])

  // Load backends on mount
  const loadBackends = useCallback(async () => {
    try {
      const backendsData = await modelService.listBackends()
      setBackends(backendsData)
    } catch (error) {
      showToast('Failed to load backends', 'error', 5000)
      console.error('Failed to load backends:', error)
    }
  }, [setBackends, showToast])

  useEffect(() => {
    loadBackends()
  }, [loadBackends])

  // Convert backends to model list for UI
  const models = useMemo(() => {
    const modelList: { id: string; name: string }[] = []
    Object.entries(backends).forEach(([backendName, backend]) => {
      if (backend.available) {
        backend.models.forEach((model) => {
          modelList.push({
            id: JSON.stringify({ backend: backendName, model: model.name }),
            name: `${model.name} (${backendName}) - ${model.size}`,
          })
        })
      }
    })
    return modelList
  }, [backends])

  // File selection handler
  const handleSelectFile = useCallback(async () => {
    try {
      const result = await audioService.selectAudioFile()
      if (result.success && !result.canceled && result.filePath) {
        setSelectedFile(result.filePath)
        showToast('File selected', 'success', 2000)
      }
    } catch (error) {
      showToast('Failed to select file', 'error', 3000)
      console.error('File selection error:', error)
    }
  }, [setSelectedFile, showToast])

  // Multiple file selection handler
  const handleAddMultipleFiles = useCallback(async () => {
    try {
      const result = await audioService.selectMultipleAudioFiles()
      if (result.success && !result.canceled && result.filePaths) {
        addBatchFiles(result.filePaths)
        showToast(`Added ${result.filePaths.length} files to batch`, 'success', 2000)
      }
    } catch (error) {
      showToast('Failed to select files', 'error', 3000)
      console.error('Multiple file selection error:', error)
    }
  }, [addBatchFiles, showToast])

  // Audio recording handler
  const handleRecordAudio = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      try {
        setIsRecording(false)
        showToast('Recording stopped', 'success', 2000)
      } catch (error) {
        showToast('Failed to stop recording', 'error', 3000)
      }
    } else {
      // Start recording
      try {
        setIsRecording(true)
        showToast('Recording started', 'info', 2000)
      } catch (error) {
        setIsRecording(false)
        showToast('Failed to start recording', 'error', 3000)
      }
    }
  }, [isRecording, setIsRecording, showToast])

  // Helper to transcribe a single file with a single model
  const transcribeSingleFile = useCallback(
    async (
      audioPath: string,
      backend: string,
      modelName: string
    ): Promise<TranscriptionResultItem> => {
      const result = await transcriptionService.transcribe({
        audioPath,
        backend,
        modelName,
        language: defaultLanguage !== 'auto' ? defaultLanguage : undefined,
        device: devicePreference !== 'auto' ? devicePreference : undefined,
        quantization: quantization !== 'auto' ? quantization : undefined,
      })

      return { backend, model: modelName, result }
    },
    [defaultLanguage, devicePreference, quantization]
  )

  // Transcription handler - supports single file, batch, and comparison modes
  const handleTranscribe = useCallback(async () => {
    // Determine which files to process
    const filesToProcess = batchFiles.length > 0
      ? batchFiles.map((f) => f.path)
      : selectedFile
        ? [selectedFile]
        : []

    if (filesToProcess.length === 0) {
      showToast('Please select an audio file first', 'warning', 3000)
      return
    }

    // Determine which models to use
    const modelsToUse = comparisonMode && comparisonModels.length > 0
      ? comparisonModels
      : selectedModel
        ? [selectedModel]
        : []

    if (modelsToUse.length === 0) {
      showToast('Please select a model first', 'warning', 3000)
      return
    }

    setIsTranscribing(true)
    setUIState({ loading: true, welcome: false })
    setProgress(0, 'Starting transcription...', 'transcribing')

    const allResults: TranscriptionResultItem[] = []
    const totalOperations = filesToProcess.length * modelsToUse.length
    let completedOperations = 0

    try {
      // Process each file
      for (let fileIndex = 0; fileIndex < filesToProcess.length; fileIndex++) {
        const audioPath = filesToProcess[fileIndex]
        if (!audioPath) continue

        const fileName = audioPath.split('/').pop()?.split('\\').pop() || audioPath

        // Update batch file status if in batch mode
        if (batchFiles.length > 0) {
          updateBatchFileStatus(fileIndex, 'processing')
        }

        // Process each model for this file
        for (const modelJson of modelsToUse) {
          // Parse model JSON once at the start
          let parsedModel: { backend: string; model: string }
          try {
            parsedModel = JSON.parse(modelJson)
          } catch {
            // Invalid JSON, skip this model
            completedOperations++
            continue
          }

          const { backend, model } = parsedModel

          try {
            setProgress(
              Math.round((completedOperations / totalOperations) * 100),
              `Transcribing ${fileName} with ${model}...`,
              'transcribing'
            )

            const resultItem = await transcribeSingleFile(audioPath, backend, model)
            allResults.push(resultItem)

            completedOperations++
            setProgress(
              Math.round((completedOperations / totalOperations) * 100),
              `Completed ${completedOperations}/${totalOperations}`,
              'transcribing'
            )
          } catch (error) {
            allResults.push({
              backend,
              model,
              result: {
                success: false,
                error: error instanceof Error ? error.message : 'Transcription failed',
              },
            })
            completedOperations++
          }
        }

        // Update batch file status to completed
        if (batchFiles.length > 0) {
          const fileResults = allResults.filter(
            (r) => r.result.success
          )
          updateBatchFileStatus(
            fileIndex,
            fileResults.length > 0 ? 'completed' : 'failed',
            fileResults[0]?.result
          )
        }
      }

      // Update results using functional update to avoid stale state
      setTranscriptionResults(prev => [...prev, ...allResults])
      setUIState({ results: true, loading: false })

      const successCount = allResults.filter((r) => r.result.success).length
      if (successCount === allResults.length) {
        showToast(`Transcription complete! (${successCount} result${successCount > 1 ? 's' : ''})`, 'success', 3000)
      } else {
        showToast(
          `Completed with ${successCount}/${allResults.length} successful`,
          successCount > 0 ? 'warning' : 'error',
          5000
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed'
      showToast(message, 'error', 5000)
      console.error('Transcription error:', error)
      setUIState({ loading: false })
    } finally {
      setIsTranscribing(false)
      setProgress(0, '', undefined)
    }
  }, [
    selectedFile,
    selectedModel,
    batchFiles,
    comparisonMode,
    comparisonModels,
    setIsTranscribing,
    setUIState,
    setProgress,
    setTranscriptionResults,
    updateBatchFileStatus,
    transcribeSingleFile,
    showToast,
  ])

  // Clear comparison models when comparison mode is disabled
  useEffect(() => {
    if (!comparisonMode) {
      setComparisonModels([])
    }
  }, [comparisonMode])

  // Clear results handler
  const handleClearResults = useCallback(() => {
    setTranscriptionResults([])
    setUIState({ welcome: true, results: false })
    showToast('Results cleared', 'info', 2000)
  }, [setTranscriptionResults, setUIState, showToast])

  // Export result handler
  const handleExportResult = useCallback(
    async (result: TranscriptionResultItem, format: 'txt' | 'json' | 'srt' | 'vtt') => {
      try {
        const defaultName = `transcription_${result.model}.${format}`
        const dialogResult = await electronBridge.saveDialog(defaultName, [
          { name: format.toUpperCase(), extensions: [format] },
        ])

        if (dialogResult.success && !dialogResult.canceled && dialogResult.filePath) {
          await electronBridge.exportResult(result.result, format, dialogResult.filePath)
          showToast(`Exported to ${format.toUpperCase()}`, 'success', 2000)
        }
      } catch (error) {
        showToast('Failed to export', 'error', 3000)
        console.error('Export error:', error)
      }
    },
    [showToast]
  )

  // Settings handler
  const handleAdvancedSettings = useCallback(() => {
    onAdvancedSettings?.()
  }, [onAdvancedSettings])

  // Model manager handler
  const handleManageModels = useCallback(() => {
    onManageModels?.()
  }, [onManageModels])

  // Determine what to show in the main content area
  const hasResults = transcriptionResults.length > 0

  return (
    <VAIStudioScreen
        models={models}
        selectedModel={selectedModel ?? undefined}
        onModelChange={setSelectedModel}
        onSelectFile={handleSelectFile}
        onRecordAudio={handleRecordAudio}
        onAddMultipleFiles={handleAddMultipleFiles}
        onTranscribe={handleTranscribe}
        onAdvancedSettings={handleAdvancedSettings}
        onManageModels={handleManageModels}
        compareMode={comparisonMode}
        onCompareModeChange={setComparisonMode}
        isTranscribing={isTranscribing}
        version="v3.0.1"
        releaseDate="Nov 26, 2025"
      >
        {hasResults ? (
          <ResultsPanel
            results={transcriptionResults}
            comparisonMode={comparisonMode}
            onClearResults={handleClearResults}
            onExport={handleExportResult}
            selectedFile={selectedFile ?? undefined}
          />
        ) : (
          <WelcomeScreen version="v3.0.1" releaseDate="Nov 26, 2025" />
        )}
      </VAIStudioScreen>
  )
}
