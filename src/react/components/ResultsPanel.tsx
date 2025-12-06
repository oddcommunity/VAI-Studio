// ResultsPanel component
import { useCallback } from 'react'
import { YStack, XStack, Text, Button, H2, ScrollView, styled } from '@odd-design-system/ui-components'
import { FileAudio, Trash2, LayoutGrid } from '@tamagui/lucide-icons'
import { ResultCard } from './ResultCard'
import { sanitizeFileName } from '../utils/sanitize'
import type { TranscribeResult } from '../types'

const Container = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
  padding: 24,
})

const Header = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
  flexWrap: 'wrap',
  gap: 12,
})

const EmptyState = styled(YStack, {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 48,
})

const ComparisonGrid = styled(XStack, {
  flex: 1,
  gap: 16,
  flexWrap: 'wrap',
})

const ComparisonColumn = styled(YStack, {
  flex: 1,
  minWidth: 300,
  gap: 16,
})

const SingleColumn = styled(YStack, {
  flex: 1,
  gap: 16,
})

export interface TranscriptionResultItem {
  backend: string
  model: string
  result: TranscribeResult
}

export interface ResultsPanelProps {
  results: TranscriptionResultItem[]
  comparisonMode?: boolean
  onClearResults?: () => void
  onExport?: (result: TranscriptionResultItem, format: 'txt' | 'json' | 'srt' | 'vtt' | 'pdf') => void
  selectedFile?: string | null
}

// Memoized wrapper for ResultCard to prevent inline function recreation
interface MemoizedResultCardProps {
  item: TranscriptionResultItem
  onExport?: (result: TranscriptionResultItem, format: 'txt' | 'json' | 'srt' | 'vtt' | 'pdf') => void
  defaultExpanded: boolean
}

function MemoizedResultCard({ item, onExport, defaultExpanded }: MemoizedResultCardProps) {
  const handleExport = useCallback(
    (format: 'txt' | 'json' | 'srt' | 'vtt' | 'pdf') => {
      onExport?.(item, format)
    },
    [onExport, item]
  )

  return (
    <ResultCard
      backend={item.backend}
      model={item.model}
      result={item.result}
      onExport={onExport ? handleExport : undefined}
      defaultExpanded={defaultExpanded}
    />
  )
}

export function ResultsPanel({
  results,
  comparisonMode = false,
  onClearResults,
  onExport,
  selectedFile,
}: ResultsPanelProps) {
  if (results.length === 0) {
    return (
      <Container>
        <EmptyState>
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="$secondary2"
            alignItems="center"
            justifyContent="center"
          >
            <FileAudio size={32} color="$secondary5" />
          </YStack>
          <YStack alignItems="center" gap={8}>
            <Text fontSize={18} fontWeight="600" color="$secondary11">
              No Results Yet
            </Text>
            <Text fontSize={14} color="$secondary7" textAlign="center" maxWidth={300}>
              Select an audio file and model, then click Transcribe to see results here.
            </Text>
          </YStack>
        </EmptyState>
      </Container>
    )
  }

  const fileName = sanitizeFileName(selectedFile)

  return (
    <Container>
      <Header>
        <YStack gap={4}>
          <Text fontSize={18} fontWeight="600" color="$secondary11">
            Transcription Results
          </Text>
          <Text fontSize={13} color="$secondary6">
            {fileName} • {results.length} {results.length === 1 ? 'result' : 'results'}
          </Text>
        </YStack>

        <XStack gap={8}>
          {comparisonMode && (
            <XStack
              backgroundColor="$secondary3"
              paddingHorizontal={10}
              paddingVertical={6}
              borderRadius={6}
              alignItems="center"
              gap={6}
            >
              <LayoutGrid size={14} color="$primary8" />
              <Text fontSize={12} color="$primary9" fontWeight="500">
                Comparison Mode
              </Text>
            </XStack>
          )}

          {onClearResults && (
            <Button
              size="$3"
              chromeless
              onPress={onClearResults}
              hoverStyle={{ backgroundColor: '$secondary3' }}
              icon={<Trash2 size={16} color="$secondary7" />}
            >
              <Text fontSize={13} color="$secondary9">
                Clear
              </Text>
            </Button>
          )}
        </XStack>
      </Header>

      <ScrollView flex={1}>
        {comparisonMode && results.length > 1 ? (
          <ComparisonGrid>
            {results.map((item, index) => (
              <ComparisonColumn key={`${item.backend}-${item.model}-${index}`}>
                <MemoizedResultCard
                  item={item}
                  onExport={onExport}
                  defaultExpanded={true}
                />
              </ComparisonColumn>
            ))}
          </ComparisonGrid>
        ) : (
          <SingleColumn>
            {results.map((item, index) => (
              <MemoizedResultCard
                key={`${item.backend}-${item.model}-${index}`}
                item={item}
                onExport={onExport}
                defaultExpanded={index === 0}
              />
            ))}
          </SingleColumn>
        )}
      </ScrollView>
    </Container>
  )
}
