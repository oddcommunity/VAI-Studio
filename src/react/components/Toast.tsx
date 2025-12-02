import React from 'react'
import { YStack, XStack, Text, Button, AnimatePresence, styled } from 'tamagui'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from '@tamagui/lucide-icons'
import { useToastStore } from '../stores/useToastStore'
import type { ToastType } from '../types'

const ToastContainer = styled(YStack, {
  position: 'absolute',
  top: 16,
  right: 16,
  gap: 8,
  zIndex: 100000,
  pointerEvents: 'box-none',
})

const ToastItem = styled(XStack, {
  backgroundColor: '$secondary2',
  borderWidth: 1,
  borderColor: '$secondary3',
  borderRadius: 8,
  padding: 16,
  paddingRight: 12,
  minWidth: 300,
  maxWidth: 420,
  alignItems: 'flex-start',
  gap: 12,
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  enterStyle: {
    opacity: 0,
    x: 50,
    scale: 0.95,
  },
  exitStyle: {
    opacity: 0,
    x: 50,
    scale: 0.95,
  },
  variants: {
    type: {
      success: {
        borderLeftWidth: 4,
        borderLeftColor: 'hsl(142, 76%, 36%)',
      },
      error: {
        borderLeftWidth: 4,
        borderLeftColor: 'hsl(0, 84%, 60%)',
      },
      warning: {
        borderLeftWidth: 4,
        borderLeftColor: 'hsl(38, 92%, 50%)',
      },
      info: {
        borderLeftWidth: 4,
        borderLeftColor: '$primary6',
      },
    },
  } as const,
})

const iconMap: Record<ToastType, React.ComponentType<{ size: number; color: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap: Record<ToastType, string> = {
  success: 'hsl(142, 76%, 36%)',
  error: 'hsl(0, 84%, 60%)',
  warning: 'hsl(38, 92%, 50%)',
  info: 'hsl(215, 83%, 50%)',
}

interface ToastItemProps {
  id: string
  message: string
  type: ToastType
  onDismiss: (id: string) => void
}

function Toast({ id, message, type, onDismiss }: ToastItemProps) {
  const Icon = iconMap[type]
  const iconColor = colorMap[type]

  return (
    <ToastItem type={type}>
      <Icon size={20} color={iconColor} />
      <Text
        flex={1}
        fontSize={14}
        color="$secondary11"
        lineHeight={20}
      >
        {message}
      </Text>
      <Button
        size="$2"
        circular
        chromeless
        onPress={() => onDismiss(id)}
        hoverStyle={{ backgroundColor: '$secondary3' }}
        pressStyle={{ backgroundColor: '$secondary4' }}
      >
        <X size={16} color="$secondary6" />
      </Button>
    </ToastItem>
  )
}

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore()

  return (
    <ToastContainer>
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={removeToast}
          />
        ))}
      </AnimatePresence>
    </ToastContainer>
  )
}

export { Toast }
