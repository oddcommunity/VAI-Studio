// ElectronAPI types matching the IPC contract from MIGRATION_GUIDE.md

// Exportable result type for transcription export
export interface ExportableResult {
  text?: string;
  segments?: TranscriptSegment[];
  processing_time?: number;
  language?: string;
  device?: string;
}

// File filter for save dialogs
export interface FileFilter {
  name: string;
  extensions: string[];
}

// Session data from Supabase
export interface AuthSession {
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  access_token?: string;
  expires_at?: number;
}

// User profile data
export interface UserProfile {
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
}

export interface ElectronAPI {
  // File Operations
  selectAudioFile(): Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;
  selectMultipleAudioFiles(): Promise<{ success: boolean; canceled?: boolean; filePaths?: string[] }>;
  selectImageFile(): Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;
  selectDirectory(options?: { defaultPath?: string; title?: string }): Promise<{ success: boolean; canceled?: boolean; directoryPath?: string }>;
  selectFromRecordings(): Promise<{ success: boolean; canceled?: boolean; filePath?: string; fileName?: string; duration?: number }>;
  getFileInfo(filePath: string): Promise<{ success: boolean; fileName?: string; fileSizeMB?: string }>;
  showItemInFolder(filePath: string): void;
  saveRecording(data: { blob: ArrayBuffer; mimeType: string; duration: number }): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }>;
  requestMicrophonePermission(): Promise<{ success: boolean; granted?: boolean; needsSystemPreferences?: boolean; message?: string; error?: string }>;

  // Transcription
  listBackends(): Promise<{ success: boolean; backends?: Record<string, Backend>; error?: string }>;
  transcribe(options: TranscribeOptions): Promise<TranscribeResult>;
  downloadModel(backend: string, modelName: string): Promise<{ success: boolean; error?: string }>;
  exportResult(result: ExportableResult, format: string, filePath: string): Promise<{ success: boolean; error?: string }>;
  saveDialog(defaultName: string, filters: FileFilter[]): Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;

  // HuggingFace Auth
  getHFToken(): Promise<{ success: boolean; token?: string }>;
  saveHFToken(token: string): Promise<{ success: boolean; error?: string }>;
  testHFToken(token: string): Promise<{ success: boolean; valid?: boolean; username?: string; error?: string }>;
  clearHFToken(): Promise<{ success: boolean; error?: string }>;
  openHFTokenPage(): Promise<void>;

  // Supabase Auth (with PKCE security)
  auth: {
    // Email magic link auth (uses state for CSRF protection)
    signInWithEmail(email: string): Promise<{ success: boolean; state?: string; error?: string }>;
    // OAuth sign-in (uses PKCE + state, opens browser)
    signInWithOAuth(provider: string): Promise<{ success: boolean; url?: string; state?: string; error?: string }>;
    // Sign out
    signOut(): Promise<{ success: boolean; error?: string }>;
    // Session management
    getSession(): Promise<{ success: boolean; session?: AuthSession | null; error?: string }>;
    checkModelAccess(modelName: string): Promise<{ success: boolean; hasAccess?: boolean; error?: string }>;
    isAuthenticated(): Promise<{ success: boolean; isAuthenticated?: boolean; email?: string; userId?: string; error?: string }>;
    // Legacy: set session from tokens (prefer handleCallback for security)
    setSessionFromTokens?(accessToken: string, refreshToken: string): Promise<{ success: boolean; session?: AuthSession; error?: string }>;
    // Secure: handle callback URL with state validation
    handleCallback(callbackUrl: string): Promise<{ success: boolean; session?: AuthSession; user?: unknown; error?: string }>;
    // Clear pending auth state (for cancellation/timeout)
    clearPending(): Promise<{ success: boolean; error?: string }>;
    // Profile management
    getProfile(): Promise<{ success: boolean; profile?: UserProfile; error?: string }>;
    updateProfile(data: { displayName?: string; avatarUrl?: string; phone?: string }): Promise<{ success: boolean; error?: string }>;
    uploadAvatar(data: { imageData: string; mimeType: string }): Promise<{ success: boolean; avatarUrl?: string; error?: string }>;
    // Event listeners
    onAuthSuccess(callback: (data: { email?: string; userId?: string }) => void): () => void;
    onAuthError(callback: (data: { error?: string }) => void): () => void;
  };

  // App Updates
  onUpdateReady(callback: (updateInfo: { version: string }) => void): () => void;
  restartToUpdate(): void;

  // Progress Events
  onProgress(callback: (data: { progress: number; message: string; stage?: string }) => void): () => void;

  // External Links
  openExternal(url: string): Promise<void>;
  openLicenseFile(): Promise<void>;

  // Clipboard
  copyToClipboard(text: string): Promise<boolean>;

  // Settings persistence (electron-store)
  settings: {
    get(): Promise<{ success: boolean; settings: UserSettings | null; error?: string }>;
    set(settings: UserSettings): Promise<{ success: boolean; error?: string }>;
    update<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<{ success: boolean; settings?: UserSettings; error?: string }>;
    reset(): Promise<{ success: boolean; error?: string }>;
  };
}

// Extend Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Backend and Model Types
export interface Model {
  name: string;
  size: string;
  params: string;
  wer: string;
  installed: boolean;
  features?: string[];
  company?: string;
}

export interface Backend {
  name: string;
  available: boolean;
  models: Model[];
}

// Transcription Types
export interface TranscribeOptions {
  audioPath: string;
  backend: string;
  modelName: string;
  task?: 'transcribe' | 'translate';
  language?: string;
  device?: 'auto' | 'cpu' | 'cuda';
  quantization?: 'auto' | 'fp32' | 'fp16' | 'int8';
}

export interface TranscribeResult {
  success: boolean;
  text?: string;
  processing_time?: number;
  language?: string;
  device?: string;
  error?: string;
  segments?: TranscriptSegment[];
}

export interface TranscriptSegment {
  id?: number;
  start?: number;
  end?: number;
  text: string;
  // Transformers pipeline format (used by quantized models)
  timestamp?: [number, number];
}

// Batch Processing Types
export interface BatchFile {
  path: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: TranscribeResult;
}

// Recording Types
export interface RecordedAudio {
  blob?: Blob;
  mimeType: string;
  duration: number;
  filePath: string;
  fileName: string;
}

// Settings Types
export interface UserSettings {
  devicePreference: 'auto' | 'cpu' | 'cuda';
  quantization: 'auto' | 'fp32' | 'fp16' | 'int8';
  defaultLanguage: string;
  enableTimestamps: boolean;
  enableWordTimestamps: boolean;
  modelCachePath: string;
  exportPath: string;
  recordingsPath: string;
  pdfExportPath: string;
  autoScroll: boolean;
  showNotifications: boolean;
  fontSize: 'small' | 'medium' | 'large';
  hasCompletedOnboarding: boolean;
}

// Progress Types
export interface ProgressData {
  progress: number;
  message: string;
  stage?: 'downloading' | 'loading' | 'transcribing';
}

// Toast Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}
