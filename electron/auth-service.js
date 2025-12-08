/**
 * Authentication Service
 * Manages user authentication using @odd-core/auth (Supabase)
 * Provides access to Whisper Tiny model for authenticated users
 *
 * Security: Uses PKCE (RFC 7636) and state parameters to protect against
 * authorization code interception and CSRF attacks.
 */

const { AuthManager, parseAuthCallbackUrl } = require('@odd-core/auth');
const { getLogger } = require('./odd-core-integration');
const ElectronStore = require('electron-store');

const logger = getLogger();
const store = new ElectronStore.default();

// Supabase configuration
const SUPABASE_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
};

// Auth callback configuration
// In production, set AUTH_REDIRECT_URL env var to your HTTPS redirect page
// e.g., https://vai.studio/auth-redirect.html
const AUTH_CALLBACK_PORT = 54321;
const AUTH_REDIRECT_URL = process.env.AUTH_REDIRECT_URL || `http://localhost:${AUTH_CALLBACK_PORT}/auth-callback`;

// Deep link protocol for native auth callbacks
const DEEP_LINK_REDIRECT_URL = 'vai-studio://auth/callback';

class AuthService {
  constructor() {
    this.authManager = null;
    this.currentSession = null;
    this.initialized = false;
    // Track pending auth state for CSRF validation
    this.pendingAuthState = null;
    this.pendingCodeVerifier = null;
  }

