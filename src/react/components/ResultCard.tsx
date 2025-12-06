import { useState, useCallback, useMemo } from 'react'
import { YStack, XStack, Text, Button } from '@odd-design-system/ui-components'
import { ScrollView, styled, Popover } from '@odd-design-system/ui-components'
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Globe,
  Download,
  AlertCircle,
  FileText,
  FileJson,
  Subtitles,
  FileType,
} from '@tamagui/lucide-icons'
import type { TranscribeResult } from '../types'
import { useToastStore } from '../stores/useToastStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { electronBridge } from '../services/electron.bridge'

// Font size mapping
const FONT_SIZE_MAP = {
  small: { text: 13, lineHeight: 20, segment: 11 },
  medium: { text: 15, lineHeight: 24, segment: 13 },
  large: { text: 17, lineHeight: 28, segment: 15 },
} as const

type ExportFormat = 'txt' | 'json' | 'srt' | 'vtt' | 'pdf'

const formatOptions: { format: ExportFormat; label: string; icon: React.ReactNode }[] = [
  { format: 'pdf', label: 'PDF Document (.pdf)', icon: <FileType size={14} color="$secondary7" /> },
  { format: 'txt', label: 'Plain Text (.txt)', icon: <FileText size={14} color="$secondary7" /> },
  { format: 'json', label: 'JSON (.json)', icon: <FileJson size={14} color="$secondary7" /> },
  { format: 'srt', label: 'SubRip (.srt)', icon: <Subtitles size={14} color="$secondary7" /> },
  { format: 'vtt', label: 'WebVTT (.vtt)', icon: <Subtitles size={14} color="$secondary7" /> },
]

const Card = styled(YStack, {
  backgroundColor: '$secondary2',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '$secondary3',
  overflow: 'hidden',
  enterStyle: {
    opacity: 0,
    y: 10,
  },
})

const CardHeader = styled(XStack, {
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '$secondary3',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
})

const CardContent = styled(YStack, {
  padding: 16,
})

const MetaBadge = styled(XStack, {
  backgroundColor: '$secondary3',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
  alignItems: 'center',
  gap: 4,
})

const TranscriptText = styled(Text, {
  fontSize: 15,
  lineHeight: 24,
  color: '$secondary11',
  fontFamily: '$body',
})

const ErrorBox = styled(YStack, {
  backgroundColor: '$errorBackground',
  borderWidth: 1,
  borderColor: '$errorBorder',
  borderRadius: 6,
  padding: 12,
  gap: 8,
})

const ExportMenuItem = styled(XStack, {
  paddingHorizontal: 12,
  paddingVertical: 8,
  alignItems: 'center',
  gap: 8,
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
  hoverStyle: {
    backgroundColor: '$secondary3',
  },
  pressStyle: {
    backgroundColor: '$secondary4',
  },
})

export interface ResultCardProps {
  backend: string
  model: string
  result: TranscribeResult
  onExport?: (format: 'txt' | 'json' | 'srt' | 'vtt') => void
  defaultExpanded?: boolean
}

