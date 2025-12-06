// BatchFilesList component - displays files in batch queue
import { memo, useCallback } from 'react'
import { YStack, XStack, Text, Button, ScrollView, styled } from '@odd-design-system/ui-components'
import { X, FileAudio, CheckCircle, AlertCircle, Loader } from '@tamagui/lucide-icons'
import type { BatchFile } from '../types'

const FileItem = styled(XStack, {
  backgroundColor: '$secondary3',
  borderRadius: 6,
  padding: 12,
  alignItems: 'center',
  gap: 12,
  variants: {
    status: {
      pending: {},
      processing: {
        backgroundColor: '$primary2',
        borderWidth: 1,
        borderColor: '$primary4',
      },
      completed: {
        backgroundColor: 'hsla(142, 76%, 36%, 0.1)',
        borderWidth: 1,
        borderColor: 'hsl(142, 76%, 36%)',
      },
      failed: {
        backgroundColor: 'hsla(0, 84%, 60%, 0.1)',
        borderWidth: 1,
        borderColor: 'hsl(0, 84%, 60%)',
      },
    },
  } as const,
})

const statusIcons = {
  pending: null,
  processing: <Loader size={16} color="$primary8" />,
  completed: <CheckCircle size={16} color="hsl(142, 76%, 36%)" />,
  failed: <AlertCircle size={16} color="hsl(0, 84%, 60%)" />,
}

// Memoized file item component to prevent unnecessary re-renders
interface BatchFileItemProps {
  file: BatchFile
  index: number
  onRemove: (index: number) => void
}

const BatchFileItem = memo(({ file, index, onRemove }: BatchFileItemProps) => {
  const handleRemove = useCallback(() => {
    onRemove(index)
  }, [onRemove, index])

  return (
    <FileItem status={file.status}>
      <FileAudio size={16} color="$secondary7" />
      <Text
        flex={1}
        fontSize={13}
        color="$secondary11"
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {file.name}
      </Text>
      {statusIcons[file.status]}
      {file.status === 'pending' && (
        <Button
          size="$1"
          circular
          chromeless
          onPress={handleRemove}
          hoverStyle={{ backgroundColor: '$secondary4' }}
        >
          <X size={14} color="$secondary6" />
        </Button>
      )}
    </FileItem>
  )
})

interface BatchFilesListProps {
  files: BatchFile[]
  onRemoveFile: (index: number) => void
  onClearAll: () => void
  maxHeight?: number
}

export function BatchFilesList({
  files,
  onRemoveFile,
  onClearAll,
  maxHeight = 200,
}: BatchFilesListProps) {
  if (files.length === 0) {
    return null
  }

  const completedCount = files.filter((f) => f.status === 'completed').length
  const failedCount = files.filter((f) => f.status === 'failed').length
  const pendingCount = files.filter((f) => f.status === 'pending').length

  return (
    <YStack gap={12}>
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={8}>
          <Text
            fontSize={11}
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={1}
            color="$secondary6"
          >
            Batch Queue
          </Text>
          <Text fontSize={11} color="$secondary5">
            ({files.length} {files.length === 1 ? 'file' : 'files'})
          </Text>
        </XStack>

        <Button
          size="$2"
          chromeless
          onPress={onClearAll}
          hoverStyle={{ backgroundColor: '$secondary3' }}
        >
          <Text fontSize={11} color="$secondary7">
            Clear All
          </Text>
        </Button>
      </XStack>

      {/* Status summary */}
      {(completedCount > 0 || failedCount > 0) && (
        <XStack gap={12}>
          {completedCount > 0 && (
            <Text fontSize={11} color="hsl(142, 76%, 36%)">
              {completedCount} completed
            </Text>
          )}
          {failedCount > 0 && (
            <Text fontSize={11} color="hsl(0, 84%, 60%)">
              {failedCount} failed
            </Text>
          )}
          {pendingCount > 0 && (
            <Text fontSize={11} color="$secondary6">
              {pendingCount} pending
            </Text>
          )}
        </XStack>
      )}

      <ScrollView maxHeight={maxHeight}>
        <YStack gap={8}>
          {files.map((file, index) => (
            <BatchFileItem
              key={file.path}
              file={file}
              index={index}
              onRemove={onRemoveFile}
            />
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
