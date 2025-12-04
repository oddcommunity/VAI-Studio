// LoadingScreen component
import { YStack, Text, Progress, Spinner, styled } from 'tamagui'
import { useAppStore } from '../stores/useAppStore'
import { Z_INDEX } from '../constants/zIndex'

const LoadingContainer = styled(YStack, {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(13, 13, 15, 0.9)',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: Z_INDEX.LOADING_SCREEN,
  padding: 32,
})

const LoadingCard = styled(YStack, {
  backgroundColor: '$secondary2',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '$secondary3',
  padding: 32,
  alignItems: 'center',
  gap: 24,
  minWidth: 320,
  maxWidth: 420,
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 24,
})

const SpinnerContainer = styled(YStack, {
  width: 64,
  height: 64,
  alignItems: 'center',
  justifyContent: 'center',
})

interface LoadingScreenProps {
  message?: string
  progress?: number
  stage?: 'downloading' | 'loading' | 'transcribing'
}

const stageLabels: Record<string, string> = {
  downloading: 'Downloading model...',
  loading: 'Loading model...',
  transcribing: 'Transcribing audio...',
}

export function LoadingScreen({ message, progress, stage }: LoadingScreenProps) {
  const { progress: storeProgress, progressMessage, progressStage } = useAppStore()

  const displayProgress = progress ?? storeProgress
  const displayMessage = message ?? progressMessage ?? (stage ? stageLabels[stage] : stageLabels[progressStage || ''])
  const displayStage = stage ?? progressStage

  return (
    <LoadingContainer>
      <LoadingCard>
        <SpinnerContainer>
          <Spinner size="large" color="$primary6" />
        </SpinnerContainer>

        {displayMessage && (
          <Text
            fontSize={16}
            fontWeight="500"
            color="$secondary11"
            textAlign="center"
          >
            {displayMessage}
          </Text>
        )}

        {displayProgress > 0 && (
          <YStack width="100%" gap={8}>
            <Progress value={displayProgress} max={100} backgroundColor="$secondary4">
              <Progress.Indicator backgroundColor="$primary6" />
            </Progress>
            <Text
              fontSize={13}
              color="$secondary6"
              textAlign="center"
            >
              {Math.round(displayProgress)}%
            </Text>
          </YStack>
        )}

        {displayStage && (
          <Text
            fontSize={12}
            color="$secondary5"
            textTransform="uppercase"
            letterSpacing={1}
          >
            {displayStage}
          </Text>
        )}
      </LoadingCard>
    </LoadingContainer>
  )
}

export function LoadingOverlay({ visible, ...props }: LoadingScreenProps & { visible: boolean }) {
  if (!visible) return null
  return <LoadingScreen {...props} />
}
