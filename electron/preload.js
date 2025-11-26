const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // List all backends
  listBackends: () => ipcRenderer.invoke('list-backends'),

  // List models for a backend
  listModels: (backend) => ipcRenderer.invoke('list-models', { backend }),

  // Transcribe audio
  transcribe: (params) => ipcRenderer.invoke('transcribe', params),

  // Download model
  downloadModel: (backend, modelName) => ipcRenderer.invoke('download-model', { backend, modelName }),

  // Benchmark model
  benchmark: (params) => ipcRenderer.invoke('benchmark', params),

  // Select audio file
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),

  // Select multiple audio files
  selectMultipleAudioFiles: () => ipcRenderer.invoke('select-multiple-audio-files'),

  // Get file info
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', { filePath }),

  // Export result
  exportResult: (result, format, filePath) => ipcRenderer.invoke('export-result', { result, format, filePath }),

  // Save dialog
  saveDialog: (defaultPath, filters) => ipcRenderer.invoke('save-dialog', { defaultPath, filters }),

  // Progress event listeners
  onProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('transcription-progress', subscription);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('transcription-progress', subscription);
    };
  },

  // User Authentication (Supabase)
  auth: {
    signInWithEmail: (email) => ipcRenderer.invoke('auth:sign-in-email', email),
    signOut: () => ipcRenderer.invoke('auth:sign-out'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    checkModelAccess: (modelName) => ipcRenderer.invoke('auth:check-model-access', modelName),
  },

  // HuggingFace Authentication
  saveHFToken: (token) => ipcRenderer.invoke('save-hf-token', token),
  getHFToken: () => ipcRenderer.invoke('get-hf-token'),
  clearHFToken: () => ipcRenderer.invoke('clear-hf-token'),
  openHFTokenPage: () => ipcRenderer.invoke('open-hf-token-page'),
  testHFToken: (token) => ipcRenderer.invoke('test-hf-token', token),

  // Voice recording
  saveRecording: (recordingData) => {
    // recordingData.blob is already an ArrayBuffer from app.js
    return ipcRenderer.invoke('save-recording', recordingData);
  },
  cleanupTempFile: (filePath) => ipcRenderer.invoke('cleanup-temp-file', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  openRecordingsFolder: () => ipcRenderer.invoke('open-recordings-folder'),
  selectFromRecordings: () => ipcRenderer.invoke('select-from-recordings'),

  // License and external links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openLicenseFile: () => ipcRenderer.invoke('open-license-file'),

  // Auto-update (Linear-style)
  restartToUpdate: () => ipcRenderer.invoke('restart-to-update'),
  onUpdateReady: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('update-ready', subscription);
    return () => {
      ipcRenderer.removeListener('update-ready', subscription);
    };
  },
});

console.log('Preload script loaded');
