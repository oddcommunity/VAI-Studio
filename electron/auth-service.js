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
const { electronStorage } = require('@odd-core/storage/electron');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

const logger = getLogger();

// Supabase configuration
// Note: The anon key is a PUBLIC key designed for client-side use.
// It only provides access controlled by Row Level Security (RLS) policies.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjiexzktmduoguxvleiy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqaWV4emt0bWR1b2d1eHZsZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjU1MjEsImV4cCI6MjA3OTUwMTUyMX0.r7mYQfY6oguDLKZW7R-c7yKDWhwDBFB16IFDgNF1q4c';

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
const WEB_BOUNCE_URL = 'https://auth.odd.community/callback?app=vai-studio';

// Email magic links: Use web bounce page (Supabase doesn't allow custom schemes)
// OAuth: Use deep link directly (OAuth providers handle custom schemes better)
const EMAIL_REDIRECT_URL = WEB_BOUNCE_URL;
const OAUTH_REDIRECT_URL = DEEP_LINK_REDIRECT_URL;

// Log the configured redirect URLs on module load
console.log('[AuthService] Email redirect URL:', EMAIL_REDIRECT_URL);
console.log('[AuthService] OAuth redirect URL:', OAUTH_REDIRECT_URL);

/**
 * Normalize phone number to E.164 format using libphonenumber-js
 * (Google's phone number parsing library - industry standard)
 *
 * Accepts various formats:
 * - US: "6175556453", "(617) 555-6453", "617-555-6453" → "+16175556453"
 * - US with country code: "16175556453", "+16175556453" → "+16175556453"
 * - International: "+447911123456", "+81312345678" → preserved as-is
 *
 * @param {string} phone - Raw phone number input
 * @param {string} defaultCountry - Default country code (ISO 3166-1 alpha-2), defaults to 'US'
 * @returns {string|null} - E.164 formatted number or null if invalid
 */
