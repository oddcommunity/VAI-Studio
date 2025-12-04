import React, { ReactNode } from 'react'
import { XStack, YStack } from '@odd-design-system/ui-components'
import { ScrollView } from 'tamagui'
import { Sidebar, SidebarProps, Model } from './Sidebar'
import { WelcomeScreen, WelcomeScreenProps } from './WelcomeScreen'

export interface VAIStudioProps {
  /** Available models for selection */
  models?: Model[]
  /** Currently selected model ID */
  selectedModel?: string
  /** Callback when model selection changes */
  onModelChange?: (modelId: string) => void
  /** Callback when "Select File" is pressed */
  onSelectFile?: () => void
  /** Callback when "Record Audio" is pressed */
  onRecordAudio?: () => void
  /** Callback when "Add Multiple Files" is pressed */
  onAddMultipleFiles?: () => void
  /** Callback when "Transcribe" is pressed */
  onTranscribe?: () => void
  /** Callback when "Advanced Settings" is pressed */
  onAdvancedSettings?: () => void
  /** Callback when "Manage Models" is pressed */
  onManageModels?: () => void
  /** Whether comparison mode is enabled */
  compareMode?: boolean
  /** Callback when comparison mode changes */
  onCompareModeChange?: (enabled: boolean) => void
  /** Whether transcription is in progress */
  isTranscribing?: boolean
  /** Version string to display */
  version?: string
  /** Release date to display */
  releaseDate?: string
  /** Custom content to render instead of WelcomeScreen */
  children?: ReactNode
}

export function VAIStudio({
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
  version = 'v3.0.1',
  releaseDate = 'Nov 26, 2025',
  children,
}: VAIStudioProps) {
  return (
    <XStack
      flex={1}
      height="100%"
      backgroundColor="$background"
      flexDirection="row"
      $sm={{
        flexDirection: 'column',
      }}
    >
      {/* Sidebar */}
      <YStack
        flexGrow={0}
        flexShrink={0}
        width={360}
        maxHeight="100vh"
        $sm={{
          width: '100%',
          maxHeight: 'auto',
        }}
      >
        <ScrollView
          flex={1}
          contentContainerStyle={{
            flexGrow: 1,
          }}
        >
          <Sidebar
            models={models}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            onSelectFile={onSelectFile}
            onRecordAudio={onRecordAudio}
            onAddMultipleFiles={onAddMultipleFiles}
            onTranscribe={onTranscribe}
            onAdvancedSettings={onAdvancedSettings}
            onManageModels={onManageModels}
            compareMode={compareMode}
            onCompareModeChange={onCompareModeChange}
            isTranscribing={isTranscribing}
          />
        </ScrollView>
      </YStack>

      {/* Main Content Area */}
      <ScrollView
        flex={1}
        contentContainerStyle={{
          flexGrow: 1,
          minHeight: '100%',
        }}
      >
        {children ?? (
          <WelcomeScreen version={version} releaseDate={releaseDate} />
        )}
      </ScrollView>
    </XStack>
  )
}

/**
 * VAIStudioScreen - Full screen wrapper for VAIStudio
 * Ensures the component takes the full viewport height
 */
export function VAIStudioScreen(props: VAIStudioProps) {
  return (
    <YStack
      flex={1}
      height="100%"
      minHeight="100vh"
      backgroundColor="$background"
    >
      <VAIStudio {...props} />
    </YStack>
  )
}
