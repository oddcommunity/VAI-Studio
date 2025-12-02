/**
 * Settings Hook
 * Provides access to user settings
 */

import { useSettingsStore } from '@stores/useSettingsStore'
import { useToastStore } from '@stores/useToastStore'
import { useCallback } from 'react'

export function useSettings() {
  const settings = useSettingsStore()
  const { showToast } = useToastStore()

  const saveSettings = useCallback((updates: Partial<typeof settings>) => {
    try {
      settings.saveSettings(updates)
      showToast('Settings saved successfully!', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      showToast(message, 'error')
    }
  }, [settings, showToast])

  const resetSettings = useCallback(() => {
    try {
      settings.resetSettings()
      showToast('Settings reset to defaults', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset settings'
      showToast(message, 'error')
    }
  }, [settings, showToast])

  return {
    ...settings,
    saveSettings,
    resetSettings
  }
}
