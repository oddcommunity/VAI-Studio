/**
 * Authentication Service
 * Handles HuggingFace and Supabase authentication
 */

import { electronBridge } from './electron.bridge'

export class AuthService {
  // HuggingFace Authentication

  /**
   * Get saved HuggingFace token
   */
  async getHFToken() {
    return electronBridge.getHFToken()
  }

  /**
   * Save HuggingFace token
   */
  async saveHFToken(token: string) {
    return electronBridge.saveHFToken(token)
  }

  /**
   * Test HuggingFace token validity
   */
  async testHFToken(token: string) {
    return electronBridge.testHFToken(token)
  }

  /**
   * Clear saved HuggingFace token
   */
  async clearHFToken() {
    return electronBridge.clearHFToken()
  }

  /**
   * Open HuggingFace token creation page
   */
  async openHFTokenPage() {
    return electronBridge.openHFTokenPage()
  }

  // Supabase Authentication

  /**
   * Sign in with email (magic link)
   */
  async signInWithEmail(email: string) {
    return electronBridge.auth.signInWithEmail(email)
  }

  /**
   * Sign out
   */
  async signOut() {
    return electronBridge.auth.signOut()
  }

  /**
   * Get current session
   */
  async getSession() {
    return electronBridge.auth.getSession()
  }

  /**
   * Check if user has access to a specific model
   */
  async checkModelAccess(modelName: string) {
    return electronBridge.auth.checkModelAccess(modelName)
  }
}

// Export singleton instance
export const authService = new AuthService()
