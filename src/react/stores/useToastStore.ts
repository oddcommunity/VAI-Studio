/**
 * Toast Notification Store
 * Manages toast notifications
 */

import { create } from 'zustand'
import type { ToastMessage, ToastType } from '../types'

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

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id)
        }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id)
    })),

  clearAllToasts: () => set({ toasts: [] })
}))
