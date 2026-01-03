/**
 * Authentication Service
 * Handles HuggingFace and Supabase authentication
 *
 * Security: Uses PKCE and state parameters for OAuth flows
 * to prevent authorization code interception and CSRF attacks.
 */

import { electronBridge } from './electron.bridge'

// OAuth provider type
export type OAuthProvider = 'google' | 'github' | 'apple' | 'azure' | 'discord'

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

  // Supabase Authentication (with PKCE security)

  /**
   * Sign in with email (OTP verification code)
   * Sends a 6-digit code to the user's email
   */
  async signInWithEmail(email: string) {
    return electronBridge.auth.signInWithEmail(email)
  }

  /**
   * Verify OTP code entered by user
   */
  async verifyOtp(email: string, code: string) {
    return electronBridge.auth.verifyOtp(email, code)
  }

  /**
   * Sign in with OAuth provider
   * Uses PKCE + state for security, opens browser for auth
   */
  async signInWithOAuth(provider: OAuthProvider) {
    return electronBridge.auth.signInWithOAuth(provider)
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

  /**
   * Handle auth callback URL with state validation
   * Use this when processing callback URLs from OAuth/magic link
   */
  async handleCallback(callbackUrl: string) {
    return electronBridge.auth.handleCallback(callbackUrl)
  }

  /**
   * Clear pending auth state
   * Call this when user cancels auth flow or on timeout
   */
  async clearPending() {
    return electronBridge.auth.clearPending()
  }

  /**
   * Subscribe to auth success events
   * Returns unsubscribe function
   */
  onAuthSuccess(callback: (data: { email?: string; userId?: string }) => void) {
    return electronBridge.auth.onAuthSuccess(callback)
  }

  /**
   * Subscribe to auth error events
   * Returns unsubscribe function
   */
  onAuthError(callback: (data: { error?: string }) => void) {
    return electronBridge.auth.onAuthError(callback)
  }
}

// Export singleton instance
export const authService = new AuthService()
