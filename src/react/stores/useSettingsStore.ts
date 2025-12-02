/**
 * Settings State Store
 * Manages user settings with localStorage persistence
 */

import { create } from 'zustand'
import { settingsService } from '@services/settings.service'
import type { UserSettings } from '@types/index'

interface SettingsState extends UserSettings {
  // Actions
  loadSettings: () => void
  saveSettings: (settings: Partial<UserSettings>) => void
  resetSettings: () => void
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state from service
  ...settingsService.loadSettings(),

  // Actions
  loadSettings: () => {
    const settings = settingsService.loadSettings()
    set(settings)
  },

  saveSettings: (updates) => {
    const current = get()
    const newSettings: UserSettings = {
      devicePreference: updates.devicePreference ?? current.devicePreference,
      quantization: updates.quantization ?? current.quantization,
      defaultLanguage: updates.defaultLanguage ?? current.defaultLanguage,
      enableTimestamps: updates.enableTimestamps ?? current.enableTimestamps,
      enableWordTimestamps: updates.enableWordTimestamps ?? current.enableWordTimestamps,
      modelCachePath: updates.modelCachePath ?? current.modelCachePath,
      exportPath: updates.exportPath ?? current.exportPath,
      autoScroll: updates.autoScroll ?? current.autoScroll,
      showNotifications: updates.showNotifications ?? current.showNotifications,
      fontSize: updates.fontSize ?? current.fontSize
    }

    settingsService.saveSettings(newSettings)
    set(newSettings)
  },

  resetSettings: () => {
    const defaults = settingsService.resetSettings()
    set(defaults)
  },

  updateSetting: (key, value) => {
    const updated = settingsService.updateSetting(key, value)
    set(updated)
  }
}))
