/**
 * Z-Index Constants
 * Centralized z-index values to ensure consistent layering across the app
 */

export const Z_INDEX = {
  // Base layers
  RECORDING_CONTROLS: 9998,
  LOADING_SCREEN: 9999,

  // Modal and overlay layers
  MODAL: 100000,
  TOAST: 100000,
  UPDATE_BANNER: 100001,

  // Dropdown content inside modals (needs to be above modal)
  SELECT_CONTENT: 200000,
  SELECT_CONTENT_MODAL: 200001,
} as const

export type ZIndexKey = keyof typeof Z_INDEX
