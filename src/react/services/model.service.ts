/**
 * Model Service
 * Handles backend and model management operations
 */

import { electronBridge } from './electron.bridge'
import type { Backend, Model } from '@types/index'

export class ModelService {
  /**
   * List all available backends and their models
   */
  async listBackends(): Promise<Record<string, Backend>> {
    try {
      const result = await electronBridge.listBackends()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load backends')
      }

      return result.backends || {}
    } catch (error) {
      console.error('[ModelService] Error loading backends:', error)
      throw error
    }
  }

  /**
   * Download a model for a specific backend
   */
  async downloadModel(backend: string, modelName: string): Promise<void> {
    try {
      const result = await electronBridge.downloadModel(backend, modelName)

      if (!result.success) {
        throw new Error(result.error || 'Failed to download model')
      }
    } catch (error) {
      console.error('[ModelService] Error downloading model:', error)
      throw error
    }
  }

  /**
   * Get available models for a specific backend
   */
  getModelsForBackend(backends: Record<string, Backend>, backendName: string): Model[] {
    const backend = backends[backendName]
    return backend?.models || []
  }

  /**
   * Check if a model is installed
   */
  isModelInstalled(backends: Record<string, Backend>, backendName: string, modelName: string): boolean {
    const models = this.getModelsForBackend(backends, backendName)
    const model = models.find(m => m.name === modelName)
    return model?.installed || false
  }

  /**
   * Get all installed models across all backends
   */
  getInstalledModels(backends: Record<string, Backend>): Array<{ backend: string; model: Model }> {
    const installed: Array<{ backend: string; model: Model }> = []

    for (const [backendName, backend] of Object.entries(backends)) {
      if (backend.available) {
        backend.models.forEach(model => {
          if (model.installed) {
            installed.push({ backend: backendName, model })
          }
        })
      }
    }

    return installed
  }

  /**
   * Get available (not installed) models across all backends
   */
  getAvailableModels(backends: Record<string, Backend>): Array<{ backend: string; model: Model }> {
    const available: Array<{ backend: string; model: Model }> = []

    for (const [backendName, backend] of Object.entries(backends)) {
      if (backend.available) {
        backend.models.forEach(model => {
          if (!model.installed) {
            available.push({ backend: backendName, model })
          }
        })
      }
    }

    return available
  }
}

// Export singleton instance
export const modelService = new ModelService()
