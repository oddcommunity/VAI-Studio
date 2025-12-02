import { useCallback, useEffect, useMemo } from 'react'
import { Theme } from 'tamagui'
import { VAIStudioScreen } from '../components/VAIStudio'
import { ResultsPanel } from '../components/ResultsPanel'
import { WelcomeScreen } from '../components/WelcomeScreen'
import { useAppStore } from '../stores/useAppStore'
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
    addBatchFiles,
    transcriptionResults,
    setTranscriptionResults,
    setUIState,
    setProgress,
  } = useAppStore()

  const { showToast } = useToastStore()

  // Load backends on mount
  useEffect(() => {
    loadBackends()
  }, [])

  const loadBackends = async () => {
    try {
      const backendsData = await modelService.listBackends()
      setBackends(backendsData)
    } catch (error) {
      showToast('Failed to load backends', 'error', 5000)
      console.error('Failed to load backends:', error)
    }
  }

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

  // Transcription handler
  const handleTranscribe = useCallback(async () => {
    if (!selectedFile) {
      showToast('Please select an audio file first', 'warning', 3000)
      return
    }

    if (!selectedModel) {
      showToast('Please select a model first', 'warning', 3000)
      return
    }

    setIsTranscribing(true)
    setUIState({ loading: true, welcome: false })
    setProgress(0, 'Starting transcription...', 'transcribing')

    try {
      const { backend, model } = JSON.parse(selectedModel)

      const result = await transcriptionService.transcribe({
        audioPath: selectedFile,
        backend,
        modelName: model,
      })

      if (result.success) {
        // Add result to the results array
        const newResult: TranscriptionResultItem = {
          backend,
          model,
          result,
        }

        setTranscriptionResults([...transcriptionResults, newResult])
        setUIState({ results: true, loading: false })
        showToast('Transcription complete!', 'success', 3000)
      } else {
        showToast(result.error || 'Transcription failed', 'error', 5000)
        setUIState({ loading: false })
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
    setIsTranscribing,
    setUIState,
    setProgress,
    transcriptionResults,
    setTranscriptionResults,
    showToast,
  ])

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
    <Theme name="vai_dark">
      <VAIStudioScreen
        models={models}
        selectedModel={selectedModel}
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
    </Theme>
  )
}
