import { useState, useCallback, useEffect } from 'react'
import { YStack, XStack, Text, Button, Select, Checkbox, Dialog, Input, Spinner, ScrollView } from '@odd-design-system/ui-components'
import { X, Settings, Check, ChevronDown, RotateCcw, Save, ExternalLink, Trash2, CheckCircle, XCircle, FolderOpen, FileText } from '@tamagui/lucide-icons'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useToastStore } from '../stores/useToastStore'
import { electronBridge } from '../services/electron.bridge'
import { Z_INDEX } from '../constants/zIndex'
import type { UserSettings } from '../types'

type HFTokenStatus = 'none' | 'saved' | 'testing' | 'valid' | 'invalid'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const languages = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
]

const deviceOptions = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'cpu', label: 'CPU Only' },
  { value: 'cuda', label: 'CUDA (GPU)' },
]

const quantizationOptions = [
  { value: 'auto', label: 'Auto (Hardware Optimized)' },
  { value: 'fp32', label: 'FP32 (Full Precision)' },
  { value: 'fp16', label: 'FP16 (Half Precision)' },
  { value: 'int8', label: 'INT8 (Quantized)' },
]

const fontSizeOptions = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack gap={12}>
      <Text
        fontSize={11}
        fontWeight="600"
        textTransform="uppercase"
        letterSpacing={1}
        color="$secondary6"
      >
        {title}
      </Text>
      <YStack gap={16}>{children}</YStack>
    </YStack>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <XStack alignItems="flex-start" justifyContent="space-between" gap={16}>
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="500" color="$secondary11">
          {label}
        </Text>
        {description && (
          <Text fontSize={12} color="$secondary6">
            {description}
          </Text>
        )}
      </YStack>
      <YStack minWidth={160}>{children}</YStack>
    </XStack>
  )
}

function CheckboxRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <XStack
      alignItems="center"
      gap={12}
      padding={8}
      marginHorizontal={-8}
      borderRadius={6}
      hoverStyle={{ backgroundColor: '$secondary3' }}
      pressStyle={{ backgroundColor: '$secondary3' }}
      onPress={() => onCheckedChange(!checked)}
      cursor="pointer"
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        backgroundColor={checked ? '$primary6' : 'transparent'}
        borderWidth={2}
        borderColor={checked ? '$primary6' : '$secondary6'}
        borderRadius={4}
        width={20}
        height={20}
      >
        <Checkbox.Indicator>
          <Check size={14} color="#FFFFFF" />
        </Checkbox.Indicator>
      </Checkbox>
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="500" color="$secondary11">
          {label}
        </Text>
        {description && (
          <Text fontSize={12} color="$secondary6">
            {description}
          </Text>
        )}
      </YStack>
    </XStack>
  )
}

