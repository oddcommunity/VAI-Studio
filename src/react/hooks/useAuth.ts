/**
 * Authentication Hook
 * Manages HuggingFace and Supabase authentication
 */

import { useState, useCallback } from 'react'
import { authService } from '@services/auth.service'
import { useToastStore } from '@stores/useToastStore'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [hfToken, setHfToken] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)

  const { showToast } = useToastStore()

  // HuggingFace Authentication

  const loadHFToken = useCallback(async () => {
    try {
      const result = await authService.getHFToken()
      if (result.success && result.token) {
        setHfToken(result.token)
        return result.token
      }
      return null
    } catch (err) {
      console.error('[useAuth] Error loading HF token:', err)
      return null
    }
  }, [])

  const saveHFToken = useCallback(async (token: string) => {
    setLoading(true)
    try {
      const result = await authService.saveHFToken(token)
      if (result.success) {
        setHfToken(token)
        showToast('Token saved successfully', 'success')
        return true
      } else {
        showToast(result.error || 'Failed to save token', 'error')
        return false
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save token'
      showToast(message, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const testHFToken = useCallback(async (token: string) => {
    setLoading(true)
    try {
      const result = await authService.testHFToken(token)

      if (result.success && result.valid) {
        const username = result.username ? ` (${result.username})` : ''
        showToast(`Token is valid${username}`, 'success')
        return true
      } else {
        showToast(result.error || 'Invalid token', 'error')
        return false
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test token'
      showToast(message, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const clearHFToken = useCallback(async () => {
    setLoading(true)
    try {
      const result = await authService.clearHFToken()
      if (result.success) {
        setHfToken(null)
        showToast('Token cleared successfully', 'success')
        return true
      } else {
        showToast(result.error || 'Failed to clear token', 'error')
        return false
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear token'
      showToast(message, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const openHFTokenPage = useCallback(async () => {
    try {
      await authService.openHFTokenPage()
    } catch (err) {
      console.error('[useAuth] Error opening HF token page:', err)
    }
  }, [])

  // Supabase Authentication

  const signInWithEmail = useCallback(async (email: string) => {
    setLoading(true)
    try {
      const result = await authService.signInWithEmail(email)
      if (result.success) {
        showToast('Check your email for the login link', 'success', 5000)
        return true
      } else {
        showToast(result.error || 'Failed to sign in', 'error')
        return false
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      showToast(message, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      const result = await authService.signOut()
      if (result.success) {
        setSession(null)
        showToast('Signed out successfully', 'success')
        return true
      } else {
        showToast(result.error || 'Failed to sign out', 'error')
        return false
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out'
      showToast(message, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const loadSession = useCallback(async () => {
    try {
      const result = await authService.getSession()
      if (result.success && result.session) {
        setSession(result.session)
        return result.session
      }
      return null
    } catch (err) {
      console.error('[useAuth] Error loading session:', err)
      return null
    }
  }, [])

  const checkModelAccess = useCallback(async (modelName: string) => {
    try {
      const result = await authService.checkModelAccess(modelName)
      return result.success && result.hasAccess
    } catch (err) {
      console.error('[useAuth] Error checking model access:', err)
      return false
    }
  }, [])

  return {
    loading,
    hfToken,
    session,
    // HuggingFace
    loadHFToken,
    saveHFToken,
    testHFToken,
    clearHFToken,
    openHFTokenPage,
    // Supabase
    signInWithEmail,
    signOut,
    loadSession,
    checkModelAccess
  }
}
