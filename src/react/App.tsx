import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { YStack } from '@odd-design-system/ui-components'
import { OddProvider } from './providers/OddProvider'
import { VAIStudioFeatureScreen } from './features/screen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppToastViewport } from './components/Toast'
import { UpdateBanner } from './components/UpdateBanner'
import { LoadingOverlay } from './components/LoadingScreen'
import { RecordingOverlayConnected } from './components/RecordingControls'
import { DraggableHeader } from './components/DraggableHeader'
import { OnboardingScreen } from './components/OnboardingScreen'
import { LoginScreen } from './components/LoginScreen'
import { useAppStore } from './stores/useAppStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useToastStore } from './stores/useToastStore'
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

  // Get onboarding state
  const { hasCompletedOnboarding, updateSetting } = useSettingsStore()

  // Get toast for auth notifications
  const { showToast } = useToastStore()

  // Track if we should show login (after onboarding, before main app)
  const [showLogin, setShowLogin] = useState(false)

  // Track if user is authenticated (one-time check)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check if user is already authenticated on mount
  // Also check for auth callback in URL (magic link redirect)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!electronBridge.isElectron()) {
          // Not in Electron, skip auth check
          setIsAuthenticated(true)
          setCheckingAuth(false)
          return
        }

        // Check for auth callback in URL hash (magic link redirect)
        const hash = window.location.hash
        if (hash && hash.includes('access_token=')) {
          console.log('[App] Auth callback detected in URL')
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken) {
            // Clear the URL hash
            window.history.replaceState(null, '', window.location.pathname)

            // Use IPC to set session in main process
            try {
              const result = await (window as any).electronAPI?.auth?.setSessionFromTokens?.(accessToken, refreshToken)
              if (result?.success) {
                console.log('[App] Auth from magic link successful')
                showToast('Welcome! You\'re now signed in.', 'success', 3000)
                setIsAuthenticated(true)
                setCheckingAuth(false)
                return
              }
            } catch (e) {
              console.error('[App] Failed to set session from URL tokens:', e)
            }
          }
        }

        // Check for error in URL hash
        if (hash && hash.includes('error=')) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const error = hashParams.get('error_description') || hashParams.get('error')
          console.error('[App] Auth error in URL:', error)
          showToast(`Login failed: ${error}`, 'error', 5000)
          // Clear the URL hash
          window.history.replaceState(null, '', window.location.pathname)
        }

        const result = await electronBridge.auth.isAuthenticated()
        if (result.success && result.isAuthenticated) {
          console.log('[App] User is authenticated:', result.email)
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.warn('[App] Auth check failed:', error)
        setIsAuthenticated(false)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuth()
  }, [showToast])

  // Listen for auth success/error from deep link callback
  useEffect(() => {
    if (!electronBridge.isElectron()) return

    // Listen for successful auth from magic link
    const unsubSuccess = electronBridge.auth.onAuthSuccess((data: { email?: string }) => {
      console.log('[App] Auth success received:', data.email)
      showToast(`Welcome! You're signed in as ${data.email}`, 'success', 3000)
      setIsAuthenticated(true)
      setShowLogin(false)
    })

    // Listen for auth errors
    const unsubError = electronBridge.auth.onAuthError((data: { error?: string }) => {
      console.error('[App] Auth error received:', data.error)
      showToast(`Authentication failed: ${data.error}`, 'error', 5000)
    })

    return () => {
      unsubSuccess()
      unsubError()
    }
  }, [showToast])

  // Handle onboarding completion - show login screen next (if not already authenticated)
  const handleOnboardingComplete = useCallback(() => {
    updateSetting('hasCompletedOnboarding', true)
    // Only show login if not already authenticated
    if (!isAuthenticated) {
      setShowLogin(true)
    }
  }, [updateSetting, isAuthenticated])

  // Handle login success - proceed to main app
  const handleLoginComplete = useCallback(() => {
    setIsAuthenticated(true)
    setShowLogin(false)
  }, [])

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

  // While checking auth status, show nothing (very brief)
  if (checkingAuth) {
    return (
      <OddProvider defaultTheme="vai_dark">
        <YStack flex={1} height="100%" backgroundColor="$background" />
      </OddProvider>
    )
  }

  // Show onboarding for first-time users
  if (!hasCompletedOnboarding) {
    return (
      <OddProvider defaultTheme="vai_dark">
        <ErrorBoundary>
          <YStack flex={1} height="100%" position="relative">
            {/* Draggable Header for Electron */}
            <DraggableHeader />
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          </YStack>
        </ErrorBoundary>
      </OddProvider>
    )
  }

  // Show login screen after onboarding (if not already authenticated)
  if (showLogin && !isAuthenticated) {
    return (
      <OddProvider defaultTheme="vai_dark">
        <ErrorBoundary>
          <YStack flex={1} height="100%" position="relative">
            {/* Draggable Header for Electron */}
            <DraggableHeader />
            <LoginScreen
              onLoginSuccess={handleLoginComplete}
            />
            {/* Toast Viewport */}
            <AppToastViewport />
          </YStack>
        </ErrorBoundary>
      </OddProvider>
    )
  }

  // If completed onboarding but not authenticated, show login
  if (hasCompletedOnboarding && !isAuthenticated) {
    return (
      <OddProvider defaultTheme="vai_dark">
        <ErrorBoundary>
          <YStack flex={1} height="100%" position="relative">
            {/* Draggable Header for Electron */}
            <DraggableHeader />
            <LoginScreen
              onLoginSuccess={handleLoginComplete}
            />
            {/* Toast Viewport */}
            <AppToastViewport />
          </YStack>
        </ErrorBoundary>
      </OddProvider>
    )
  }

  return (
    <OddProvider defaultTheme="vai_dark">
      <ErrorBoundary>
        <YStack flex={1} height="100%" position="relative">
          {/* Draggable Header for Electron */}
          <DraggableHeader />

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
