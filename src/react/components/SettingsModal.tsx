import { useState, useCallback, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Select,
  Checkbox,
  Sheet,
} from 'tamagui'
import { X, Settings, Check, ChevronDown, RotateCcw, Save } from '@tamagui/lucide-icons'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useToastStore } from '../stores/useToastStore'
import type { UserSettings } from '../types'

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
  { value: 'auto', label: 'Auto' },
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

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings = useSettingsStore()
  const { showToast } = useToastStore()

  const [localSettings, setLocalSettings] = useState<UserSettings>({
    devicePreference: settings.devicePreference,
    quantization: settings.quantization,
    defaultLanguage: settings.defaultLanguage,
    enableTimestamps: settings.enableTimestamps,
    enableWordTimestamps: settings.enableWordTimestamps,
    modelCachePath: settings.modelCachePath,
    exportPath: settings.exportPath,
    autoScroll: settings.autoScroll,
    showNotifications: settings.showNotifications,
    fontSize: settings.fontSize,
  })

  // Sync local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalSettings({
        devicePreference: settings.devicePreference,
        quantization: settings.quantization,
        defaultLanguage: settings.defaultLanguage,
        enableTimestamps: settings.enableTimestamps,
        enableWordTimestamps: settings.enableWordTimestamps,
        modelCachePath: settings.modelCachePath,
        exportPath: settings.exportPath,
        autoScroll: settings.autoScroll,
        showNotifications: settings.showNotifications,
        fontSize: settings.fontSize,
      })
    }
  }, [open])

  const updateLocalSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setLocalSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSave = useCallback(() => {
    settings.saveSettings(localSettings)
    showToast('Settings saved', 'success', 2000)
    onClose()
  }, [localSettings, settings, showToast, onClose])

  const handleReset = useCallback(() => {
    settings.resetSettings()
    setLocalSettings({
      devicePreference: 'auto',
      quantization: 'auto',
      defaultLanguage: 'auto',
      enableTimestamps: false,
      enableWordTimestamps: false,
      modelCachePath: '',
      exportPath: '',
      autoScroll: true,
      showNotifications: true,
      fontSize: 'medium',
    })
    showToast('Settings reset to defaults', 'info', 2000)
  }, [settings, showToast])

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
      snapPoints={[90]}
      dismissOnSnapToBottom
      zIndex={100000}
    >
      <Sheet.Overlay backgroundColor="rgba(0,0,0,0.75)" />
      <Sheet.Frame backgroundColor="$secondary1" borderTopLeftRadius={16} borderTopRightRadius={16}>
        <Sheet.Handle backgroundColor="$secondary4" />

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
          <Button
            size="$3"
            circular
            chromeless
            onPress={onClose}
            hoverStyle={{ backgroundColor: '$secondary3' }}
          >
            <X size={20} color="$secondary7" />
          </Button>
        </XStack>

        {/* Content */}
        <YStack flex={1} padding={24} gap={32} overflow="scroll">
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
                <Select.Content zIndex={200001}>
                  <Select.Viewport>
                    <Select.Group>
                      {deviceOptions.map((option, index) => (
                        <Select.Item key={option.value} value={option.value} index={index}>
                          <Select.ItemText>{option.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check size={16} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </SettingRow>

            <SettingRow label="Quantization" description="Model precision level">
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
                <Select.Content zIndex={200001}>
                  <Select.Viewport>
                    <Select.Group>
                      {quantizationOptions.map((option, index) => (
                        <Select.Item key={option.value} value={option.value} index={index}>
                          <Select.ItemText>{option.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check size={16} />
                          </Select.ItemIndicator>
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
                <Select.Content zIndex={200001}>
                  <Select.Viewport>
                    <Select.Group>
                      {languages.map((lang, index) => (
                        <Select.Item key={lang.value} value={lang.value} index={index}>
                          <Select.ItemText>{lang.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check size={16} />
                          </Select.ItemIndicator>
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
                <Select.Content zIndex={200001}>
                  <Select.Viewport>
                    <Select.Group>
                      {fontSizeOptions.map((option, index) => (
                        <Select.Item key={option.value} value={option.value} index={index}>
                          <Select.ItemText>{option.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check size={16} />
                          </Select.ItemIndicator>
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
        </YStack>

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
      </Sheet.Frame>
    </Sheet>
  )
}