function PathSettingRow({
  label,
  description,
  value,
  onBrowse,
  placeholder = 'Not set (using default)',
}: {
  label: string
  description?: string
  value: string
  onBrowse: () => void
  placeholder?: string
}) {
  return (
    <YStack gap={8}>
      <YStack gap={2}>
        <Text fontSize={14} fontWeight="500" color="$secondary11">
          {label}
        </Text>
        {description && (
          <Text fontSize={12} color="$secondary6">
            {description}
          </Text>
        )}
      </YStack>
      <XStack gap={8} alignItems="center">
        <Input
          flex={1}
          backgroundColor="$secondary3"
          borderWidth={1}
          borderColor="$secondary4"
          borderRadius={6}
          paddingHorizontal={12}
          paddingVertical={8}
          color="$secondary11"
          fontSize={13}
          fontFamily="$mono"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="$secondary6"
          editable={false}
        />
        <Button
          size="$3"
          backgroundColor="$secondary3"
          hoverStyle={{ backgroundColor: '$secondary4' }}
          onPress={onBrowse}
          icon={<FolderOpen size={16} color="$secondary9" />}
        >
          <Text fontSize={13} color="$secondary9">
            Browse
          </Text>
        </Button>
      </XStack>
    </YStack>
  )
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  // Only subscribe to the actions, not the settings themselves to prevent unnecessary re-renders
  const saveSettings = useSettingsStore((state) => state.saveSettings)
  const resetSettings = useSettingsStore((state) => state.resetSettings)

  const { showToast } = useToastStore()

  // HuggingFace token state
  const [hfToken, setHfToken] = useState('')
  const [hfTokenStatus, setHfTokenStatus] = useState<HFTokenStatus>('none')
  const [hfTokenMasked, setHfTokenMasked] = useState('')
  const [isTestingToken, setIsTestingToken] = useState(false)

  // Initialize local settings from store once
  const [localSettings, setLocalSettings] = useState<UserSettings>(() => {
    const currentSettings = useSettingsStore.getState()
    return {
      devicePreference: currentSettings.devicePreference,
      quantization: currentSettings.quantization,
      defaultLanguage: currentSettings.defaultLanguage,
      enableTimestamps: currentSettings.enableTimestamps,
      enableWordTimestamps: currentSettings.enableWordTimestamps,
      modelCachePath: currentSettings.modelCachePath,
      exportPath: currentSettings.exportPath,
      recordingsPath: currentSettings.recordingsPath,
      pdfExportPath: currentSettings.pdfExportPath,
      autoScroll: currentSettings.autoScroll,
      showNotifications: currentSettings.showNotifications,
      fontSize: currentSettings.fontSize,
    }
  })

  // Track if modal was previously open to detect open transitions
  const [wasOpen, setWasOpen] = useState(false)

  // Sync local state ONLY when modal opens (not on every settings change)
  // IMPORTANT: Only depend on 'open' and 'wasOpen' to prevent infinite loops
  useEffect(() => {
    if (open && !wasOpen) {
      // Modal just opened - sync from store
      // Read current values from the store via selectors at this moment
      const currentSettings = useSettingsStore.getState()
      setLocalSettings({
        devicePreference: currentSettings.devicePreference,
        quantization: currentSettings.quantization,
        defaultLanguage: currentSettings.defaultLanguage,
        enableTimestamps: currentSettings.enableTimestamps,
        enableWordTimestamps: currentSettings.enableWordTimestamps,
        modelCachePath: currentSettings.modelCachePath,
        exportPath: currentSettings.exportPath,
        recordingsPath: currentSettings.recordingsPath,
        pdfExportPath: currentSettings.pdfExportPath,
        autoScroll: currentSettings.autoScroll,
        showNotifications: currentSettings.showNotifications,
        fontSize: currentSettings.fontSize,
      })
    }
    setWasOpen(open)
  }, [open, wasOpen])

  // Load saved HF token on modal open
  useEffect(() => {
    if (open && electronBridge.isElectron()) {
      electronBridge.getHFToken().then((result) => {
        if (result.success && result.token) {
          // Show masked token
          const masked = result.token.slice(0, 4) + '****' + result.token.slice(-4)
          setHfTokenMasked(masked)
          setHfTokenStatus('saved')
          setHfToken('')
        } else {
          setHfTokenMasked('')
          setHfTokenStatus('none')
          setHfToken('')
        }
      }).catch(() => {
        setHfTokenStatus('none')
      })
    }
  }, [open])

  // HF Token handlers
  const handleTestHFToken = useCallback(async () => {
    // Get token to test - either from input or retrieve saved token
    let tokenToTest = hfToken.trim()
    const testingSavedToken = !tokenToTest && hfTokenStatus === 'saved'

    // If no token in input but we have a saved token, retrieve it first
    if (testingSavedToken) {
      try {
        const result = await electronBridge.getHFToken()
        if (result.success && result.token) {
          tokenToTest = result.token
        } else {
          showToast('Could not retrieve saved token', 'error', 3000)
          return
        }
      } catch (err) {
        showToast('Failed to retrieve saved token', 'error', 3000)
        return
      }
    }

    if (!tokenToTest) {
      showToast('Please enter a token to test', 'error', 3000)
      return
    }

    setIsTestingToken(true)
    if (!testingSavedToken) {
      setHfTokenStatus('testing')
    }

    try {
      const result = await electronBridge.testHFToken(tokenToTest)
      if (result.success && result.valid) {
        // If we were testing a saved token, keep status as 'saved'
        // If testing new token, show 'valid' status
        if (!testingSavedToken) {
          setHfTokenStatus('valid')
        }
        showToast('Token is valid!', 'success', 3000)
      } else {
        setHfTokenStatus('invalid')
        showToast(result.error || 'Token is invalid', 'error', 3000)
      }
    } catch (err) {
      setHfTokenStatus('invalid')
      showToast('Failed to test token', 'error', 3000)
    } finally {
      setIsTestingToken(false)
    }
  }, [hfToken, hfTokenStatus, showToast])

  const handleSaveHFToken = useCallback(async () => {
    if (!hfToken.trim()) {
      showToast('Please enter a token', 'error', 3000)
      return
    }

    try {
      const result = await electronBridge.saveHFToken(hfToken.trim())
      if (result.success) {
        const masked = hfToken.slice(0, 4) + '****' + hfToken.slice(-4)
        setHfTokenMasked(masked)
        setHfTokenStatus('saved')
        setHfToken('')
        showToast('Token saved successfully', 'success', 3000)
      } else {
        showToast(result.error || 'Failed to save token', 'error', 3000)
      }
    } catch (err) {
      showToast('Failed to save token', 'error', 3000)
    }
  }, [hfToken, showToast])

  const handleClearHFToken = useCallback(async () => {
    try {
      const result = await electronBridge.clearHFToken()
      if (result.success) {
        setHfToken('')
        setHfTokenMasked('')
        setHfTokenStatus('none')
        showToast('Token cleared', 'info', 3000)
      } else {
        showToast(result.error || 'Failed to clear token', 'error', 3000)
      }
    } catch (err) {
      showToast('Failed to clear token', 'error', 3000)
    }
  }, [showToast])

  const handleOpenHFTokenPage = useCallback(() => {
    electronBridge.openHFTokenPage()
  }, [])

  const updateLocalSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setLocalSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSave = useCallback(() => {
    saveSettings(localSettings)
    showToast('Settings saved', 'success', 2000)
    onClose()
  }, [localSettings, saveSettings, showToast, onClose])

  const handleReset = useCallback(() => {
    resetSettings()
    setLocalSettings({
      devicePreference: 'auto',
      quantization: 'auto',
      defaultLanguage: 'auto',
      enableTimestamps: true,
      enableWordTimestamps: false,
      modelCachePath: '',
      exportPath: '',
      recordingsPath: '',
      pdfExportPath: '',
      autoScroll: true,
      showNotifications: true,
      fontSize: 'medium',
    })
    showToast('Settings reset to defaults', 'info', 2000)
  }, [resetSettings, showToast])

  // Directory browse handlers
  const handleBrowseDirectory = useCallback(async (settingKey: 'modelCachePath' | 'exportPath' | 'recordingsPath' | 'pdfExportPath', title: string) => {
    if (!electronBridge.isElectron()) return
    try {
      const result = await electronBridge.selectDirectory({
        defaultPath: localSettings[settingKey] || undefined,
        title,
      })
      if (result.success && result.directoryPath) {
        updateLocalSetting(settingKey, result.directoryPath)
      }
    } catch (err) {
      showToast('Failed to select directory', 'error', 3000)
    }
  }, [localSettings, updateLocalSetting, showToast])

  // License handler
  const handleViewLicense = useCallback(() => {
    electronBridge.openLicenseFile()
  }, [])

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.75}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0,0,0,0.75)"
          zIndex={Z_INDEX.MODAL}
        />
        <Dialog.Content
          key="content"
          bordered
          elevate
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.95 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          backgroundColor="$secondary1"
          borderRadius={16}
          padding={0}
          width="90%"
          maxWidth={700}
          maxHeight="85vh"
          zIndex={Z_INDEX.MODAL + 1}
        >
          {/* Header */}
          <XStack
            padding={20}
            borderBottomWidth={1}
            borderBottomColor="$secondary3"
            alignItems="center"
            justifyContent="space-between"
          >
            <XStack alignItems="center" gap={12}>
              <Settings size={24} color="$secondary9" />
              <Text fontSize={18} fontWeight="600" color="$secondary11">
                Settings
              </Text>
            </XStack>
            <Dialog.Close asChild>
              <Button
                size="$3"
                circular
                chromeless
                onPress={onClose}
                hoverStyle={{ backgroundColor: '$secondary3' }}
              >
                <X size={20} color="$secondary7" />
              </Button>
            </Dialog.Close>
          </XStack>

          {/* Content */}
          <ScrollView
            maxHeight="calc(85vh - 160px)"
            showsVerticalScrollIndicator
          >
            <YStack padding={24} gap={32}>
          {/* HuggingFace Authentication */}
          <SettingSection title="HuggingFace Authentication">
            <YStack gap={12}>
              <Text fontSize={12} color="$secondary6">
                Required for downloading gated models (Granite, Voxtral, Parakeet, Wav2Vec). Whisper models don't require authentication.
              </Text>

              {/* Token Status Display */}
              {hfTokenStatus === 'saved' && (
                <YStack gap={8}>
                  <XStack
                    backgroundColor="$secondary3"
                    padding={12}
                    borderRadius={8}
                    alignItems="center"
                    gap={12}
                  >
                    <CheckCircle size={20} color="$success" />
                    <YStack flex={1}>
                      <Text fontSize={14} fontWeight="500" color="$secondary11">
                        Token Saved
                      </Text>
                      <Text fontSize={12} color="$secondary6" fontFamily="$mono">
                        {hfTokenMasked}
                      </Text>
                    </YStack>
                    <Button
                      size="$2"
                      chromeless
                      onPress={handleClearHFToken}
                      hoverStyle={{ backgroundColor: '$secondary4' }}
                      icon={<Trash2 size={16} color="$errorText" />}
                    />
                  </XStack>

                  {/* Test Saved Token Button */}
                  <Button
                    size="$3"
                    backgroundColor="$secondary3"
                    hoverStyle={{ backgroundColor: '$secondary4' }}
                    onPress={handleTestHFToken}
                    disabled={isTestingToken}
                    icon={isTestingToken ? <Spinner size="small" color="$primary6" /> : undefined}
                  >
                    <Text fontSize={13} color="$secondary11">
                      {isTestingToken ? 'Testing...' : 'Test Saved Token'}
                    </Text>
                  </Button>
                </YStack>
              )}

              {/* Token Input */}
              {hfTokenStatus !== 'saved' && (
                <YStack gap={8}>
                  <XStack gap={8} alignItems="center">
                    <Input
                      flex={1}
                      backgroundColor="$secondary3"
                      borderWidth={1}
                      borderColor={
                        hfTokenStatus === 'valid' ? '$success' :
                        hfTokenStatus === 'invalid' ? '$errorBorder' :
                        '$secondary4'
                      }
                      borderRadius={6}
                      paddingHorizontal={12}
                      paddingVertical={8}
                      placeholder="hf_..."
                      placeholderTextColor="$secondary6"
                      color="$secondary11"
                      fontSize={14}
                      fontFamily="$mono"
                      secureTextEntry
                      value={hfToken}
                      onChangeText={setHfToken}
                    />
                    {hfTokenStatus === 'testing' && (
                      <Spinner size="small" color="$primary6" />
                    )}
                    {hfTokenStatus === 'valid' && (
                      <CheckCircle size={20} color="$success" />
                    )}
                    {hfTokenStatus === 'invalid' && (
                      <XCircle size={20} color="$errorText" />
                    )}
                  </XStack>

                  {/* Action Buttons */}
                  <XStack gap={8}>
                    <Button
                      flex={1}
                      size="$3"
                      backgroundColor="$secondary3"
                      hoverStyle={{ backgroundColor: '$secondary4' }}
                      onPress={handleTestHFToken}
                      disabled={isTestingToken || !hfToken.trim()}
                      icon={isTestingToken ? <Spinner size="small" color="$primary6" /> : undefined}
                    >
                      <Text fontSize={13} color="$secondary11">
                        {isTestingToken ? 'Testing...' : 'Test Token'}
                      </Text>
                    </Button>
                    <Button
                      flex={1}
                      size="$3"
                      backgroundColor="$primary6"
                      hoverStyle={{ backgroundColor: '$primary5' }}
                      onPress={handleSaveHFToken}
                      disabled={isTestingToken || !hfToken.trim()}
                      icon={<Save size={14} color="#FFFFFF" />}
                    >
                      <Text fontSize={13} fontWeight="600" color="#FFFFFF">
                        Save Token
                      </Text>
                    </Button>
                  </XStack>
                </YStack>
              )}

              {/* Help Link */}
              <XStack
                alignItems="center"
                gap={6}
                cursor="pointer"
                onPress={handleOpenHFTokenPage}
                hoverStyle={{ opacity: 0.8 }}
              >
                <ExternalLink size={14} color="$primary6" />
                <Text fontSize={12} color="$primary6">
                  Get your token from huggingface.co/settings/tokens
                </Text>
              </XStack>
            </YStack>
          </SettingSection>

          {/* Processing Settings */}
          <SettingSection title="Processing">
            <SettingRow label="Device" description="Hardware to use for inference">
              <Select
                value={localSettings.devicePreference}
                onValueChange={(value) =>
                  updateLocalSetting('devicePreference', value as 'auto' | 'cpu' | 'cuda')
                }
              >
                <Select.Trigger
                  backgroundColor="$secondary3"
                  borderWidth={0}
                  borderRadius={6}
                  iconAfter={<ChevronDown size={16} color="$secondary7" />}
                >
                  <Select.Value />
                </Select.Trigger>
                <Select.Content zIndex={Z_INDEX.SELECT_CONTENT_MODAL}>
                  <Select.Viewport>
                    <Select.Group>
                      {deviceOptions.map((option, index) => (
                        <Select.Item key={option.value} value={option.value} index={index}>
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </SettingRow>

            <SettingRow label="Quantization" description="FP32: highest quality/memory. FP16: balanced. INT8: fastest/smallest.">
              <Select
                value={localSettings.quantization}
                onValueChange={(value) =>
                  updateLocalSetting('quantization', value as UserSettings['quantization'])
                }
              >
                <Select.Trigger
                  backgroundColor="$secondary3"
                  borderWidth={0}
                  borderRadius={6}
                  iconAfter={<ChevronDown size={16} color="$secondary7" />}
                >
                  <Select.Value />
                </Select.Trigger>
                <Select.Content zIndex={Z_INDEX.SELECT_CONTENT_MODAL}>
                  <Select.Viewport>
                    <Select.Group>
                      {quantizationOptions.map((option, index) => (
                        <Select.Item key={option.value} value={option.value} index={index}>
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </SettingRow>

            <SettingRow label="Default Language" description="Language for transcription">
              <Select
                value={localSettings.defaultLanguage}
                onValueChange={(value) => updateLocalSetting('defaultLanguage', value)}
              >
                <Select.Trigger
                  backgroundColor="$secondary3"
                  borderWidth={0}
                  borderRadius={6}
                  iconAfter={<ChevronDown size={16} color="$secondary7" />}
                >
                  <Select.Value />
                </Select.Trigger>
                <Select.Content zIndex={Z_INDEX.SELECT_CONTENT_MODAL}>
                  <Select.Viewport>
                    <Select.Group>
                      {languages.map((lang, index) => (
                        <Select.Item key={lang.value} value={lang.value} index={index}>
                          <Select.ItemText>{lang.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </SettingRow>
          </SettingSection>

          {/* Output Settings */}
          <SettingSection title="Output">
            <CheckboxRow
              label="Enable Timestamps"
              description="Include segment timestamps in output"
              checked={localSettings.enableTimestamps}
              onCheckedChange={(checked) => updateLocalSetting('enableTimestamps', checked)}
            />
            <CheckboxRow
              label="Enable Word Timestamps"
              description="Include word-level timestamps (slower)"
              checked={localSettings.enableWordTimestamps}
              onCheckedChange={(checked) => updateLocalSetting('enableWordTimestamps', checked)}
            />
          </SettingSection>

          {/* Display Settings */}
          <SettingSection title="Display">
            <SettingRow label="Font Size" description="Text size in results">
              <Select
                value={localSettings.fontSize}
                onValueChange={(value) =>
                  updateLocalSetting('fontSize', value as UserSettings['fontSize'])
                }
              >
                <Select.Trigger
                  backgroundColor="$secondary3"
                  borderWidth={0}
                  borderRadius={6}
                  iconAfter={<ChevronDown size={16} color="$secondary7" />}
                >
                  <Select.Value />
                </Select.Trigger>
                <Select.Content zIndex={Z_INDEX.SELECT_CONTENT_MODAL}>
                  <Select.Viewport>
                    <Select.Group>
                      {fontSizeOptions.map((option, index) => (
                        <Select.Item key={option.value} value={option.value} index={index}>
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </SettingRow>

            <CheckboxRow
              label="Auto-scroll Results"
              description="Automatically scroll to new results"
              checked={localSettings.autoScroll}
              onCheckedChange={(checked) => updateLocalSetting('autoScroll', checked)}
            />
            <CheckboxRow
              label="Show Notifications"
              description="Display toast notifications"
              checked={localSettings.showNotifications}
              onCheckedChange={(checked) => updateLocalSetting('showNotifications', checked)}
            />
          </SettingSection>

          {/* Paths Settings */}
          <SettingSection title="Paths">
            <PathSettingRow
              label="Model Cache Directory"
              description="Where downloaded models are stored"
              value={localSettings.modelCachePath}
              onBrowse={() => handleBrowseDirectory('modelCachePath', 'Select Model Cache Directory')}
            />
            <PathSettingRow
              label="Default Export Directory"
              description="Default location for exported transcriptions"
              value={localSettings.exportPath}
              onBrowse={() => handleBrowseDirectory('exportPath', 'Select Export Directory')}
            />
            <PathSettingRow
              label="Recordings Directory"
              description="Where recorded audio files are saved"
              value={localSettings.recordingsPath}
              onBrowse={() => handleBrowseDirectory('recordingsPath', 'Select Recordings Directory')}
            />
            <PathSettingRow
              label="PDF Export Directory"
              description="Default location for exported PDF files"
              value={localSettings.pdfExportPath}
              onBrowse={() => handleBrowseDirectory('pdfExportPath', 'Select PDF Export Directory')}
            />
          </SettingSection>

          {/* License */}
          <SettingSection title="License">
            <YStack gap={12}>
              <YStack
                backgroundColor="$secondary3"
                padding={16}
                borderRadius={8}
                gap={8}
              >
                <XStack alignItems="center" gap={8}>
                  <FileText size={20} color="$primary6" />
                  <Text fontSize={14} fontWeight="600" color="$secondary11">
                    Apache License 2.0
                  </Text>
                </XStack>
                <Text fontSize={12} color="$secondary6" lineHeight={18}>
                  Copyright 2024 VAI Studio
                </Text>
                <Text fontSize={12} color="$secondary7" lineHeight={18}>
                  Licensed under the Apache License, Version 2.0. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
                </Text>
              </YStack>
              <Button
                size="$3"
                backgroundColor="$secondary3"
                hoverStyle={{ backgroundColor: '$secondary4' }}
                onPress={handleViewLicense}
                icon={<ExternalLink size={16} color="$secondary9" />}
              >
                <Text fontSize={13} color="$secondary9">
                  View Full License
                </Text>
              </Button>
            </YStack>
          </SettingSection>
            </YStack>
          </ScrollView>

          {/* Footer */}
          <XStack
            padding={20}
            borderTopWidth={1}
            borderTopColor="$secondary3"
            gap={12}
            justifyContent="space-between"
          >
            <Button
              size="$4"
              chromeless
              onPress={handleReset}
              hoverStyle={{ backgroundColor: '$secondary3' }}
              icon={<RotateCcw size={16} color="$secondary7" />}
            >
              <Text fontSize={14} color="$secondary9">
                Reset to Defaults
              </Text>
            </Button>

            <XStack gap={12}>
              <Button
                size="$4"
                backgroundColor="$secondary3"
                hoverStyle={{ backgroundColor: '$secondary4' }}
                onPress={onClose}
              >
                <Text fontSize={14} color="$secondary9">
                  Cancel
                </Text>
              </Button>
              <Button
                size="$4"
                backgroundColor="$primary6"
                hoverStyle={{ backgroundColor: '$primary5' }}
                onPress={handleSave}
                icon={<Save size={16} color="#FFFFFF" />}
              >
                <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                  Save Settings
                </Text>
              </Button>
            </XStack>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
