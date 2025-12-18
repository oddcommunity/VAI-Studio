import React, { ReactNode } from 'react'
import { XStack, YStack, ScrollView } from '@odd-design-system/ui-components'
import { Sidebar, SidebarProps, Model } from './Sidebar'
import { WelcomeScreen, WelcomeScreenProps } from './WelcomeScreen'
import type { ModelGroup } from './GroupedModelSelector'

export interface VAIStudioProps {
  /** Available models for selection */
  models?: Model[]
  /** Grouped models for selection */
  modelGroups?: ModelGroup[]
  /** Currently selected model ID */
  selectedModel?: string
  /** Callback when model selection changes */
  onModelChange?: (modelId: string) => void
  /** Currently selected models for comparison */
  selectedModels?: string[]
  /** Callback when multi-model selection changes */
  onModelsChange?: (models: string[]) => void
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

export function VAIStudio({
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
  version = 'v1.0.0',
  releaseDate = 'Dec 17, 2025',
  children,
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
      <Sidebar
        models={models}
        modelGroups={modelGroups}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        selectedModels={selectedModels}
        onModelsChange={onModelsChange}
        onSelectFile={onSelectFile}
        onRecordAudio={onRecordAudio}
        onAddMultipleFiles={onAddMultipleFiles}
        onTranscribe={onTranscribe}
        onAdvancedSettings={onAdvancedSettings}
        onManageModels={onManageModels}
        compareMode={compareMode}
        onCompareModeChange={onCompareModeChange}
        isTranscribing={isTranscribing}
        selectedFile={selectedFile}
        onClearFile={onClearFile}
        batchFiles={batchFiles}
        onRemoveBatchFile={onRemoveBatchFile}
        onClearBatchFiles={onClearBatchFiles}
        userEmail={userEmail}
        userName={userName}
        userAvatarUrl={userAvatarUrl}
        userPhone={userPhone}
        isAuthenticated={isAuthenticated}
        onSignOut={onSignOut}
        onSignIn={onSignIn}
        onProfileUpdated={onProfileUpdated}
      />

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
