import { useCallback, useState, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  H2,
  Checkbox,
  Select,
  useTheme,
} from 'tamagui'
import { Check, ChevronDown } from '@tamagui/lucide-icons'
import {
  GraphicEqIcon,
  AudioFileIcon,
  MicIcon,
  PlusIcon,
  SettingsIcon,
  FolderIcon,
} from './Icons'

export interface Model {
  id: string
  name: string
}

export interface SidebarProps {
  models?: Model[]
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  onSelectFile?: () => void
  onRecordAudio?: () => void
  onAddMultipleFiles?: () => void
  onTranscribe?: () => void
  onAdvancedSettings?: () => void
  onManageModels?: () => void
  compareMode?: boolean
  onCompareModeChange?: (enabled: boolean) => void
  isTranscribing?: boolean
}

export function Sidebar({
  models = [],
  selectedModel = '',
  onModelChange,
  onSelectFile,
  onRecordAudio,
  onAddMultipleFiles,
  onTranscribe,
  onAdvancedSettings,
  onManageModels,
  compareMode = false,
  onCompareModeChange,
  isTranscribing = false,
}: SidebarProps) {
  const theme = useTheme()
  const [isMounted, setIsMounted] = useState(false)

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
      width="100%"
      flexShrink={0}
      backgroundColor="$secondary2"
      borderBottomWidth={1}
      borderBottomColor="$secondary3"
      padding={24}
      gap={32}
      $sm={{
        width: 360,
        borderBottomWidth: 0,
        borderRightWidth: 1,
        borderRightColor: '$secondary3',
      }}
    >
      {/* Header */}
      <YStack gap={4}>
        <XStack alignItems="center" gap={8}>
          <GraphicEqIcon size={32} color={theme.primary8?.val} />
          <H2>
            VAI Studio
          </H2>
        </XStack>
        <Text fontSize={15} color="$secondary9" lineHeight={22}>
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
              color="$secondary6"
              letterSpacing={1}
              fontFamily="$heading"
            >
              Audio Input
            </Text>
            <YStack gap={8}>
              <XStack gap={8}>
                <Button
                  flex={1}
                  backgroundColor="$primary6"
                  hoverStyle={{ backgroundColor: '$primary5' }}
                  pressStyle={{ backgroundColor: '$primary4' }}
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
                  backgroundColor="hsl(0, 84%, 60%)"
                  hoverStyle={{ backgroundColor: 'hsl(0, 84%, 65%)' }}
                  pressStyle={{ backgroundColor: 'hsl(0, 84%, 70%)' }}
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
                borderColor="$secondary4"
                hoverStyle={{ backgroundColor: '$secondary3' }}
                pressStyle={{ backgroundColor: '$secondary4' }}
                paddingHorizontal={16}
                paddingVertical={16}
                borderRadius={8}
                height={56}
                onPress={onAddMultipleFiles}
                icon={<PlusIcon size={20} color={theme.secondary9?.val} />}
                aria-label="Add multiple files"
              >
                <Text
                  fontSize={15}
                  fontWeight="600"
                  color="$secondary9"
                  fontFamily="$heading"
                >
                  Add Multiple Files
                </Text>
              </Button>
            </YStack>
          </YStack>

          {/* Model Section */}
          <YStack gap={12}>
            <Text
              fontSize={11}
              fontWeight="600"
              textTransform="uppercase"
              color="$secondary6"
              letterSpacing={1}
              fontFamily="$heading"
            >
              Model
            </Text>
            {isMounted ? (
              <Select
                value={selectedModel}
                onValueChange={handleModelChange}
              >
                <Select.Trigger
                  width="100%"
                  backgroundColor="$secondary5"
                  borderWidth={0}
                  borderRadius={6}
                  paddingHorizontal={16}
                  paddingVertical={14}
                  height={48}
                  unstyled={false}
                  iconAfter={
                    <ChevronDown
                      size={18}
                      color={theme.secondary9?.val}
                    />
                  }
                >
                  <Select.Value
                    placeholder="Select a model"
                    color="$secondary9"
                    fontSize={15}
                    fontFamily="$heading"
                  />
                </Select.Trigger>
                <Select.Content zIndex={200000}>
                  <Select.ScrollUpButton />
                  <Select.Viewport>
                    <Select.Group>
                      {models.length === 0 ? (
                        <Select.Item value="none" index={0}>
                          <Select.ItemText>No models available</Select.ItemText>
                        </Select.Item>
                      ) : (
                        models.map((model, index) => (
                          <Select.Item key={model.id} value={model.id} index={index}>
                            <Select.ItemText>{model.name}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))
                      )}
                    </Select.Group>
                  </Select.Viewport>
                  <Select.ScrollDownButton />
                </Select.Content>
              </Select>
            ) : (
              <XStack
                width="100%"
                backgroundColor="$secondary5"
                borderRadius={6}
                paddingHorizontal={16}
                paddingVertical={14}
                height={48}
                alignItems="center"
                justifyContent="space-between"
              >
                <Text color="$secondary9" fontSize={15} fontFamily="$heading">
                  Select a model
                </Text>
                <ChevronDown size={18} color={theme.secondary9?.val} />
              </XStack>
            )}
          </YStack>

          {/* Comparison Mode Section */}
          <YStack gap={12}>
            <Text
              fontSize={11}
              fontWeight="600"
              textTransform="uppercase"
              color="$secondary6"
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
              hoverStyle={{ backgroundColor: '$secondary3' }}
              pressStyle={{ backgroundColor: '$secondary3' }}
              onPress={handleCompareModeToggle}
              cursor="pointer"
            >
              <Checkbox
                checked={compareMode}
                onCheckedChange={(checked) =>
                  onCompareModeChange?.(checked === true)
                }
                backgroundColor={compareMode ? '$primary6' : 'transparent'}
                borderWidth={2}
                borderColor={compareMode ? '$primary6' : '$secondary6'}
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
                color="$secondary11"
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
          backgroundColor="hsl(28, 100%, 58%)"
          hoverStyle={{ backgroundColor: 'hsl(28, 100%, 62%)' }}
          pressStyle={{ backgroundColor: 'hsl(28, 100%, 66%)' }}
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
          hoverStyle={{ backgroundColor: '$secondary3' }}
          pressStyle={{ backgroundColor: '$secondary3' }}
          onPress={onAdvancedSettings}
          icon={<SettingsIcon size={18} color={theme.secondary9?.val} />}
          aria-label="Advanced settings"
        >
          <Text
            fontSize={15}
            fontWeight="500"
            color="$secondary9"
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
          hoverStyle={{ backgroundColor: '$secondary3' }}
          pressStyle={{ backgroundColor: '$secondary3' }}
          onPress={onManageModels}
          icon={<FolderIcon size={18} color={theme.secondary9?.val} />}
          aria-label="Manage models"
        >
          <Text
            fontSize={15}
            fontWeight="500"
            color="$secondary9"
            fontFamily="$heading"
          >
            Manage Models
          </Text>
        </Button>
      </YStack>
    </YStack>
  )
}
