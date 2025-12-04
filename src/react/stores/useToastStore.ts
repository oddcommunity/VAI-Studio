/**
 * Toast Notification Store
 * Manages toast notifications with proper cleanup
 */

import { create } from 'zustand'
import type { ToastMessage, ToastType } from '../types'

// Store timeout IDs for cleanup
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

interface ToastState {
  toasts: ToastMessage[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  clearAllToasts: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (message, type = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const toast: ToastMessage = { id, message, type, duration }

    set((state) => ({
      toasts: [...state.toasts, toast]
    }))

    // Auto-remove after duration with proper cleanup tracking
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        // Clean up the timeout reference
        toastTimeouts.delete(id)
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id)
        }))
      }, duration)

      // Store timeout for potential cleanup
      toastTimeouts.set(id, timeoutId)
    }
  },

  removeToast: (id) => {
    // Clear any pending timeout for this toast
    const timeoutId = toastTimeouts.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      toastTimeouts.delete(id)
    }

    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  clearAllToasts: () => {
    // Clear all pending timeouts
    toastTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
    toastTimeouts.clear()

    set({ toasts: [] })
  }
}))
