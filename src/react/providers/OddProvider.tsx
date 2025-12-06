import React, { createContext, useContext, useState, useEffect } from 'react'
import { ToastProvider } from '@tamagui/toast'
import { TamaguiProvider, type TamaguiProviderProps } from '@odd-design-system/ui-components'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import config from '@odd-design-system/ui-components/tamagui.config'

type ThemeName = 'vai' | 'vai_dark'

interface ThemeControlContextType {
  currentTheme: ThemeName
  toggleTheme: () => void
  setTheme: (theme: ThemeName) => void
}

const ThemeControlContext = createContext<ThemeControlContextType | undefined>(undefined)

export function useThemeControl() {
  const context = useContext(ThemeControlContext)
  if (!context) {
    throw new Error('useThemeControl must be used within an OddProvider')
  }
  return context
}

function ThemeAwareProvider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, 'config'>) {
  const [scheme, setScheme] = useColorScheme()

  // Determine active theme based on scheme
  const activeTheme = scheme === 'dark' ? 'vai_dark' : 'vai'

  const toggleTheme = () => {
    setScheme(scheme === 'dark' ? 'light' : 'dark')
  }

  const setTheme = (theme: ThemeName) => {
    setScheme(theme === 'vai_dark' ? 'dark' : 'light')
  }

  return (
    <ThemeControlContext.Provider value={{ currentTheme: activeTheme, toggleTheme, setTheme }}>
      <TamaguiProvider config={config} defaultTheme={activeTheme} {...rest}>
        <ToastProvider swipeDirection="horizontal">
          {children}
        </ToastProvider>
      </TamaguiProvider>
    </ThemeControlContext.Provider>
  )
}

export function OddProvider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, 'config'>) {
  return (
    <SchemeProvider>
      <ThemeAwareProvider {...rest}>
        {children}
      </ThemeAwareProvider>
    </SchemeProvider>
  )
}
