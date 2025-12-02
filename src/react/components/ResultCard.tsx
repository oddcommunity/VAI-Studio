import React, { useState, useCallback } from 'react'
import { YStack, XStack, Text, Button, ScrollView, styled } from 'tamagui'
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
} from '@tamagui/lucide-icons'
import type { TranscribeResult } from '../types'
import { useToastStore } from '../stores/useToastStore'

const Card = styled(YStack, {
  backgroundColor: '$secondary2',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '$secondary3',
  overflow: 'hidden',
  animation: 'quick',
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
  backgroundColor: 'hsla(0, 84%, 60%, 0.1)',
  borderWidth: 1,
  borderColor: 'hsl(0, 84%, 60%)',
  borderRadius: 6,
  padding: 12,
  gap: 8,
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
  const { showToast } = useToastStore()

  const handleCopy = useCallback(async () => {
    if (!result.text) return

    try {
      await navigator.clipboard.writeText(result.text)
      setCopied(true)
      showToast('Copied to clipboard', 'success', 2000)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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
              <AlertCircle size={18} color="hsl(0, 84%, 60%)" />
              <Text fontSize={14} fontWeight="500" color="hsl(0, 84%, 60%)">
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
          <Button
            size="$2"
            chromeless
            onPress={handleCopy}
            hoverStyle={{ backgroundColor: '$secondary3' }}
            icon={copied ? <Check size={16} color="hsl(142, 76%, 36%)" /> : <Copy size={16} color="$secondary7" />}
          >
            <Text fontSize={12} color="$secondary9">
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </Button>

          {onExport && (
            <Button
              size="$2"
              chromeless
              hoverStyle={{ backgroundColor: '$secondary3' }}
              icon={<Download size={16} color="$secondary7" />}
              onPress={() => onExport('txt')}
            >
              <Text fontSize={12} color="$secondary9">
                Export
              </Text>
            </Button>
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
            <TranscriptText selectable>
              {result.text || 'No transcription text available'}
            </TranscriptText>
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
                    <Text fontSize={13} color="$secondary9" flex={1}>
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
