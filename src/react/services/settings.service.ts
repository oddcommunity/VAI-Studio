/**
 * Settings Service
 * Handles user settings persistence using localStorage
 */

import type { UserSettings } from '../types'

const SETTINGS_KEY = 'vai-studio-settings'

const defaultSettings: UserSettings = {
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
  fontSize: 'medium'
}

export class SettingsService {
  /**
   * Load settings from localStorage
   */
  loadSettings(): UserSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...defaultSettings, ...parsed }
      }
    } catch (error) {
      console.error('[SettingsService] Error loading settings:', error)
    }
    return { ...defaultSettings }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('[SettingsService] Error saving settings:', error)
      throw error
    }
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): UserSettings {
    try {
      localStorage.removeItem(SETTINGS_KEY)
      return { ...defaultSettings }
    } catch (error) {
      console.error('[SettingsService] Error resetting settings:', error)
      throw error
    }
  }

  /**
   * Get default settings
   */
  getDefaults(): UserSettings {
    return { ...defaultSettings }
  }

  /**
   * Update a single setting
   */
  updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): UserSettings {
    const settings = this.loadSettings()
    settings[key] = value
    this.saveSettings(settings)
    return settings
  }
}

// Export singleton instance
export const settingsService = new SettingsService()
