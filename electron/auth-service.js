/**
 * Authentication Service
 * Manages user authentication using @odd-core/auth (Supabase)
 * Provides access to Whisper Tiny model for authenticated users
 *
 * Security: Uses PKCE (RFC 7636) and state parameters to protect against
 * authorization code interception and CSRF attacks.
 *
 * Storage: Uses electronStorage adapter for unified session persistence
 * across app restarts. No more separate localStorage vs ElectronStore.
 */

const { AuthManager, parseAuthCallbackUrl } = require('@odd-core/auth');
const { createClient } = require('@supabase/supabase-js');
const { getLogger } = require('./odd-core-integration');
const { electronStorage } = require('../odd-core/packages/storage/dist/auth-storage/electron');

const logger = getLogger();

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const SUPABASE_CONFIG = {
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY
};

// Auth callback configuration - PRODUCTION READY
// Deep link for direct app protocol handling
const DEEP_LINK_REDIRECT_URL = 'vai-studio://auth/callback';

// Web bounce page that redirects to deep link (required for magic links)
// Supabase rejects custom schemes in emailRedirectTo, so we use HTTPS bounce page
// The ?app= param tells the bounce page which app scheme to redirect to
const WEB_BOUNCE_URL = 'https://odd.community/auth/callback?app=vai-studio';

// Email magic links: Use web bounce page (Supabase doesn't allow custom schemes)
// OAuth: Use deep link directly (OAuth providers handle custom schemes better)
const EMAIL_REDIRECT_URL = WEB_BOUNCE_URL;
const OAUTH_REDIRECT_URL = DEEP_LINK_REDIRECT_URL;

// Log the configured redirect URLs on module load
console.log('[AuthService] Email redirect URL:', EMAIL_REDIRECT_URL);
console.log('[AuthService] OAuth redirect URL:', OAUTH_REDIRECT_URL);

class AuthService {
  constructor() {
    this.authManager = null;
    this.supabaseClient = null; // Storage-enabled client for session persistence
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
      // Initialize electronStorage adapter
      if (electronStorage.initialize) {
        await electronStorage.initialize();
        logger.info('Electron storage adapter initialized');
      }

      // Create storage-enabled Supabase client for session persistence
      // This ensures sessions are persisted to disk and restored on app restart
      this.supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storage: electronStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // We handle URL parsing manually
        }
      });

      // Initialize Odd-Core AuthManager (for sign-in flows with PKCE)
      this.authManager = new AuthManager(SUPABASE_CONFIG);

      // Try to restore session from storage (now using electronStorage)
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
   * Uses the storage-enabled Supabase client which automatically
   * persists sessions to electronStorage
   */
  async restoreSession() {
    try {
      // Use storage-enabled client - it automatically reads from electronStorage
      const { data: { session }, error } = await this.supabaseClient.auth.getSession();

      if (error) {
        logger.warn('Error getting session', { error: error.message });
        return null;
      }

      if (session) {
        this.currentSession = session;
        logger.info('Session restored from electronStorage', {
          userId: session.user?.id,
          expiresAt: session.expires_at
        });
        return session;
      }

      logger.info('No session found in storage');
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
      console.log('[AuthService] === SIGN IN WITH EMAIL ===');
      console.log('[AuthService] Email:', email);
      console.log('[AuthService] Redirect URL:', EMAIL_REDIRECT_URL);

      logger.info('Sending secure OTP to email', { email, redirectTo: EMAIL_REDIRECT_URL });

      // Use signInWithEmailSecure from AuthManager
      // Note: useState=false for email because appending ?state= to the redirect URL
      // can cause Supabase allowlist matching issues with custom schemes
      const result = await this.authManager.signInWithEmailSecure(email, {
        redirectUrl: EMAIL_REDIRECT_URL,
        useState: false  // Don't append state to URL - causes allowlist mismatch
      });

      console.log('[AuthService] signInWithEmailSecure completed successfully');

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
      logger.info('Initiating secure OAuth flow', { provider, redirectTo: OAUTH_REDIRECT_URL });

      // Use signInWithOAuthSecure from AuthManager for PKCE + state protection
      // OAuth uses deep link because browser is already in navigation mode
      const result = await this.authManager.signInWithOAuthSecure({
        provider,
        redirectUrl: OAUTH_REDIRECT_URL,
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
        // Set session on storage-enabled client (auto-persists to electronStorage)
        const { error: setError } = await this.supabaseClient.auth.setSession({
          access_token: result.session.accessToken,
          refresh_token: result.session.refreshToken
        });

        if (setError) {
          logger.warn('Failed to persist session to storage', { error: setError.message });
        }

        this.currentSession = {
          access_token: result.session.accessToken,
          refresh_token: result.session.refreshToken,
          expires_in: result.session.expiresIn,
          token_type: result.session.tokenType,
          user: result.session.user
        };

        logger.info('Auth callback processed successfully', {
          userId: result.session.user?.id,
          email: result.session.user?.email,
          persistedToStorage: !setError
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
   * Now uses storage-enabled client for automatic persistence
   */
  async setSessionFromTokens(accessToken, refreshToken) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      logger.info('Setting session from tokens');

      // Use storage-enabled client (auto-persists to electronStorage)
      const { data, error } = await this.supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        throw new Error(error.message);
      }

      this.currentSession = data.session;

      logger.info('Session set successfully (persisted to electronStorage)', {
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
   * Check if user has a valid session (authenticated)
   * Now uses the session from electronStorage instead of separate flag
   */
  isUserAuthenticated() {
    return !!this.currentSession;
  }

  /**
   * Get stored user email from current session
   */
  getStoredUserEmail() {
    return this.currentSession?.user?.email || '';
  }

  /**
   * Sign out current user
   * Uses storage-enabled client to clear session from electronStorage
   */
  async signOut() {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      const userId = this.currentSession?.user?.id;

      // Sign out from storage-enabled client (clears from electronStorage)
      await this.supabaseClient.auth.signOut();
      this.currentSession = null;

      logger.info('User signed out (session cleared from electronStorage)', { userId });

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
   * Get current session from storage-enabled client
   */
  async getSession() {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      const { data: { session }, error } = await this.supabaseClient.auth.getSession();

      if (error) {
        throw error;
      }

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
  DEEP_LINK_REDIRECT_URL
};
