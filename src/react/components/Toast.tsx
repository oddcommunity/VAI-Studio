/**
 * Toast components
 * Custom toast renderer using useToastStore
 */

import { AnimatePresence, YStack, XStack, Text, View } from '@odd-design-system/ui-components'
import { CheckCircle, XCircle, AlertCircle, Info, X } from '@tamagui/lucide-icons'
import { useToastStore } from '../stores/useToastStore'
import { Z_INDEX } from '../constants/zIndex'
import type { ToastType } from '../types'

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} color="$success" />,
  error: <XCircle size={18} color="$errorText" />,
  warning: <AlertCircle size={18} color="$warning" />,
  info: <Info size={18} color="$info" />,
}

const toastBackgrounds: Record<ToastType, string> = {
  success: '$success',
  error: '$errorBorder',
  warning: '$warning',
  info: '$info',
}

/**
 * Toast renderer component - reads from useToastStore and displays toasts
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <YStack
      position="absolute"
      top={60}
      right={16}
      gap={8}
      zIndex={Z_INDEX.TOAST}
      pointerEvents="box-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <YStack
            key={toast.id}
            animation="quick"
            enterStyle={{ opacity: 0, x: 50, scale: 0.9 }}
            exitStyle={{ opacity: 0, x: 50, scale: 0.9 }}
            opacity={1}
            x={0}
            scale={1}
            backgroundColor="$secondary2"
            borderRadius={8}
            borderWidth={1}
            borderColor="$secondary5"
            paddingHorizontal={14}
            paddingVertical={12}
            minWidth={280}
            maxWidth={400}
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.15}
            shadowRadius={12}
            pointerEvents="auto"
          >
            <XStack alignItems="center" gap={10}>
              {/* Color indicator bar */}
              <View
                width={3}
                height={24}
                borderRadius={2}
                backgroundColor={toastBackgrounds[toast.type]}
              />

              {/* Icon */}
              {toastIcons[toast.type]}

              {/* Message */}
              <Text
                flex={1}
                fontSize={13}
                color="$secondary11"
                numberOfLines={3}
              >
                {toast.message}
              </Text>

              {/* Close button */}
              <XStack
                pressStyle={{ opacity: 0.7 }}
                onPress={() => removeToast(toast.id)}
                padding={4}
                borderRadius={4}
                hoverStyle={{ backgroundColor: '$secondary4' }}
                cursor="pointer"
              >
                <X size={14} color="$secondary8" />
              </XStack>
            </XStack>
          </YStack>
        ))}
      </AnimatePresence>
    </YStack>
  )
}

// Legacy export for backwards compatibility - remove the Tamagui toast stuff
export function AppToastViewport() {
  return <ToastContainer />
}