function normalizePhoneNumber(phone, defaultCountry = 'US') {
  if (!phone) return null;

  try {
    // Parse with default country for numbers without country code
    const phoneNumber = parsePhoneNumberFromString(phone, defaultCountry);

    if (!phoneNumber) {
      // If parsing fails, try without default country (for fully qualified numbers)
      const phoneNumberNoDefault = parsePhoneNumberFromString(phone);
      if (phoneNumberNoDefault && phoneNumberNoDefault.isValid()) {
        return phoneNumberNoDefault.number; // E.164 format
      }
      return null;
    }

    // Return E.164 format if valid, otherwise null
    if (phoneNumber.isValid()) {
      return phoneNumber.number; // E.164 format, e.g., "+16175556453"
    }

    // If not strictly valid but possible, still return E.164
    // (allows slightly malformed but recognizable numbers)
    if (phoneNumber.isPossible()) {
      return phoneNumber.number;
    }

    return null;
  } catch (error) {
    console.warn('[AuthService] Phone number parsing error:', error.message);
    return null;
  }
}

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
   * Sign in with email using OTP verification code
   * Sends a 6-digit code to the user's email for verification
   */
  async signInWithEmail(email) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      console.log('[AuthService] === SIGN IN WITH EMAIL (OTP) ===');
      console.log('[AuthService] Email:', email);

      logger.info('Sending OTP code to email', { email });

      // Use Supabase's signInWithOtp - sends a 6-digit code instead of magic link
      // No redirect URL needed since user enters the code in-app
      const { data, error } = await this.supabaseClient.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Create user if doesn't exist
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('[AuthService] OTP code sent successfully');

      logger.info('OTP code sent successfully', { email });

      return {
        success: true,
        message: 'Check your email for the verification code'
      };
    } catch (error) {
      logger.error('Failed to send OTP code', {
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
   * Verify OTP code entered by user
   * @param {string} email - The email address used to sign in
   * @param {string} code - The 6-digit verification code
   */
  async verifyOtpCode(email, code) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      console.log('[AuthService] === VERIFY OTP CODE ===');
      console.log('[AuthService] Email:', email);
      console.log('[AuthService] Code length:', code?.length);

      logger.info('Verifying OTP code', { email, codeLength: code?.length });

      // Verify the OTP code
      console.log('[AuthService] Calling verifyOtp with:', { email, token: code, type: 'email' });
      const { data, error } = await this.supabaseClient.auth.verifyOtp({
        email,
        token: code,
        type: 'email' // OTP type for email verification
      });

      console.log('[AuthService] verifyOtp response:', { data, error });

      if (error) {
        console.error('[AuthService] verifyOtp error details:', error);
        throw new Error(error.message);
      }

      if (!data.session) {
        throw new Error('No session returned after OTP verification');
      }

      // Store the session
      this.currentSession = data.session;

      console.log('[AuthService] OTP verification successful');

      logger.info('OTP verification successful', {
        email,
        userId: data.user?.id
      });

      return {
        success: true,
        session: data.session,
        user: data.user
      };
    } catch (error) {
      logger.error('OTP verification failed', {
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
   *
   * Supports two flows:
   * 1. PKCE flow (magic links): URL contains ?token_hash=...&type=email
   *    - Uses verifyOtp() to exchange token_hash for session
   * 2. Implicit flow (OAuth): URL contains #access_token=...
   *    - Uses AuthManager.handleAuthCallback() to parse tokens
   */
  async handleAuthCallback(callbackUrl) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      logger.info('Handling secure auth callback', {
        urlPrefix: callbackUrl.substring(0, 80) + '...',
        hasPendingState: !!this.pendingAuthState
      });

      // Parse URL to detect flow type
      const url = new URL(callbackUrl);
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type');

      let session = null;
      let user = null;

      if (tokenHash && type) {
        // PKCE flow: Exchange token_hash for session using verifyOtp
        logger.info('PKCE flow detected - exchanging token_hash via verifyOtp', { type });

        const { data, error } = await this.supabaseClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: type // 'email' for magic links
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.session) {
          session = {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresIn: data.session.expires_in || 3600,
            tokenType: data.session.token_type || 'bearer',
            user: data.session.user
          };
          user = data.user;
        }

        logger.info('PKCE token exchange successful', {
          userId: data.user?.id,
          email: data.user?.email
        });
      } else {
        // Implicit flow (OAuth): Use AuthManager's handler for hash fragment tokens
        logger.info('Implicit flow detected - parsing tokens from URL hash');

        const result = await this.authManager.handleAuthCallback(
          callbackUrl,
          this.pendingAuthState // Pass expected state for validation
        );

        session = result.session;
        user = result.user;
      }

      if (session) {
        // Set session on storage-enabled client (auto-persists to electronStorage)
        const { error: setError } = await this.supabaseClient.auth.setSession({
          access_token: session.accessToken,
          refresh_token: session.refreshToken
        });

        if (setError) {
          logger.warn('Failed to persist session to storage', { error: setError.message });
        }

        this.currentSession = {
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_in: session.expiresIn,
          token_type: session.tokenType,
          user: session.user
        };

        logger.info('Auth callback processed successfully', {
          userId: session.user?.id,
          email: session.user?.email,
          persistedToStorage: !setError
        });
      }

      // Clear pending auth state
      this.pendingAuthState = null;
      this.pendingCodeVerifier = null;

      return {
        success: true,
        session: session,
        user: user
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

  /**
   * Get user profile data (display name, avatar, phone from user_metadata and auth)
   */
  async getProfile() {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    if (!this.currentSession?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const userId = this.currentSession.user.id;

      // Get user data (includes metadata and phone)
      const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();

      if (userError) {
        throw userError;
      }

      // Try to get display_name from profiles table as fallback
      let profileDisplayName = null;
      try {
        const { data: profileData, error: profileError } = await this.supabaseClient
          .from('profiles')
          .select('display_name')
          .eq('user_id', userId)
          .single();

        // PGRST116 = no rows found, which is OK for new users
        if (!profileError || profileError.code === 'PGRST116') {
          profileDisplayName = profileData?.display_name;
        }
      } catch (e) {
        // profiles table might not exist - that's OK
      }

      // Priority: user_metadata.full_name > user_metadata.display_name > profiles.display_name > user_metadata.name
      const displayName = user?.user_metadata?.full_name
        || user?.user_metadata?.display_name
        || profileDisplayName
        || user?.user_metadata?.name
        || null;

      const phone = user?.user_metadata?.phone || user?.phone || null;
      console.log('[AuthService] getProfile - user_metadata.phone:', user?.user_metadata?.phone, '| auth.phone:', user?.phone, '| resolved:', phone);

      return {
        success: true,
        profile: {
          userId,
          email: user?.email || this.currentSession.user.email,
          displayName,
          avatarUrl: user?.user_metadata?.avatar_url || null,
          // Phone stored in user_metadata (top-level auth.phone requires SMS provider)
          phone
        }
      };
    } catch (error) {
      logger.error('Failed to get profile', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user profile (display name, avatar URL, phone)
   * All profile data is stored in user_metadata for visibility in Supabase dashboard
   * Phone is also updated via Supabase auth phone field
   */
  async updateProfile({ displayName, avatarUrl, phone }) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    if (!this.currentSession?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const userId = this.currentSession.user.id;
      logger.info('Updating user profile', {
        userId,
        hasDisplayName: !!displayName,
        hasAvatarUrl: !!avatarUrl,
        hasPhone: !!phone
      });

      // Build update payload for user_metadata
      const updateData = {};

      if (displayName !== undefined) {
        updateData.full_name = displayName;  // Supabase convention for display name
        updateData.display_name = displayName;  // Also store as display_name for backwards compat
      }

      if (avatarUrl !== undefined) {
        updateData.avatar_url = avatarUrl;
      }

      // Store phone in user_metadata (not as top-level auth.phone)
      // Top-level phone requires SMS provider to be configured in Supabase
      // Storing in metadata avoids SMS verification requirement
      // Normalize to E.164 format for future compatibility
      if (phone !== undefined) {
        updateData.phone = phone ? normalizePhoneNumber(phone) : null;
      }

      // Build auth update payload
      const authUpdate = {};

      if (Object.keys(updateData).length > 0) {
        authUpdate.data = updateData;
      }

      // Update user if there's anything to update
      if (Object.keys(authUpdate).length > 0) {
        console.log('[AuthService] Calling updateUser with:', JSON.stringify(authUpdate, null, 2));
        const { data: updateData2, error: userError } = await this.supabaseClient.auth.updateUser(authUpdate);

        if (userError) {
          console.error('[AuthService] updateUser error:', userError);
          throw userError;
        }
        console.log('[AuthService] updateUser success, user_metadata:', JSON.stringify(updateData2?.user?.user_metadata, null, 2));
        logger.info('User profile updated', { userId, fields: Object.keys(authUpdate), phone: updateData2?.user?.user_metadata?.phone });
      }

      // Also update profiles table for backwards compatibility
      if (displayName !== undefined) {
        const { error: profileError } = await this.supabaseClient
          .from('profiles')
          .upsert({
            user_id: userId,
            display_name: displayName,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (profileError) {
          // Log but don't fail - profiles table might not exist
          logger.warn('Failed to update profiles table (may not exist)', { error: profileError.message });
        }
      }

      // Refresh current session to get updated user_metadata
      const { data: { session } } = await this.supabaseClient.auth.refreshSession();
      if (session) {
        this.currentSession = session;
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to update profile', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload avatar image to Supabase storage and update user metadata
   * @param {Buffer} imageBuffer - The image data as a Buffer
   * @param {string} mimeType - The MIME type of the image
   */
  async uploadAvatar(imageBuffer, mimeType) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    if (!this.currentSession?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const userId = this.currentSession.user.id;
      logger.info('Uploading avatar', { userId, mimeType, size: imageBuffer.length });

      // DEBUG: Verify Supabase client has an active session
      let { data: { session: clientSession }, error: sessionError } = await this.supabaseClient.auth.getSession();
      if (sessionError) {
        logger.error('Failed to get session from Supabase client', { error: sessionError.message });
      }

      // If client doesn't have session but we have one stored, explicitly set it
      if (!clientSession && this.currentSession) {
        logger.warn('Supabase client missing session - explicitly setting from stored session');
        const { data: { session: restoredSession }, error: setError } = await this.supabaseClient.auth.setSession({
          access_token: this.currentSession.access_token,
          refresh_token: this.currentSession.refresh_token
        });
        if (setError) {
          logger.error('Failed to set session on Supabase client', { error: setError.message });
        } else {
          clientSession = restoredSession;
          logger.info('Session explicitly set on Supabase client');
        }
      }

      logger.info('Supabase client session state', {
        hasClientSession: !!clientSession,
        clientUserId: clientSession?.user?.id,
        localUserId: userId,
        hasAccessToken: !!clientSession?.access_token,
        tokenPrefix: clientSession?.access_token?.substring(0, 20) + '...'
      });

      // Validate mime type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(mimeType)) {
        return { success: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
      }

      // Generate filename
      const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      const ext = extMap[mimeType] || 'jpg';
      const fileName = `${userId}/${Date.now()}.${ext}`;

      // Upload to avatars bucket
      logger.info('Attempting upload', { fileName, bucket: 'avatars', contentType: mimeType });
      const { data: uploadData, error: uploadError } = await this.supabaseClient.storage
        .from('avatars')
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        // Log full error details
        logger.error('Upload error details', {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: uploadError.statusCode,
          error: uploadError.error,
          cause: uploadError.cause,
          fullError: JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError))
        });
        throw uploadError;
      }

      logger.info('Upload successful', { uploadData });

      // Get public URL
      const { data: { publicUrl } } = this.supabaseClient.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user metadata with avatar URL
      const { error: updateError } = await this.supabaseClient.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        throw updateError;
      }

      // Refresh session
      const { data: { session } } = await this.supabaseClient.auth.refreshSession();
      if (session) {
        this.currentSession = session;
      }

      logger.info('Avatar uploaded successfully', { userId, publicUrl });

      return { success: true, avatarUrl: publicUrl };
    } catch (error) {
      logger.error('Failed to upload avatar', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const authService = new AuthService();

module.exports = {
  authService,
  AuthService,
  DEEP_LINK_REDIRECT_URL
};
