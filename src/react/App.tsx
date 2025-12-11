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
import { webProfileCache, type CachedProfile } from '@odd-core/storage/web-only'

// Lazy load modals for better initial bundle size
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })))
const ModelManagerModal = lazy(() => import('./components/ModelManagerModal').then(m => ({ default: m.ModelManagerModal })))
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })))

/**
 * Get initials from email or name for avatar fallback
 */
function getInitials(email?: string, name?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    const localPart = email.split('@')[0]
    return localPart.slice(0, 2).toUpperCase()
  }
  return '?'
}

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

  // User ID for profile caching (set after auth check)
  const [userId, setUserId] = useState<string | undefined>(undefined)

  // Initialize profile state from odd-core cache for instant display
  // Note: We can't get userId until auth check, so we defer cache lookup to useEffect
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>(undefined)
  const [userPhone, setUserPhone] = useState<string | undefined>(undefined)

  // Helper to preload an image (returns promise that resolves when loaded)
  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => resolve()
      img.onerror = () => resolve() // Resolve even on error to not block UI
      img.src = url
      // Timeout after 2 seconds to not block UI for too long
      setTimeout(() => resolve(), 2000)
    })
  }, [])

  // Check if user is already authenticated on mount
  // Also check for auth callback in URL (magic link redirect)
  // Fetches profile + preloads avatar BEFORE showing UI
  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
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
        if (result.success && result.isAuthenticated && result.userId) {
          console.log('[App] User is authenticated:', result.email)
          setIsAuthenticated(true)
          setUserId(result.userId)
          setUserEmail(result.email)

          // Try to load from cache first for instant display
          const cachedProfile = webProfileCache.get(result.userId) as CachedProfile | null
          if (cachedProfile) {
            console.log('[App] Using cached profile:', cachedProfile.displayName)
            setUserEmail(cachedProfile.email)
            setUserName(cachedProfile.displayName || undefined)
            setUserAvatarUrl(cachedProfile.avatarUrl || undefined)

            // Preload cached avatar while fetching fresh profile
            if (cachedProfile.avatarUrl) {
              preloadImage(cachedProfile.avatarUrl)
            }
          }

          // Fetch fresh profile AND preload avatar before showing UI
          try {
            const profileResult = await electronBridge.auth.getProfile()
            if (profileResult.success && profileResult.profile) {
              console.log('[App] Profile loaded during init:', profileResult.profile.displayName)

              // Update state
              setUserEmail(profileResult.profile.email)
              setUserName(profileResult.profile.displayName || undefined)
              setUserAvatarUrl(profileResult.profile.avatarUrl || undefined)
              setUserPhone(profileResult.profile.phone || undefined)

              // Cache using odd-core webProfileCache
              webProfileCache.set({
                userId: result.userId,
                email: profileResult.profile.email,
                displayName: profileResult.profile.displayName || null,
                avatarUrl: profileResult.profile.avatarUrl || null,
                initials: getInitials(profileResult.profile.email, profileResult.profile.displayName),
                cachedAt: Date.now(),
              })

              // Preload avatar image before showing UI
              if (profileResult.profile.avatarUrl) {
                await preloadImage(profileResult.profile.avatarUrl)
              }
            }
          } catch (profileError) {
            console.warn('[App] Failed to fetch profile during init:', profileError)
            // Continue anyway - we have cached data from odd-core cache
          }
        } else {
          setIsAuthenticated(false)
          setUserId(undefined)
          setUserEmail(undefined)
        }
      } catch (error) {
        console.warn('[App] Auth check failed:', error)
        setIsAuthenticated(false)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuthAndLoadProfile()
  }, [showToast, preloadImage])

  // Listen for auth success/error from deep link callback
  useEffect(() => {
    if (!electronBridge.isElectron()) return

    // Listen for successful auth from magic link
    const unsubSuccess = electronBridge.auth.onAuthSuccess((data: { email?: string }) => {
      console.log('[App] Auth success received:', data.email)
      showToast(`Welcome! You're signed in as ${data.email}`, 'success', 3000)
      setIsAuthenticated(true)
      setUserEmail(data.email)
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

  // Fetch user profile data from Supabase and cache for instant display on refresh
  const fetchProfile = useCallback(async () => {
    if (!electronBridge.isElectron()) return

    try {
      const result = await electronBridge.auth.getProfile()
      if (result.success && result.profile) {
        console.log('[App] Profile loaded:', result.profile.email, result.profile.displayName)

        // Update state
        setUserEmail(result.profile.email)
        setUserName(result.profile.displayName || undefined)
        setUserAvatarUrl(result.profile.avatarUrl || undefined)
        setUserPhone(result.profile.phone || undefined)

        // Cache using odd-core webProfileCache (only if we have userId)
        if (userId) {
          webProfileCache.set({
            userId,
            email: result.profile.email,
            displayName: result.profile.displayName || null,
            avatarUrl: result.profile.avatarUrl || null,
            initials: getInitials(result.profile.email, result.profile.displayName),
            cachedAt: Date.now(),
          })
        }
      }
    } catch (error) {
      console.warn('[App] Failed to fetch profile:', error)
    }
  }, [userId])

  // Note: Profile is now fetched during checkAuthAndLoadProfile()
  // This effect is only for refreshing after profile updates or auth changes from deep links
  // Skip on initial mount since checkAuthAndLoadProfile handles it

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

  // Handle profile update - use new data directly for instant UI update, then refresh cache
  const handleProfileUpdated = useCallback((data: { name?: string; avatarUrl?: string; phone?: string }) => {
    // Immediately update state with new data (no network delay)
    if (data.name !== undefined) {
      setUserName(data.name)
    }
    if (data.avatarUrl !== undefined) {
      setUserAvatarUrl(data.avatarUrl)
    }
    if (data.phone !== undefined) {
      setUserPhone(data.phone)
    }
    // Also fetch from server to ensure cache is up to date
    fetchProfile()
  }, [fetchProfile])

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
  const handleOpenAuth = useCallback(() => setAuthOpen(true), [])

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      const result = await electronBridge.auth.signOut()
      if (result.success) {
        // Clear odd-core profile cache
        if (userId) {
          webProfileCache.clear(userId)
        }

        setIsAuthenticated(false)
        setUserId(undefined)
        setUserEmail(undefined)
        setUserName(undefined)
        setUserAvatarUrl(undefined)
        setUserPhone(undefined)

        showToast('Signed out successfully', 'success', 2000)
      } else {
        showToast(`Sign out failed: ${result.error}`, 'error', 3000)
      }
    } catch (error) {
      console.error('[App] Sign out error:', error)
      showToast('Sign out failed', 'error', 3000)
    }
  }, [showToast, userId])

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
            userEmail={userEmail}
            userName={userName}
            userAvatarUrl={userAvatarUrl}
            userPhone={userPhone}
            isAuthenticated={isAuthenticated ?? false}
            onSignOut={handleSignOut}
            onSignIn={handleOpenAuth}
            onProfileUpdated={handleProfileUpdated}
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
