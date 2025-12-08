/**
 * Authentication Service
 * Manages user authentication using @odd-core/auth (Supabase)
 * Provides access to Whisper Tiny model for authenticated users
 */

const { AuthManager } = require('@odd-core/auth');
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

class AuthService {
  constructor() {
    this.authManager = null;
    this.currentSession = null;
    this.initialized = false;
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
   * Sign in with email (OTP)
   * Uses custom redirect URL for Electron deep linking
   */
  async signInWithEmail(email) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      logger.info('Sending OTP to email', { email, redirectTo: AUTH_REDIRECT_URL });

      // Use Supabase client directly to specify custom redirect URL
      const client = this.authManager.getClient();
      const { data, error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: AUTH_REDIRECT_URL
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      logger.info('OTP sent successfully', { email });

      return {
        success: true,
        message: 'Check your email for the login link'
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
   * Set session from tokens (used after deep link callback)
   */
  async setSessionFromTokens(accessToken, refreshToken) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      logger.info('Setting session from tokens');

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
  AUTH_REDIRECT_URL
};
