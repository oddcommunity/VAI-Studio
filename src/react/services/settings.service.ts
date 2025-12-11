/**
 * Settings Service
 * Handles user settings persistence using electron-store via IPC
 * Falls back to localStorage for non-Electron environments
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
  fontSize: 'medium',
  hasCompletedOnboarding: false
}

// Check if running in Electron
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.settings
}

export class SettingsService {
  private cachedSettings: UserSettings | null = null

  /**
   * Load settings - uses electron-store in Electron, localStorage as fallback
   * Returns cached settings synchronously, triggers async refresh
   */
  loadSettings(): UserSettings {
    // Return cached if available
    if (this.cachedSettings) {
      return this.cachedSettings
    }

    // Try localStorage first for initial sync load
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        this.cachedSettings = { ...defaultSettings, ...parsed }

        // If in Electron, also load from electron-store async and migrate
        if (isElectron()) {
          this.loadFromElectronStore()
        }

        return this.cachedSettings
      }
    } catch (error) {
      console.error('[SettingsService] Error loading from localStorage:', error)
    }

    // If in Electron, trigger async load from electron-store
    if (isElectron()) {
      this.loadFromElectronStore()
    }

    this.cachedSettings = { ...defaultSettings }
    return this.cachedSettings
  }

  /**
   * Load from electron-store (async) and update cache
   */
  private async loadFromElectronStore(): Promise<void> {
    if (!isElectron()) return

    try {
      const result = await window.electronAPI.settings.get()
      if (result.success && result.settings) {
        this.cachedSettings = { ...defaultSettings, ...result.settings }
        // Sync to localStorage for next sync load
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.cachedSettings))
      } else if (this.cachedSettings) {
        // Migrate localStorage settings to electron-store
        await window.electronAPI.settings.set(this.cachedSettings)
      }
    } catch (error) {
      console.error('[SettingsService] Error loading from electron-store:', error)
    }
  }

  /**
   * Save settings - uses electron-store in Electron, localStorage as fallback
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    this.cachedSettings = settings

    // Always save to localStorage for sync access
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('[SettingsService] Error saving to localStorage:', error)
    }

    // Also save to electron-store if in Electron
    if (isElectron()) {
      try {
        await window.electronAPI.settings.set(settings)
      } catch (error) {
        console.error('[SettingsService] Error saving to electron-store:', error)
      }
    }
  }

  /**
   * Sync version of saveSettings for backwards compatibility
   */
  saveSettingsSync(settings: UserSettings): void {
    this.cachedSettings = settings
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('[SettingsService] Error saving settings:', error)
      throw error
    }

    // Fire and forget electron-store save
    if (isElectron()) {
      window.electronAPI.settings.set(settings).catch(error => {
        console.error('[SettingsService] Error saving to electron-store:', error)
      })
    }
  }

  /**
   * Reset settings to defaults (sync version for backwards compatibility)
   */
  resetSettings(): UserSettings {
    this.cachedSettings = { ...defaultSettings }

    try {
      localStorage.removeItem(SETTINGS_KEY)
    } catch (error) {
      console.error('[SettingsService] Error resetting localStorage:', error)
    }

    // Fire and forget electron-store reset
    if (isElectron()) {
      window.electronAPI.settings.reset().catch(error => {
        console.error('[SettingsService] Error resetting electron-store:', error)
      })
    }

    return this.cachedSettings
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
    this.saveSettingsSync(settings)
    return settings
  }
}

// Export singleton instance
export const settingsService = new SettingsService()
