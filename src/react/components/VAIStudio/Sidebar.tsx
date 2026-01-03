import { useCallback, useState } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  H2,
  Checkbox,
  Separator,
} from '@odd-design-system/ui-components'
import { useSafeTheme } from '../../providers/OddProvider'
import { Check } from '@tamagui/lucide-icons'
import {
  AudioFileIcon,
  MicIcon,
  PlusIcon,
  SettingsIcon,
  FolderIcon,
  CloseIcon,
} from './Icons'
import { GroupedModelSelector, ModelGroup } from './GroupedModelSelector'
import { UserProfileMenu } from '../UserProfileMenu'

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
  /** Callback to clear the selected file */
  onClearFile?: () => void
  /** Batch files for multiple file selection */
  batchFiles?: { path: string; name: string }[]
  /** Callback to remove a batch file by index */
  onRemoveBatchFile?: (index: number) => void
  /** Callback to clear all batch files */
  onClearBatchFiles?: () => void
  /** User profile - email */
  userEmail?: string
  /** User profile - display name */
  userName?: string
  /** User profile - avatar URL */
  userAvatarUrl?: string
  /** User profile - phone number */
  userPhone?: string
  /** Whether the user is authenticated */
  isAuthenticated?: boolean
  /** Callback when user signs out */
  onSignOut?: () => void
  /** Callback when user wants to sign in */
  onSignIn?: () => void
  /** Callback when profile is updated - passes new data for instant update */
  onProfileUpdated?: (data: { name?: string; avatarUrl?: string; phone?: string }) => void
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
  onClearFile,
  batchFiles = [],
  onRemoveBatchFile,
  onClearBatchFiles,
  userEmail,
  userName,
  userAvatarUrl,
  userPhone,
  isAuthenticated = false,
  onSignOut,
  onSignIn,
  onProfileUpdated,
}: SidebarProps) {
  const theme = useSafeTheme()
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false)
  const [isCompareSelectorOpen, setIsCompareSelectorOpen] = useState(false)

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
          <img
            src="./app-icon.png"
            alt="VAI Studio"
            style={{ width: 28, height: 28, borderRadius: 6, display: 'block' }}
          />
          <H2
            margin={0}
            padding={0}
            lineHeight={28}
            fontSize={24}
            fontWeight="700"
            fontFamily="$heading"
            marginTop={5}
            marginLeft={-2}
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
              {/* Selected File Display - Single file */}
              {selectedFile && batchFiles.length === 0 && (
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
                    fontFamily="$body"
                    flex={1}
                    numberOfLines={1}
                  >
                    {selectedFile.split('/').pop()?.split('\\').pop() || selectedFile}
                  </Text>
                  <XStack
                    padding={4}
                    borderRadius={4}
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '$color4' }}
                    pressStyle={{ backgroundColor: '$color5' }}
                    onPress={onClearFile}
                  >
                    <CloseIcon size={14} color={theme.color9?.val} />
                  </XStack>
                </XStack>
              )}
              {/* Batch Files Display - Multiple files */}
              {batchFiles.length > 0 && (
                <YStack gap={6}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize={12} color="$color9" fontFamily="$body">
                      {batchFiles.length} file{batchFiles.length > 1 ? 's' : ''} selected
                    </Text>
                    <Text
                      fontSize={12}
                      color="$primary8"
                      fontFamily="$body"
                      cursor="pointer"
                      hoverStyle={{ opacity: 0.7 }}
                      onPress={onClearBatchFiles}
                    >
                      Clear all
                    </Text>
                  </XStack>
                  {batchFiles.map((file, index) => (
                    <XStack
                      key={file.path}
                      backgroundColor="$color3"
                      borderRadius={6}
                      padding={10}
                      alignItems="center"
                      gap={8}
                    >
                      <AudioFileIcon size={14} color={theme.primary8?.val} />
                      <Text
                        fontSize={12}
                        color="$color"
                        fontFamily="$body"
                        flex={1}
                        numberOfLines={1}
                      >
                        {file.name}
                      </Text>
                      <XStack
                        padding={4}
                        borderRadius={4}
                        cursor="pointer"
                        hoverStyle={{ backgroundColor: '$color4' }}
                        pressStyle={{ backgroundColor: '$color5' }}
                        onPress={() => onRemoveBatchFile?.(index)}
                      >
                        <CloseIcon size={12} color={theme.color9?.val} />
                      </XStack>
                    </XStack>
                  ))}
                </YStack>
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

        {/* User Profile */}
        <Separator marginVertical={8} backgroundColor="$color4" />
        <UserProfileMenu
          email={userEmail}
          name={userName}
          avatarUrl={userAvatarUrl}
          phone={userPhone}
          isAuthenticated={isAuthenticated}
          onSignOut={onSignOut}
          onSignIn={onSignIn}
          onProfileUpdated={onProfileUpdated}
        />
      </YStack>
    </YStack>
  )
}
