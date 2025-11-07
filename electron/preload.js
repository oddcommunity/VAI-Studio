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

  // HuggingFace Authentication
  saveHFToken: (token) => ipcRenderer.invoke('save-hf-token', token),
  getHFToken: () => ipcRenderer.invoke('get-hf-token'),
  clearHFToken: () => ipcRenderer.invoke('clear-hf-token'),
  openHFTokenPage: () => ipcRenderer.invoke('open-hf-token-page'),
  testHFToken: (token) => ipcRenderer.invoke('test-hf-token', token),

  // Voice recording
  saveRecording: async (recordingData) => {
    // Convert blob to array buffer for IPC transfer
    const arrayBuffer = await recordingData.blob.arrayBuffer();
    return ipcRenderer.invoke('save-recording', {
      blob: arrayBuffer,
      mimeType: recordingData.mimeType,
      duration: recordingData.duration
    });
  },
  cleanupTempFile: (filePath) => ipcRenderer.invoke('cleanup-temp-file', filePath),

  // License and external links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openLicenseFile: () => ipcRenderer.invoke('open-license-file'),
});

console.log('Preload script loaded');
