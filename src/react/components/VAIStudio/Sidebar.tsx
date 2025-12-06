import React, { useCallback, useState, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  H2,
  Checkbox,
  useTheme,
} from '@odd-design-system/ui-components'
import { Check } from '@tamagui/lucide-icons'
import {
  GraphicEqIcon,
  AudioFileIcon,
  MicIcon,
  PlusIcon,
  SettingsIcon,
  FolderIcon,
} from './Icons'
import { GroupedModelSelector, ModelGroup } from './GroupedModelSelector'

export interface Model {
  id: string
  name: string
}

export interface SidebarProps {
  models?: Model[]
  modelGroups?: ModelGroup[]
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  selectedModels?: string[]
  onModelsChange?: (models: string[]) => void
  onSelectFile?: () => void
  onRecordAudio?: () => void
  onAddMultipleFiles?: () => void
  onTranscribe?: () => void
  onAdvancedSettings?: () => void
  onManageModels?: () => void
  compareMode?: boolean
  onCompareModeChange?: (enabled: boolean) => void
  isTranscribing?: boolean
  /** Currently selected audio file path */
  selectedFile?: string
}

export function Sidebar({
  models = [],
  modelGroups = [],
  selectedModel = '',
  onModelChange,
  selectedModels = [],
  onModelsChange,
  onSelectFile,
  onRecordAudio,
  onAddMultipleFiles,
  onTranscribe,
  onAdvancedSettings,
  onManageModels,
  compareMode = false,
  onCompareModeChange,
  isTranscribing = false,
  selectedFile,
}: SidebarProps) {
  const theme = useTheme()
  const [isMounted, setIsMounted] = useState(false)
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false)
  const [isCompareSelectorOpen, setIsCompareSelectorOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleModelChange = useCallback(
    (value: string) => {
      onModelChange?.(value)
    },
    [onModelChange]
  )

  const handleCompareModeToggle = useCallback(() => {
    onCompareModeChange?.(!compareMode)
  }, [compareMode, onCompareModeChange])

  return (
    <YStack
      width={320}
      minHeight="100vh"
      backgroundColor="$color2"
      borderRightWidth={1}
      borderRightColor="$color4"
      padding={24}
      gap={32}
      $sm={{
        width: '100%',
        flex: 1,
        minHeight: 'auto',
        borderRightWidth: 0,
        borderBottomWidth: 1,
        borderBottomColor: '$color4',
      }}
    >
      {/* Header */}
      <YStack gap={4}>
        <XStack alignItems="center" gap={12}>
          <GraphicEqIcon size={28} color={theme.primary8?.val} />
          <H2
            margin={0}
            padding={0}
            lineHeight={28}
            fontSize={24}
            fontWeight="800"
            fontFamily="$heading"
          >
            VAI Studio
          </H2>
        </XStack>
        <Text fontSize={15} color="$color" lineHeight={22}>
          Test and compare local speech-to-text models
        </Text>
      </YStack>

      {/* Main Controls */}
      <YStack flex={1} gap={32}>
        <YStack gap={24} flex={1}>
          {/* Audio Input Section */}
          <YStack gap={12}>
            <Text
              fontSize={11}
              fontWeight="600"
              textTransform="uppercase"
              color="$color9"
              letterSpacing={1}
              fontFamily="$heading"
            >
              Audio Input
            </Text>
            <YStack gap={8}>
              <XStack gap={8}>
                <Button
                  flex={1}
                  backgroundColor="hsl(215, 83%, 50%)"
                  hoverStyle={{ backgroundColor: 'hsl(215, 83%, 55%)' }}
                  pressStyle={{ backgroundColor: 'hsl(215, 83%, 60%)' }}
                  paddingHorizontal={16}
                  paddingVertical={16}
                  borderRadius={8}
                  height={56}
                  onPress={onSelectFile}
                  icon={<AudioFileIcon size={20} color="#FFFFFF" />}
                  aria-label="Select audio file"
                >
                  <Text
                    fontSize={15}
                    fontWeight="600"
                    color="#FFFFFF"
                    fontFamily="$heading"
                  >
                    Select File
                  </Text>
                </Button>
                <Button
                  flex={1}
                  backgroundColor="hsl(0, 80%, 55%)"
                  hoverStyle={{ backgroundColor: 'hsl(0, 80%, 60%)' }}
                  pressStyle={{ backgroundColor: 'hsl(0, 80%, 65%)' }}
                  paddingHorizontal={16}
                  paddingVertical={16}
                  borderRadius={8}
                  height={56}
                  onPress={onRecordAudio}
                  icon={<MicIcon size={20} color="#FFFFFF" />}
                  aria-label="Record audio"
                >
                  <Text
                    fontSize={15}
                    fontWeight="600"
                    color="#FFFFFF"
                    fontFamily="$heading"
                    textAlign="center"
                  >
                    Record Audio
                  </Text>
                </Button>
              </XStack>
              <Button
                width="100%"
                backgroundColor="transparent"
                borderWidth={1}
                borderColor="$color4"
                hoverStyle={{ backgroundColor: '$color3' }}
                pressStyle={{ backgroundColor: '$color4' }}
                paddingHorizontal={16}
                paddingVertical={16}
                borderRadius={8}
                height={56}
                onPress={onAddMultipleFiles}
                icon={<PlusIcon size={20} color={theme.color10?.val} />}
                aria-label="Add multiple files"
              >
                <Text
                  fontSize={15}
                  fontWeight="600"
                  color="$color"
                  fontFamily="$heading"
                >
                  Add Multiple Files
                </Text>
              </Button>
              {/* Selected File Display */}
              {selectedFile && (
                <XStack
                  backgroundColor="$color3"
                  borderRadius={6}
                  padding={12}
                  alignItems="center"
                  gap={8}
                >
                  <AudioFileIcon size={16} color={theme.primary8?.val} />
                  <Text
                    fontSize={13}
                    color="$color"
                    fontFamily="$heading"
                    flex={1}
                    numberOfLines={1}
                  >
                    {selectedFile.split('/').pop()?.split('\\').pop() || selectedFile}
                  </Text>
                </XStack>
              )}
            </YStack>
          </YStack>

          {/* Model Section */}
          <YStack gap={12} position="relative" zIndex={10} minHeight={40}>
            <Text
              fontSize={11}
              fontWeight="600"
              textTransform="uppercase"
              color="$color9"
              letterSpacing={1}
              fontFamily="$heading"
            >
              Model
            </Text>
            {compareMode ? (
              <GroupedModelSelector
                groups={modelGroups}
                multiSelect={true}
                selectedModels={selectedModels}
                onModelsChange={onModelsChange}
                isOpen={isCompareSelectorOpen}
                onOpenChange={setIsCompareSelectorOpen}
              />
            ) : (
              <GroupedModelSelector
                groups={modelGroups}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                isOpen={isModelSelectorOpen}
                onOpenChange={setIsModelSelectorOpen}
              />
            )}
          </YStack>

          {/* Comparison Mode Section */}
          <YStack gap={12}>
            <Text
              fontSize={11}
              fontWeight="600"
              textTransform="uppercase"
              color="$color9"
              letterSpacing={1}
              fontFamily="$heading"
            >
              Comparison Mode
            </Text>
            <XStack
              alignItems="center"
              gap={12}
              padding={8}
              marginHorizontal={-8}
              borderRadius={6}
              hoverStyle={{ backgroundColor: '$color3' }}
              pressStyle={{ backgroundColor: '$color3' }}
              onPress={handleCompareModeToggle}
              cursor="pointer"
            >
              <Checkbox
                checked={compareMode}
                pointerEvents="none"
                backgroundColor={compareMode ? '$primary6' : 'transparent'}
                borderWidth={2}
                borderColor={compareMode ? '$primary6' : '$color6'}
                borderRadius={999}
                width={22}
                height={22}
              >
                <Checkbox.Indicator>
                  <Check size={14} color="#FFFFFF" />
                </Checkbox.Indicator>
              </Checkbox>
              <Text
                fontSize={15}
                fontWeight="500"
                color="$color"
                fontFamily="$heading"
              >
                Compare multiple models
              </Text>
            </XStack>
          </YStack>
        </YStack>

        {/* Transcribe Button */}
        <Button
          width="100%"
          backgroundColor="hsl(30, 90%, 55%)"
          hoverStyle={{ backgroundColor: 'hsl(30, 90%, 60%)' }}
          pressStyle={{ backgroundColor: 'hsl(30, 90%, 65%)' }}
          paddingHorizontal={16}
          paddingVertical={18}
          borderRadius={8}
          height={60}
          onPress={onTranscribe}
          disabled={isTranscribing}
          disabledStyle={{ opacity: 0.6 }}
          aria-label="Start transcription"
        >
          <Text
            fontSize={17}
            fontWeight="600"
            color="#FFFFFF"
            fontFamily="$heading"
          >
            {isTranscribing ? 'Transcribing...' : 'Transcribe'}
          </Text>
        </Button>
      </YStack>

      {/* Bottom Links */}
      <YStack gap={8}>
        <Button
          width="100%"
          backgroundColor="transparent"
          justifyContent="flex-start"
          paddingHorizontal={12}
          paddingVertical={12}
          borderRadius={6}
          hoverStyle={{ backgroundColor: '$color3' }}
          pressStyle={{ backgroundColor: '$color3' }}
          onPress={onAdvancedSettings}
          icon={<SettingsIcon size={18} color={theme.color10?.val} />}
          aria-label="Advanced settings"
        >
          <Text
            fontSize={15}
            fontWeight="500"
            color="$color"
            fontFamily="$heading"
          >
            Advanced Settings
          </Text>
        </Button>
        <Button
          width="100%"
          backgroundColor="transparent"
          justifyContent="flex-start"
          paddingHorizontal={12}
          paddingVertical={12}
          borderRadius={6}
          hoverStyle={{ backgroundColor: '$color3' }}
          pressStyle={{ backgroundColor: '$color3' }}
          onPress={onManageModels}
          icon={<FolderIcon size={18} color={theme.color10?.val} />}
          aria-label="Manage models"
        >
          <Text
            fontSize={15}
            fontWeight="500"
            color="$color"
            fontFamily="$heading"
          >
            Manage Models
          </Text>
        </Button>
      </YStack>
    </YStack>
  )
}