export function ResultCard({
  backend,
  model,
  result,
  onExport,
  defaultExpanded = true,
}: ResultCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const { showToast } = useToastStore()
  // Use selector for fontSize to ensure re-renders on change
  const fontSize = useSettingsStore((state) => state.fontSize)

  // Get font sizes based on setting with proper type safety
  const fontSizes = useMemo(() => {
    const validFontSize = (fontSize === 'small' || fontSize === 'medium' || fontSize === 'large')
      ? fontSize
      : 'medium'
    return FONT_SIZE_MAP[validFontSize]
  }, [fontSize])

  const handleExport = useCallback((format: ExportFormat) => {
    setExportOpen(false)
    onExport?.(format)
  }, [onExport])

  const handleCopy = useCallback(async () => {
    if (!result.text) {
      showToast('No text to copy', 'error', 3000)
      return
    }

    try {
      // Use Electron clipboard API if available, fallback to navigator.clipboard
      if (electronBridge.isElectron()) {
        const success = electronBridge.copyToClipboard(result.text)
        if (success) {
          setCopied(true)
          showToast('Copied to clipboard', 'success', 2000)
          setTimeout(() => setCopied(false), 2000)
        } else {
          showToast('Failed to copy', 'error', 3000)
        }
      } else {
        await navigator.clipboard.writeText(result.text)
        setCopied(true)
        showToast('Copied to clipboard', 'success', 2000)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Copy failed:', err)
      showToast('Failed to copy', 'error', 3000)
    }
  }, [result.text, showToast])

  const formatTime = (seconds?: number) => {
    if (!seconds) return '--'
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(1)
    return `${mins}m ${secs}s`
  }

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <XStack alignItems="center" gap={8}>
            <Text fontSize={14} fontWeight="600" color="$secondary11">
              {model}
            </Text>
            <Text fontSize={12} color="$secondary6">
              ({backend})
            </Text>
          </XStack>
        </CardHeader>
        <CardContent>
          <ErrorBox>
            <XStack alignItems="center" gap={8}>
              <AlertCircle size={18} color="$errorText" />
              <Text fontSize={14} fontWeight="500" color="$errorText">
                Transcription Failed
              </Text>
            </XStack>
            <Text fontSize={13} color="$secondary9">
              {result.error || 'An unknown error occurred'}
            </Text>
          </ErrorBox>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <XStack alignItems="center" gap={12} flexWrap="wrap">
          <Text fontSize={14} fontWeight="600" color="$secondary11">
            {model}
          </Text>
          <Text fontSize={12} color="$secondary6">
            ({backend})
          </Text>

          {result.processing_time && (
            <MetaBadge>
              <Clock size={12} color="$secondary7" />
              <Text fontSize={11} color="$secondary9">
                {formatTime(result.processing_time)}
              </Text>
            </MetaBadge>
          )}

          {result.device && (
            <MetaBadge>
              <Cpu size={12} color="$secondary7" />
              <Text fontSize={11} color="$secondary9">
                {result.device}
              </Text>
            </MetaBadge>
          )}

          {result.language && (
            <MetaBadge>
              <Globe size={12} color="$secondary7" />
              <Text fontSize={11} color="$secondary9">
                {result.language}
              </Text>
            </MetaBadge>
          )}
        </XStack>

        <XStack alignItems="center" gap={8}>
          <XStack
            alignItems="center"
            gap={6}
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={4}
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$secondary3' }}
            onPress={handleCopy}
          >
            {copied ? <Check size={16} color="$success" /> : <Copy size={16} color="$secondary7" />}
            <Text fontSize={12} color="$secondary9">
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </XStack>

          {onExport && (
            <Popover open={exportOpen} onOpenChange={setExportOpen} placement="bottom-end">
              <Popover.Trigger asChild>
                <Button
                  size="$2"
                  chromeless
                  onPress={() => setExportOpen(!exportOpen)}
                  hoverStyle={{ backgroundColor: '$secondary3' }}
                  icon={<Download size={16} color="$secondary7" />}
                >
                  <Text fontSize={12} color="$secondary9">
                    Export
                  </Text>
                  <ChevronDown size={12} color="$secondary7" />
                </Button>
              </Popover.Trigger>
              <Popover.Content
                backgroundColor="$secondary2"
                borderWidth={1}
                borderColor="$secondary4"
                borderRadius={8}
                padding={4}
                minWidth={180}
                elevate
                animation="quick"
                enterStyle={{ opacity: 0, y: -4 }}
                exitStyle={{ opacity: 0, y: -4 }}
              >
                <Popover.Arrow backgroundColor="$secondary2" borderColor="$secondary4" />
                <YStack gap={2}>
                  {formatOptions.map((option) => (
                    <ExportMenuItem
                      key={option.format}
                      onPress={() => handleExport(option.format)}
                      role="button"
                      tabIndex={0}
                    >
                      {option.icon}
                      <Text fontSize={13} color="$secondary11">
                        {option.label}
                      </Text>
                    </ExportMenuItem>
                  ))}
                </YStack>
              </Popover.Content>
            </Popover>
          )}

          <Button
            size="$2"
            circular
            chromeless
            onPress={() => setExpanded(!expanded)}
            hoverStyle={{ backgroundColor: '$secondary3' }}
          >
            {expanded ? (
              <ChevronUp size={18} color="$secondary7" />
            ) : (
              <ChevronDown size={18} color="$secondary7" />
            )}
          </Button>
        </XStack>
      </CardHeader>

      {expanded && (
        <CardContent>
          <ScrollView maxHeight={400}>
            <Text
              fontSize={fontSizes.text}
              lineHeight={fontSizes.lineHeight}
              color="$secondary11"
              fontFamily="$body"
              selectable
            >
              {result.text || 'No transcription text available'}
            </Text>
          </ScrollView>

          {result.segments && result.segments.length > 0 && (
            <YStack marginTop={16} gap={8}>
              <Text fontSize={12} color="$secondary6" fontWeight="500">
                Segments ({result.segments.length})
              </Text>
              <YStack gap={4}>
                {result.segments.slice(0, 10).map((segment) => (
                  <XStack key={segment.id} gap={8} alignItems="flex-start">
                    <Text fontSize={11} color="$secondary5" minWidth={60}>
                      [{segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s]
                    </Text>
                    <Text fontSize={fontSizes.segment} color="$secondary9" flex={1}>
                      {segment.text}
                    </Text>
                  </XStack>
                ))}
                {result.segments.length > 10 && (
                  <Text fontSize={11} color="$secondary5" marginTop={4}>
                    ... and {result.segments.length - 10} more segments
                  </Text>
                )}
              </YStack>
            </YStack>
          )}
        </CardContent>
      )}
    </Card>
  )
}
