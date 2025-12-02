import React, { useState, useCallback, useEffect } from 'react'
import { TamaguiProvider, Theme, YStack } from 'tamagui'
import { VAIStudioFeatureScreen } from './features/screen'
import { config } from './tamagui.config'
import { ToastProvider } from './components/Toast'
import { UpdateBanner } from './components/UpdateBanner'
import { SettingsModal } from './components/SettingsModal'
import { ModelManagerModal } from './components/ModelManagerModal'
import { AuthModal } from './components/AuthModal'
import { LoadingOverlay } from './components/LoadingScreen'
import { RecordingOverlayConnected } from './components/RecordingControls'
import { useAppStore } from './stores/useAppStore'
import { electronBridge } from './services/electron.bridge'

export function App() {
  // Modal states
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelManagerOpen, setModelManagerOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  // Get loading state from store
  const { showLoadingScreen, isTranscribing, progress, progressMessage, progressStage, setProgress } = useAppStore()

  // Set up progress listener
  useEffect(() => {
    const cleanup = electronBridge.onProgress((data) => {
      setProgress(
        data.progress,
        data.message,
        data.stage as 'downloading' | 'loading' | 'transcribing' | undefined
      )
    })

    return cleanup
  }, [setProgress])

  // Modal handlers
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), [])
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), [])

  const handleOpenModelManager = useCallback(() => setModelManagerOpen(true), [])
  const handleCloseModelManager = useCallback(() => setModelManagerOpen(false), [])

  const handleOpenAuth = useCallback(() => setAuthOpen(true), [])
  const handleCloseAuth = useCallback(() => setAuthOpen(false), [])

  return (
    <TamaguiProvider config={config}>
      <Theme name="vai_dark">
        <YStack flex={1} position="relative">
          {/* Update Banner */}
          <UpdateBanner />

          {/* Main Screen */}
          <VAIStudioFeatureScreen
            onAdvancedSettings={handleOpenSettings}
            onManageModels={handleOpenModelManager}
          />

          {/* Toast Notifications */}
          <ToastProvider />

          {/* Loading Overlay */}
          <LoadingOverlay
            visible={showLoadingScreen || isTranscribing}
            progress={progress}
            message={progressMessage}
            stage={progressStage}
          />

          {/* Recording Overlay */}
          <RecordingOverlayConnected />

          {/* Modals */}
          <SettingsModal open={settingsOpen} onClose={handleCloseSettings} />
          <ModelManagerModal open={modelManagerOpen} onClose={handleCloseModelManager} />
          <AuthModal open={authOpen} onClose={handleCloseAuth} />
        </YStack>
      </Theme>
    </TamaguiProvider>
  )
}

export default App
