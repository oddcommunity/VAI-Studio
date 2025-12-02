/**
 * Models Hook
 * Manages model loading and operations
 */

import { useState, useEffect, useCallback } from 'react'
import { modelService } from '@services/model.service'
import { useAppStore } from '@stores/useAppStore'
import { useToastStore } from '@stores/useToastStore'
// Types imported from local types file

export function useModels() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { backends, setBackends } = useAppStore()
  const { showToast } = useToastStore()

  // Load backends on mount
  useEffect(() => {
    loadBackends()
  }, [])

  const loadBackends = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const backendsData = await modelService.listBackends()
      setBackends(backendsData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load backends'
      setError(message)
      showToast(message, 'error', 5000)
    } finally {
      setLoading(false)
    }
  }, [setBackends, showToast])

  const downloadModel = useCallback(async (backend: string, modelName: string) => {
    try {
      showToast(`Downloading ${modelName}...`, 'info', 2000)
      await modelService.downloadModel(backend, modelName)
      showToast(`${modelName} downloaded successfully!`, 'success')

      // Reload backends to update installed status
      await loadBackends()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download model'
      showToast(message, 'error', 5000)
      throw err
    }
  }, [showToast, loadBackends])

  const getInstalledModels = useCallback(() => {
    return modelService.getInstalledModels(backends)
  }, [backends])

  const getAvailableModels = useCallback(() => {
    return modelService.getAvailableModels(backends)
  }, [backends])

  const isModelInstalled = useCallback((backend: string, modelName: string) => {
    return modelService.isModelInstalled(backends, backend, modelName)
  }, [backends])

  return {
    backends,
    loading,
    error,
    loadBackends,
    downloadModel,
    getInstalledModels,
    getAvailableModels,
    isModelInstalled
  }
}
