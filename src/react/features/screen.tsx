import React, { useCallback, useEffect, useMemo } from 'react'
import { Theme } from 'tamagui'
import { VAIStudioScreen } from '../components/VAIStudio'
import { useAppStore } from '../stores/useAppStore'
import { useToastStore } from '../stores/useToastStore'
import { audioService } from '../services/audio.service'
import { transcriptionService } from '../services/transcription.service'
import { modelService } from '../services/model.service'

export function VAIStudioFeatureScreen() {
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
        // Recording stop logic would go here
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
        // Recording start logic would go here
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

    try {
      const { backend, model } = JSON.parse(selectedModel)

      const result = await transcriptionService.transcribe({
        audioPath: selectedFile,
        backend,
        modelName: model,
      })

      if (result.success) {
        showToast('Transcription complete!', 'success', 3000)
        console.log('Transcription result:', result)
        // TODO: Display result in main content area
      } else {
        showToast(result.error || 'Transcription failed', 'error', 5000)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed'
      showToast(message, 'error', 5000)
      console.error('Transcription error:', error)
    } finally {
      setIsTranscribing(false)
    }
  }, [selectedFile, selectedModel, setIsTranscribing, showToast])

  // Settings handler
  const handleAdvancedSettings = useCallback(() => {
    // TODO: Open settings modal
    console.log('Advanced settings pressed')
    showToast('Settings coming soon', 'info', 2000)
  }, [showToast])

  // Model manager handler
  const handleManageModels = useCallback(() => {
    // TODO: Open model manager modal
    console.log('Manage models pressed')
    showToast('Model manager coming soon', 'info', 2000)
  }, [showToast])

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
      />
    </Theme>
  )
}
