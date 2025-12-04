import { useState, useEffect, useCallback } from 'react'
import { XStack, Text, Button, styled, AnimatePresence } from 'tamagui'
import { Download, X, RefreshCw } from '@tamagui/lucide-icons'
import { electronBridge } from '../services/electron.bridge'
import { Z_INDEX } from '../constants/zIndex'

const BannerContainer = styled(XStack, {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  backgroundColor: '$primary6',
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  zIndex: Z_INDEX.UPDATE_BANNER,
  enterStyle: {
    opacity: 0,
    y: -50,
  },
  exitStyle: {
    opacity: 0,
    y: -50,
  },
})

interface UpdateBannerProps {
  onDismiss?: () => void
}

export function UpdateBanner({ onDismiss }: UpdateBannerProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Listen for update events from Electron
    const cleanup = electronBridge.onUpdateReady((info) => {
      setUpdateAvailable(true)
      setUpdateVersion(info.version)
      setDismissed(false)
    })

    return cleanup
  }, [])

  const handleRestart = useCallback(() => {
    electronBridge.restartToUpdate()
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    onDismiss?.()
  }, [onDismiss])

  if (!updateAvailable || dismissed) {
    return null
  }

  return (
    <AnimatePresence>
      <BannerContainer>
        <XStack flex={1} alignItems="center" justifyContent="center" gap={12}>
          <Download size={18} color="#FFFFFF" />
          <Text fontSize={14} fontWeight="500" color="#FFFFFF">
            {updateVersion
              ? `Update available: v${updateVersion}`
              : 'A new update is available!'}
          </Text>
        </XStack>

        <XStack gap={8}>
          <Button
            size="$2"
            backgroundColor="rgba(255,255,255,0.2)"
            hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
            pressStyle={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            borderRadius={6}
            onPress={handleRestart}
            icon={<RefreshCw size={14} color="#FFFFFF" />}
          >
            <Text fontSize={12} fontWeight="600" color="#FFFFFF">
              Restart & Update
            </Text>
          </Button>

          <Button
            size="$2"
            circular
            chromeless
            onPress={handleDismiss}
            hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <X size={16} color="rgba(255,255,255,0.8)" />
          </Button>
        </XStack>
      </BannerContainer>
    </AnimatePresence>
  )
}

