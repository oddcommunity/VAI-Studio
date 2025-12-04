/**
 * Toast components using @tamagui/toast
 * Works with the ToastProvider from OddProvider
 */

import { ToastViewport } from '@tamagui/toast'
import { Z_INDEX } from '../constants/zIndex'

/**
 * Toast viewport positioned in top-right corner
 * ToastProvider is included in OddProvider
 */
export function AppToastViewport() {
  return (
    <ToastViewport
      flexDirection="column-reverse"
      top={16}
      right={16}
      zIndex={Z_INDEX.TOAST}
    />
  )
}

// Re-export toast hooks for convenience
export { useToastState, useToastController, Toast } from '@tamagui/toast'
