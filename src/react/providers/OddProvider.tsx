import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ToastProvider } from '@tamagui/toast'
import { TamaguiProvider, type TamaguiProviderProps, useTheme as useTamaguiTheme } from '@odd-design-system/ui-components'
import config from '@odd-design-system/ui-components/tamagui.config'

// Validate config on module load
const validatedConfig = (() => {
  if (!config) {
    console.error('[OddProvider] Tamagui config is undefined!')
    return null
  }
  if (!config.themes) {
    console.error('[OddProvider] Tamagui config has no themes!')
    return null
  }
  if (!config.themes.vai_dark) {
    console.error('[OddProvider] Tamagui config missing vai_dark theme!')
    return null
  }
  return config
})()

// Safe useTheme hook that doesn't throw if called outside provider
// Falls back to vai_dark theme colors
const fallbackTheme = {
  color9: { val: 'hsl(215, 15%, 78%)' },
  color10: { val: 'hsl(215, 15%, 86%)' },
  primary8: { val: 'hsl(215, 83%, 70%)' },
}

export function useSafeTheme() {
  try {
    const theme = useTamaguiTheme()
    return theme || fallbackTheme
  } catch {
    console.warn('[useSafeTheme] Theme not available, using fallback')
    return fallbackTheme
  }
}

type ThemeName = 'vai' | 'vai_dark'
type ColorScheme = 'light' | 'dark'

interface ThemeControlContextType {
  currentTheme: ThemeName
  toggleTheme: () => void
  setTheme: (theme: ThemeName) => void
}

const ThemeControlContext = createContext<ThemeControlContextType | undefined>(undefined)

// Storage key for theme preference
const THEME_STORAGE_KEY = 'vai-studio-theme'

// Get initial theme from localStorage or system preference
function getInitialScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'dark'

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // localStorage might not be available
  }

  // Default to dark theme for VAI Studio
  return 'dark'
}

export function useThemeControl() {
  const context = useContext(ThemeControlContext)
  if (!context) {
    throw new Error('useThemeControl must be used within an OddProvider')
  }
  return context
}

export function OddProvider({
  children,
  defaultTheme = 'vai_dark',
  ...rest
}: Omit<TamaguiProviderProps, 'config'> & { defaultTheme?: ThemeName }) {
  // Initialize theme state synchronously to avoid flash
  const [scheme, setSchemeState] = useState<ColorScheme>(getInitialScheme)

  // Compute the theme name from scheme
  const currentTheme: ThemeName = scheme === 'dark' ? 'vai_dark' : 'vai'

  // Update document class for CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('t_light', 't_dark')
    root.classList.add(scheme === 'dark' ? 't_dark' : 't_light')
  }, [scheme])

  const setScheme = useCallback((newScheme: ColorScheme) => {
    setSchemeState(newScheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newScheme)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setScheme(scheme === 'dark' ? 'light' : 'dark')
  }, [scheme, setScheme])

  const setTheme = useCallback((theme: ThemeName) => {
    setScheme(theme === 'vai_dark' ? 'dark' : 'light')
  }, [setScheme])

  // Memoize the context value to prevent unnecessary re-renders
  const themeControlValue = useMemo(() => ({
    currentTheme,
    toggleTheme,
    setTheme
  }), [currentTheme, toggleTheme, setTheme])

  // If config is invalid, render a basic error state without Tamagui
  if (!validatedConfig) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        color: '#eee',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ marginBottom: '8px' }}>Configuration Error</h1>
          <p>Failed to load theme configuration. Please restart the app.</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeControlContext.Provider value={themeControlValue}>
      <TamaguiProvider config={validatedConfig} defaultTheme={currentTheme} {...rest}>
        <ToastProvider swipeDirection="horizontal">
          {children}
        </ToastProvider>
      </TamaguiProvider>
    </ThemeControlContext.Provider>
  )
}
