// Shim for react-native-safe-area-context on web
// Web doesn't have safe area insets like mobile devices

import React from 'react'
import { View, ViewProps } from 'react-native-web'

export interface EdgeInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Metrics {
  insets: EdgeInsets
  frame: { x: number; y: number; width: number; height: number }
}

const defaultInsets: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 }

export const SafeAreaContext = React.createContext<EdgeInsets | null>(null)

export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SafeAreaContext.Provider,
    { value: defaultInsets },
    children
  )
}

export function SafeAreaView({ children, style, ...props }: ViewProps & { children?: React.ReactNode }) {
  return React.createElement(View, { style, ...props }, children)
}

export function useSafeAreaInsets(): EdgeInsets {
  return defaultInsets
}

export function useSafeAreaFrame() {
  return {
    x: 0,
    y: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }
}

export const SafeAreaInsetsContext = SafeAreaContext
export const SafeAreaFrameContext = React.createContext({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
})

export function initialWindowMetrics(): Metrics | null {
  return null
}

export default {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  SafeAreaContext,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  initialWindowMetrics,
}
