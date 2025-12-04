import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { YStack } from 'tamagui'
import { OddProvider } from '@odd-design-system/ui-components'
import { VAIStudioFeatureScreen } from './features/screen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppToastViewport } from './components/Toast'
import { UpdateBanner } from './components/UpdateBanner'
import { LoadingOverlay } from './components/LoadingScreen'
import { RecordingOverlayConnected } from './components/RecordingControls'
import { useAppStore } from './stores/useAppStore'
import { electronBridge } from './services/electron.bridge'

// Lazy load modals for better initial bundle size
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })))
const ModelManagerModal = lazy(() => import('./components/ModelManagerModal').then(m => ({ default: m.ModelManagerModal })))
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })))

export function App() {
  // Modal states
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelManagerOpen, setModelManagerOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  // Get loading state from store
  const { showLoadingScreen, isTranscribing, progress, progressMessage, progressStage, setProgress } = useAppStore()

  // Set up progress listener - empty deps since setProgress is stable from Zustand
  useEffect(() => {
    let cleanup: (() => void) | undefined

    try {
      cleanup = electronBridge.onProgress((data) => {
        // Validate stage type before passing
        const validStages = ['downloading', 'loading', 'transcribing'] as const
        const stage = validStages.includes(data.stage as typeof validStages[number])
          ? (data.stage as 'downloading' | 'loading' | 'transcribing')
          : undefined
        setProgress(data.progress, data.message, stage)
      })
    } catch (error) {
      // electronBridge may not be available in non-Electron environments
      console.warn('[App] Failed to set up progress listener:', error)
    }

    return () => {
      if (cleanup) cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Modal handlers
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), [])
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), [])

  const handleOpenModelManager = useCallback(() => setModelManagerOpen(true), [])
  const handleCloseModelManager = useCallback(() => setModelManagerOpen(false), [])

  const handleCloseAuth = useCallback(() => setAuthOpen(false), [])
  // Note: Auth modal can be opened from settings via handleOpenAuth if needed
  // const handleOpenAuth = useCallback(() => setAuthOpen(true), [])

  return (
    <OddProvider defaultTheme="vai_dark">
      <ErrorBoundary>
        <YStack flex={1} position="relative">
          {/* Update Banner */}
          <UpdateBanner />

          {/* Main Screen */}
          <VAIStudioFeatureScreen
            onAdvancedSettings={handleOpenSettings}
            onManageModels={handleOpenModelManager}
          />

          {/* Toast Viewport - OddProvider includes ToastProvider */}
          <AppToastViewport />

          {/* Loading Overlay */}
          <LoadingOverlay
            visible={showLoadingScreen || isTranscribing}
            progress={progress}
            message={progressMessage}
            stage={progressStage}
          />

          {/* Recording Overlay */}
          <RecordingOverlayConnected />

          {/* Modals - Lazy loaded */}
          <Suspense fallback={null}>
            {settingsOpen && <SettingsModal open={settingsOpen} onClose={handleCloseSettings} />}
          </Suspense>
          <Suspense fallback={null}>
            {modelManagerOpen && <ModelManagerModal open={modelManagerOpen} onClose={handleCloseModelManager} />}
          </Suspense>
          <Suspense fallback={null}>
            {authOpen && <AuthModal open={authOpen} onClose={handleCloseAuth} />}
          </Suspense>
        </YStack>
      </ErrorBoundary>
    </OddProvider>
  )
}

export default App
