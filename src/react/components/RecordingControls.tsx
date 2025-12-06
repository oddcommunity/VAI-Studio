import { useState, useEffect, useCallback } from 'react'
import { YStack, XStack, Text, Button, styled } from '@odd-design-system/ui-components'
import { Mic, Square, Trash2, Check } from '@tamagui/lucide-icons'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useAppStore } from '../stores/useAppStore'
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
  onClose?: () => void
  recordedAudio?: {
    duration: number
    fileName?: string
  } | null
  visible: boolean
  error?: string | null
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
  onClose,
  recordedAudio,
  visible,
  error,
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

        {/* Error display for debugging */}
        {error && (
          <YStack
            backgroundColor="hsla(0, 84%, 60%, 0.15)"
            borderRadius={8}
            padding={12}
            marginTop={8}
            borderWidth={1}
            borderColor="hsl(0, 84%, 60%)"
            maxWidth="100%"
          >
            <Text fontSize={13} fontWeight="600" color="hsl(0, 84%, 60%)" marginBottom={4}>
              Recording Error:
            </Text>
            <Text fontSize={12} color="$secondary11" wordWrap="break-word">
              {error}
            </Text>
            {onClose && (
              <Button
                size="$3"
                backgroundColor="$secondary3"
                marginTop={8}
                onPress={onClose}
              >
                <Text fontSize={13} color="$secondary11">Close</Text>
              </Button>
            )}
          </YStack>
        )}
      </RecordingCard>
    </RecordingOverlay>
  )
}

// Hook-connected version for easier use
export function RecordingOverlayConnected() {
  const [showOverlay, setShowOverlay] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [debugError, setDebugError] = useState<string | null>(null)

  // Use the audio recorder hook for actual recording functionality
  const {
    isRecording,
    recordedAudio,
    startRecording,
    stopRecording,
    discardRecording,
    useRecording,
  } = useAudioRecorder()

  // Get trigger state from store
  const { triggerRecording, setTriggerRecording } = useAppStore((state) => ({
    triggerRecording: state.triggerRecording,
    setTriggerRecording: state.setTriggerRecording,
  }))

  const handleStartRecording = useCallback(async () => {
    console.log('[RecordingOverlay] Starting recording process...')
    setDebugError(null)     // Clear any previous error
    setShowOverlay(true)    // Show overlay immediately for feedback
    setIsStarting(true)     // Set starting state to show "Recording..." UI immediately

    const result = await startRecording()  // Start recording (returns {success, error?})
    console.log('[RecordingOverlay] Recording process completed:', result)

    // Only clear isStarting if recording actually started (isRecording will be true)
    if (result.success) {
      setIsStarting(false)  // isRecording takes over
    } else {
      // Recording failed - show error in overlay instead of closing
      setIsStarting(false)
      setDebugError(result.error || 'Unknown error')
      // Don't close overlay - let user see the error
    }
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    const filePath = await stopRecording()
    // Automatically set the file and close overlay
    if (filePath) {
      // Set the selected file directly using the store
      const { setSelectedFile } = useAppStore.getState()
      setSelectedFile(filePath)
      console.log('[RecordingOverlay] Recording loaded for transcription:', filePath)
    }
    setShowOverlay(false)
  }, [stopRecording])

  const handleUseRecording = useCallback(() => {
    useRecording()
    setShowOverlay(false)
  }, [useRecording])

  const handleDiscardRecording = useCallback(() => {
    discardRecording()
    setShowOverlay(false)
  }, [discardRecording])

  // Listen for external recording trigger from store
  useEffect(() => {
    if (triggerRecording) {
      console.log('[RecordingOverlay] Trigger received, calling handleStartRecording...')
      // Clear the trigger immediately
      setTriggerRecording(false)
      // Call the handler which shows overlay and starts recording
      handleStartRecording()
    }
  }, [triggerRecording, setTriggerRecording, handleStartRecording])

  const handleClose = useCallback(() => {
    setShowOverlay(false)
    setDebugError(null)
  }, [])

  return (
    <RecordingControls
      isRecording={isRecording || isStarting}
      onStartRecording={handleStartRecording}
      onStopRecording={handleStopRecording}
      onUseRecording={handleUseRecording}
      onDiscardRecording={handleDiscardRecording}
      onClose={handleClose}
      recordedAudio={recordedAudio}
      visible={showOverlay || isRecording || isStarting || !!debugError}
      error={debugError}
    />
  )
}
