import { useState, useEffect, useCallback } from 'react'
import { YStack, XStack, Text, Button, styled } from 'tamagui'
import { Mic, Square, Trash2, Check } from '@tamagui/lucide-icons'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { Z_INDEX } from '../constants/zIndex'

const RecordingOverlay = styled(YStack, {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(13, 13, 15, 0.95)',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: Z_INDEX.RECORDING_CONTROLS,
  padding: 32,
})

const RecordingCard = styled(YStack, {
  backgroundColor: '$secondary2',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '$secondary3',
  padding: 32,
  alignItems: 'center',
  gap: 24,
  minWidth: 360,
  maxWidth: 480,
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 24,
})

const RecordingIndicator = styled(YStack, {
  width: 120,
  height: 120,
  borderRadius: 60,
  alignItems: 'center',
  justifyContent: 'center',
  variants: {
    recording: {
      true: {
        backgroundColor: 'hsla(0, 84%, 60%, 0.15)',
        borderWidth: 3,
        borderColor: 'hsl(0, 84%, 60%)',
      },
      false: {
        backgroundColor: '$secondary3',
        borderWidth: 2,
        borderColor: '$secondary4',
      },
    },
  } as const,
})

const WaveformBar = styled(YStack, {
  width: 4,
  backgroundColor: '$primary6',
  borderRadius: 2,
})

interface RecordingControlsProps {
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onUseRecording: () => void
  onDiscardRecording: () => void
  recordedAudio?: {
    duration: number
    fileName?: string
  } | null
  visible: boolean
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function Waveform({ isActive }: { isActive: boolean }) {
  const [heights, setHeights] = useState([20, 35, 50, 35, 20, 40, 55, 40, 25])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => Math.random() * 50 + 10))
    }, 150)

    return () => clearInterval(interval)
  }, [isActive])

  return (
    <XStack gap={3} alignItems="center" height={60}>
      {heights.map((height, index) => (
        <WaveformBar
          key={index}
          height={isActive ? height : 4}
          opacity={isActive ? 1 : 0.3}
        />
      ))}
    </XStack>
  )
}

export function RecordingControls({
  isRecording,
  onStartRecording,
  onStopRecording,
  onUseRecording,
  onDiscardRecording,
  recordedAudio,
  visible,
}: RecordingControlsProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer for recording duration
  useEffect(() => {
    if (!isRecording) {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording])

  if (!visible) return null

  const hasRecording = !isRecording && recordedAudio && recordedAudio.duration > 0

  return (
    <RecordingOverlay>
      <RecordingCard>
        <Text fontSize={20} fontWeight="600" color="$secondary11">
          {isRecording ? 'Recording...' : hasRecording ? 'Recording Complete' : 'Ready to Record'}
        </Text>

        <RecordingIndicator recording={isRecording}>
          {isRecording ? (
            <Waveform isActive={true} />
          ) : (
            <Mic size={48} color={hasRecording ? 'hsl(142, 76%, 36%)' : '$secondary6'} />
          )}
        </RecordingIndicator>

        <Text fontSize={32} fontWeight="600" color="$secondary11" fontFamily="$mono">
          {isRecording
            ? formatDuration(elapsedTime)
            : hasRecording
              ? formatDuration(recordedAudio.duration)
              : '00:00'}
        </Text>

        {isRecording && (
          <XStack alignItems="center" gap={8}>
            <YStack
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor="hsl(0, 84%, 60%)"
            />
            <Text fontSize={13} color="hsl(0, 84%, 60%)">
              Recording in progress
            </Text>
          </XStack>
        )}

        <XStack gap={12} marginTop={8}>
          {isRecording ? (
            <Button
              size="$5"
              backgroundColor="hsl(0, 84%, 60%)"
              hoverStyle={{ backgroundColor: 'hsl(0, 84%, 55%)' }}
              pressStyle={{ backgroundColor: 'hsl(0, 84%, 50%)' }}
              borderRadius={12}
              onPress={onStopRecording}
              icon={<Square size={20} color="#FFFFFF" />}
            >
              <Text fontSize={15} fontWeight="600" color="#FFFFFF">
                Stop Recording
              </Text>
            </Button>
          ) : hasRecording ? (
            <>
              <Button
                size="$4"
                backgroundColor="$secondary3"
                hoverStyle={{ backgroundColor: '$secondary4' }}
                pressStyle={{ backgroundColor: '$secondary5' }}
                borderRadius={10}
                onPress={onDiscardRecording}
                icon={<Trash2 size={18} color="$secondary9" />}
              >
                <Text fontSize={14} fontWeight="500" color="$secondary9">
                  Discard
                </Text>
              </Button>
              <Button
                size="$4"
                backgroundColor="hsl(142, 76%, 36%)"
                hoverStyle={{ backgroundColor: 'hsl(142, 76%, 40%)' }}
                pressStyle={{ backgroundColor: 'hsl(142, 76%, 32%)' }}
                borderRadius={10}
                onPress={onUseRecording}
                icon={<Check size={18} color="#FFFFFF" />}
              >
                <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                  Use Recording
                </Text>
              </Button>
            </>
          ) : (
            <Button
              size="$5"
              backgroundColor="$primary6"
              hoverStyle={{ backgroundColor: '$primary5' }}
              pressStyle={{ backgroundColor: '$primary4' }}
              borderRadius={12}
              onPress={onStartRecording}
              icon={<Mic size={20} color="#FFFFFF" />}
            >
              <Text fontSize={15} fontWeight="600" color="#FFFFFF">
                Start Recording
              </Text>
            </Button>
          )}
        </XStack>

        {hasRecording && recordedAudio.fileName && (
          <Text fontSize={12} color="$secondary6" marginTop={4}>
            Saved as: {recordedAudio.fileName}
          </Text>
        )}
      </RecordingCard>
    </RecordingOverlay>
  )
}

// Hook-connected version for easier use
export function RecordingOverlayConnected() {
  const [showOverlay, setShowOverlay] = useState(false)

  // Use the audio recorder hook for actual recording functionality
  const {
    isRecording,
    recordedAudio,
    startRecording,
    stopRecording,
    discardRecording,
    useRecording,
  } = useAudioRecorder()

  const handleStartRecording = useCallback(async () => {
    setShowOverlay(true)
    await startRecording()
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    await stopRecording()
  }, [stopRecording])

  const handleUseRecording = useCallback(() => {
    useRecording()
    setShowOverlay(false)
  }, [useRecording])

  const handleDiscardRecording = useCallback(() => {
    discardRecording()
    setShowOverlay(false)
  }, [discardRecording])

  return (
    <RecordingControls
      isRecording={isRecording}
      onStartRecording={handleStartRecording}
      onStopRecording={handleStopRecording}
      onUseRecording={handleUseRecording}
      onDiscardRecording={handleDiscardRecording}
      recordedAudio={recordedAudio}
      visible={showOverlay || isRecording}
    />
  )
}
