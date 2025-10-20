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
});

console.log('Preload script loaded');