  /**
   * Initialize the authentication service
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Auth service already initialized');
      return;
    }

    try {
      // Initialize Odd-Core AuthManager
      this.authManager = new AuthManager(SUPABASE_CONFIG);

      // Try to restore session from storage
      await this.restoreSession();

      this.initialized = true;
      logger.info('Auth service initialized successfully', {
        hasSession: !!this.currentSession
      });
    } catch (error) {
      logger.error('Failed to initialize auth service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Restore session from storage
   */
  async restoreSession() {
    try {
      const session = await this.authManager.getSession();

      if (session) {
        this.currentSession = session;
        logger.info('Session restored', {
          userId: session.user?.id,
          expiresAt: session.expires_at
        });
        return session;
      }

      return null;
    } catch (error) {
      logger.error('Failed to restore session', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Sign in with email (OTP) using secure state parameter
   * Uses PKCE state for CSRF protection on callback
   */
  async signInWithEmail(email) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      logger.info('Sending secure OTP to email', { email, redirectTo: AUTH_REDIRECT_URL });

      // Use signInWithEmailSecure from AuthManager for CSRF protection
      const result = await this.authManager.signInWithEmailSecure(email, {
        redirectUrl: AUTH_REDIRECT_URL,
        useState: true
      });

      // Store the state for callback validation
      this.pendingAuthState = result.state;

      logger.info('OTP sent successfully with state protection', {
        email,
        stateLength: result.state?.length
      });

      return {
        success: true,
        message: 'Check your email for the login link',
        state: result.state // Return state so it can be stored if needed
      };
    } catch (error) {
      logger.error('Failed to send OTP', {
        email,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sign in with OAuth provider using PKCE and state
   * Returns the auth URL to open in browser
   */
  async signInWithOAuth(provider) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      logger.info('Initiating secure OAuth flow', { provider, redirectTo: DEEP_LINK_REDIRECT_URL });

      // Use signInWithOAuthSecure from AuthManager for PKCE + state protection
      const result = await this.authManager.signInWithOAuthSecure({
        provider,
        redirectUrl: DEEP_LINK_REDIRECT_URL,
        usePKCE: true,
        useState: true
      });

      // Store state and code verifier for callback validation
      this.pendingAuthState = result.state;
      this.pendingCodeVerifier = result.codeVerifier;

      logger.info('OAuth URL generated with PKCE protection', {
        provider,
        hasUrl: !!result.url,
        stateLength: result.state?.length,
        hasCodeVerifier: !!result.codeVerifier
      });

      return {
        success: true,
        url: result.url,
        state: result.state
      };
    } catch (error) {
      logger.error('Failed to initiate OAuth', {
        provider,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle auth callback URL with state validation (SECURE)
   * This is the primary method for processing auth callbacks
   */
  async handleAuthCallback(callbackUrl) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      logger.info('Handling secure auth callback', {
        urlPrefix: callbackUrl.substring(0, 50) + '...',
        hasPendingState: !!this.pendingAuthState
      });

      // Use AuthManager's secure callback handler with state validation
      const result = await this.authManager.handleAuthCallback(
        callbackUrl,
        this.pendingAuthState // Pass expected state for validation
      );

      if (result.session) {
        this.currentSession = {
          access_token: result.session.accessToken,
          refresh_token: result.session.refreshToken,
          expires_in: result.session.expiresIn,
          token_type: result.session.tokenType,
          user: result.session.user
        };

        // Mark user as permanently authenticated
        store.set('vai_authenticated', true);
        store.set('vai_user_email', result.session.user?.email || '');

        logger.info('Auth callback processed successfully', {
          userId: result.session.user?.id,
          email: result.session.user?.email
        });
      }

      // Clear pending auth state
      this.pendingAuthState = null;
      this.pendingCodeVerifier = null;

      return {
        success: true,
        session: result.session,
        user: result.user
      };
    } catch (error) {
      // Clear pending state on error too
      this.pendingAuthState = null;
      this.pendingCodeVerifier = null;

      logger.error('Auth callback failed', { error: error.message });

      // Check if this is a CSRF attack warning
      if (error.message.includes('CSRF')) {
        logger.warn('Possible CSRF attack detected - state mismatch');
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set session from tokens (legacy method, prefer handleAuthCallback)
   * Kept for backwards compatibility with existing callback server
   */
  async setSessionFromTokens(accessToken, refreshToken) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      logger.info('Setting session from tokens (legacy method)');

      const client = this.authManager.getClient();
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        throw new Error(error.message);
      }

      this.currentSession = data.session;

      // Mark user as permanently authenticated
      store.set('vai_authenticated', true);
      store.set('vai_user_email', data.session?.user?.email || '');

      logger.info('Session set successfully', {
        userId: data.session?.user?.id,
        email: data.session?.user?.email
      });

      return {
        success: true,
        session: data.session
      };
    } catch (error) {
      logger.error('Failed to set session', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate a state parameter against the pending state
   */
  validateState(receivedState) {
    if (!this.pendingAuthState) {
      logger.warn('No pending auth state to validate against');
      return false;
    }
    const isValid = receivedState === this.pendingAuthState;
    if (!isValid) {
      logger.warn('State validation failed', {
        expected: this.pendingAuthState.substring(0, 8) + '...',
        received: receivedState?.substring(0, 8) + '...'
      });
    }
    return isValid;
  }

  /**
   * Get the pending auth state (for external validation)
   */
  getPendingState() {
    return this.pendingAuthState;
  }

  /**
   * Clear pending auth state (e.g., on timeout or cancellation)
   */
  clearPendingAuth() {
    this.pendingAuthState = null;
    this.pendingCodeVerifier = null;
    logger.info('Pending auth state cleared');
  }

  /**
   * Check if user has completed one-time authentication
   */
  isUserAuthenticated() {
    return store.get('vai_authenticated', false);
  }

  /**
   * Get stored user email
   */
  getStoredUserEmail() {
    return store.get('vai_user_email', '');
  }

  /**
   * Sign out current user
   */
  async signOut() {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      const userId = this.currentSession?.user?.id;

      await this.authManager.signOut();
      this.currentSession = null;

      logger.info('User signed out', { userId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to sign out', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      const session = await this.authManager.getSession();
      this.currentSession = session;

      return {
        success: true,
        session: session ? {
          user: {
            id: session.user.id,
            email: session.user.email
          },
          expiresAt: session.expires_at
        } : null
      };
    } catch (error) {
      logger.error('Failed to get session', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentSession;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    if (!this.currentSession) {
      return null;
    }

    return {
      id: this.currentSession.user.id,
      email: this.currentSession.user.email
    };
  }

  /**
   * Check if user has access to a model
   * Authenticated users get Whisper Tiny for free
   * Other models require HuggingFace token
   */
  hasModelAccess(modelName) {
    // Whisper Tiny is free for authenticated users
    if (modelName.toLowerCase().includes('whisper') &&
        modelName.toLowerCase().includes('tiny')) {
      return this.isAuthenticated();
    }

    // Other models require HuggingFace token
    // This will be checked separately
    return false;
  }
}

// Export singleton instance
const authService = new AuthService();

module.exports = {
  authService,
  AuthService,
  AUTH_CALLBACK_PORT,
  AUTH_REDIRECT_URL,
  DEEP_LINK_REDIRECT_URL
};
