// LocalVoice AI - Main Application Logic
// Version 2.0 - Multi-Backend with Comparison

// State
let state = {
  backends: {},
  selectedBackend: null,
  selectedFile: null,
  comparisonMode: false,
  activeTranscriptions: 0,
  batchMode: false,
  batchFiles: [],
  batchProcessing: false
};

// ========================================
// TOAST NOTIFICATION SYSTEM
// ========================================
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ⓘ',
    warning: '⚠'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">×</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.style.animation = 'toastSlideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }
}

// DOM Elements
const elements = {
  selectFileBtn: document.getElementById('select-file-btn'),
  selectMultipleFilesBtn: document.getElementById('select-multiple-files-btn'),
  fileInfo: document.getElementById('file-info'),
  batchQueue: document.getElementById('batch-queue'),
  backendSelect: document.getElementById('backend-select'),
  modelSelect: document.getElementById('model-select'),
  modelInfo: document.getElementById('model-info'),
  comparisonMode: document.getElementById('comparison-mode'),
  comparisonOptions: document.getElementById('comparison-options'),
  modelSelect2: document.getElementById('model-select-2'),
  modelSelect3: document.getElementById('model-select-3'),
  transcribeBtn: document.getElementById('transcribe-btn'),
  transcribeBatchBtn: document.getElementById('transcribe-batch-btn'),
  batchProgress: document.getElementById('batch-progress'),
  batchCurrent: document.getElementById('batch-current'),
  batchTotal: document.getElementById('batch-total'),
  batchProgressFill: document.getElementById('batch-progress-fill'),
  welcomeScreen: document.getElementById('welcome-screen'),
  resultsContainer: document.getElementById('results-container'),
  loadingScreen: document.getElementById('loading-screen')
};

// Initialize the app
async function init() {
  console.log('Initializing LocalVoice AI...');
  await loadBackends();
  setupEventListeners();
  console.log('Initialization complete');
}

// Load available backends and models
async function loadBackends() {
  try {
    const result = await window.electronAPI.listBackends();
    if (result.success) {
      state.backends = result.backends;
      // Always populate the unified model dropdown showing all backends
      populateAllModelsForComparison();
    } else {
      showError('Failed to load backends: ' + result.error);
    }
  } catch (error) {
    showError('Error loading backends: ' + error.message);
  }
}

// Populate backend dropdown
function populateBackendSelect() {
  elements.backendSelect.innerHTML = '<option value="">Select a backend</option>';
  for (const [name, backend] of Object.entries(state.backends)) {
    if (backend.available) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name.charAt(0).toUpperCase() + name.slice(1) + ' (' + backend.models.length + ' models)';
      elements.backendSelect.appendChild(option);
    }
  }
}

// Populate model dropdowns
function populateModelSelects(backend) {
  const models = state.backends[backend].models;
  [elements.modelSelect, elements.modelSelect2, elements.modelSelect3].forEach(select => {
    select.innerHTML = '<option value="">Select a model</option>';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = JSON.stringify({ backend, model: model.name });
      const installed = model.installed ? ' ✓' : '';
      const company = model.company ? ` (${model.company})` : '';
      option.textContent = `${model.name}${company} (~${model.size}, WER: ${model.wer})${installed}`;
      select.appendChild(option);
    });
  });
  elements.modelSelect.disabled = false;
}

// Populate model dropdowns with ALL models from ALL backends for cross-backend comparison
function populateAllModelsForComparison() {
  // Populate all three selects with all models from all backends
  [elements.modelSelect, elements.modelSelect2, elements.modelSelect3].forEach(select => {
    select.innerHTML = '<option value="">Select a model</option>';

    // Group models by backend
    Object.keys(state.backends).forEach(backendName => {
      const backend = state.backends[backendName];

      // Create optgroup for this backend
      const optgroup = document.createElement('optgroup');
      optgroup.label = `${backend.name} (${backend.models.length} models)`;

      backend.models.forEach(model => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ backend: backendName, model: model.name });
        const installed = model.installed ? ' ✓' : '';
        const company = model.company ? ` (${model.company})` : '';
        option.textContent = `${model.name}${company} (~${model.size}, WER: ${model.wer})${installed}`;
        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });
  });

  elements.modelSelect.disabled = false;
}

// Set up event listeners
function setupEventListeners() {
  elements.selectFileBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.selectAudioFile();
    if (result.success && !result.canceled) {
      state.selectedFile = result.filePath;
      showFileInfo(result.filePath);
      updateTranscribeButton();
    }
  });
  
  elements.backendSelect.addEventListener('change', (e) => {
    const backend = e.target.value;
    if (backend) {
      state.selectedBackend = backend;

      // If comparison mode is active, show all models from all backends
      // Otherwise, show only models from the selected backend
      if (state.comparisonMode) {
        populateAllModelsForComparison();
      } else {
        populateModelSelects(backend);
      }

      updateModelInfo();
      updateTranscribeButton();
    }
  });
  
  elements.modelSelect.addEventListener('change', () => {
    updateModelInfo();
    updateTranscribeButton();
  });
  
  elements.comparisonMode.addEventListener('change', (e) => {
    state.comparisonMode = e.target.checked;
    elements.comparisonOptions.classList.toggle('hidden', !state.comparisonMode);

    // When comparison mode is enabled, show all models from all backends
    // When disabled, show only models from the selected backend
    if (state.comparisonMode) {
      populateAllModelsForComparison();
    } else if (state.selectedBackend) {
      populateModelSelects(state.selectedBackend);
    }

    updateTranscribeButton();
  });
  
  elements.transcribeBtn.addEventListener('click', handleTranscribe);

  // Batch mode event listeners
  elements.selectMultipleFilesBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.selectMultipleAudioFiles();
    if (result.success && !result.canceled && result.filePaths.length > 0) {
      addFilesToBatch(result.filePaths);
    }
  });

  elements.transcribeBatchBtn.addEventListener('click', handleBatchTranscribe);
}

// Show file info
async function showFileInfo(filePath) {
  const result = await window.electronAPI.getFileInfo(filePath);
  if (result.success) {
    elements.fileInfo.classList.remove('hidden');
    elements.fileInfo.querySelector('.file-name').textContent = result.fileName;
    elements.fileInfo.querySelector('.file-size').textContent = result.fileSizeMB + ' MB';
  }
}

// Update model info display
function updateModelInfo() {
  const selectedValue = elements.modelSelect.value;
  if (!selectedValue) {
    elements.modelInfo.classList.add('hidden');
    return;
  }
  try {
    const { backend, model } = JSON.parse(selectedValue);
    const modelData = state.backends[backend].models.find(m => m.name === model);
    if (modelData) {
      elements.modelInfo.classList.remove('hidden');
      elements.modelInfo.querySelector('.model-size').textContent = 'Size: ' + modelData.size;
      elements.modelInfo.querySelector('.model-wer').textContent = 'WER: ' + modelData.wer;
    }
  } catch (e) {
    console.error('Error parsing model selection:', e);
  }
}

// Update transcribe button state
function updateTranscribeButton() {
  const hasFile = state.selectedFile !== null;
  const hasModel = elements.modelSelect.value !== '';
  const hasModels = state.comparisonMode 
    ? hasModel && elements.modelSelect2.value !== ''
    : hasModel;
  elements.transcribeBtn.disabled = !(hasFile && hasModels);
}

// Handle transcription
async function handleTranscribe() {
  const models = [elements.modelSelect.value];
  if (state.comparisonMode) {
    models.push(elements.modelSelect2.value);
    if (elements.modelSelect3.value) {
      models.push(elements.modelSelect3.value);
    }
  }
  
  elements.welcomeScreen.classList.add('hidden');
  elements.resultsContainer.classList.add('hidden');
  elements.loadingScreen.classList.remove('hidden');
  elements.resultsContainer.innerHTML = '';
  
  state.activeTranscriptions = models.length;
  const results = [];
  
  for (const modelStr of models) {
    const { backend, model } = JSON.parse(modelStr);
    elements.loadingScreen.querySelector('.loading-details').textContent = 
      'Processing with ' + backend + '/' + model + '...';
    
    try {
      const result = await window.electronAPI.transcribe({
        audioPath: state.selectedFile,
        backend,
        modelName: model,
        task: backend === 'voxtral' ? 'transcribe' : undefined
      });
      results.push({ backend, model, result });
    } catch (error) {
      results.push({ backend, model, result: { success: false, error: error.message } });
    }
  }
  
  elements.loadingScreen.classList.add('hidden');
  elements.resultsContainer.classList.remove('hidden');
  displayResults(results);
}

// Display transcription results
function displayResults(results) {
  if (state.comparisonMode && results.length > 1) {
    elements.resultsContainer.innerHTML = '<div class="comparison-grid"></div>';
    const grid = elements.resultsContainer.querySelector('.comparison-grid');
    results.forEach(({ backend, model, result }) => {
      const card = createResultCard(backend, model, result);
      grid.appendChild(card);
    });
  } else {
    const { backend, model, result } = results[0];
    const card = createResultCard(backend, model, result, true);
    elements.resultsContainer.appendChild(card);
  }
}

// Create a result card
function createResultCard(backend, model, result, fullWidth = false) {
  const card = document.createElement('div');
  card.className = 'result-card' + (fullWidth ? ' full-width' : '');
  
  if (result.success) {
    const header = document.createElement('div');
    header.className = 'result-header';
    header.innerHTML = '<h3>' + backend + ' / ' + model + '</h3><span class="processing-time">' + result.processing_time + 's</span>';
    
    const metrics = document.createElement('div');
    metrics.className = 'result-metrics';
    if (result.language) metrics.innerHTML += '<span class="metric">Language: ' + result.language + '</span>';
    if (result.device) metrics.innerHTML += '<span class="metric">Device: ' + result.device + '</span>';
    
    const text = document.createElement('div');
    text.className = 'result-text';
    text.textContent = result.text || 'No transcription';
    
    const actions = document.createElement('div');
    actions.className = 'result-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-sm';
    copyBtn.textContent = 'Copy Text';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(result.text).then(() => {
        showToast('Text copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy text', 'error');
      });
    };
    actions.appendChild(copyBtn);
    
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-sm';
    exportBtn.textContent = 'Export';
    exportBtn.onclick = () => exportResult(result, backend, model);
    actions.appendChild(exportBtn);
    
    card.appendChild(header);
    card.appendChild(metrics);
    card.appendChild(text);
    card.appendChild(actions);
  } else {
    card.innerHTML = '<div class="result-header error"><h3>' + backend + ' / ' + model + 
      '</h3><span class="error-badge">Error</span></div><div class="result-text error">' + 
      (result.error || 'Unknown error') + '</div>';
  }
  
  return card;
}

// Show error
function showError(message) {
  console.error('Error:', message);
  showToast(message, 'error', 5000);
}

// ========================================
// BATCH PROCESSING
// ========================================

// Add files to batch queue
function addFilesToBatch(filePaths) {
  for (const filePath of filePaths) {
    // Avoid duplicates
    if (!state.batchFiles.find(f => f.path === filePath)) {
      state.batchFiles.push({
        path: filePath,
        name: filePath.split('/').pop().split('\\').pop(),
        status: 'pending'
      });
    }
  }

  updateBatchQueue();
  updateBatchButton();
}

// Update batch queue display
function updateBatchQueue() {
  if (state.batchFiles.length === 0) {
    elements.batchQueue.classList.add('hidden');
    elements.fileInfo.classList.remove('hidden');
    state.batchMode = false;
    return;
  }

  state.batchMode = true;
  elements.batchQueue.classList.remove('hidden');
  elements.fileInfo.classList.add('hidden');

  elements.batchQueue.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
      <span style="font-size: 0.75rem; color: var(--text-muted);">${state.batchFiles.length} files queued</span>
      <button id="clear-batch" class="btn btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Clear All</button>
    </div>
  `;

  state.batchFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'batch-item';
    item.innerHTML = `
      <span class="batch-item-name" title="${file.path}">${file.name}</span>
      <span class="batch-item-remove" data-index="${index}">×</span>
    `;
    elements.batchQueue.appendChild(item);
  });

  // Add event listeners
  document.getElementById('clear-batch')?.addEventListener('click', clearBatch);

  document.querySelectorAll('.batch-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeFileFromBatch(index);
    });
  });
}

// Remove file from batch
function removeFileFromBatch(index) {
  state.batchFiles.splice(index, 1);
  updateBatchQueue();
  updateBatchButton();
}

// Clear all batch files
function clearBatch() {
  state.batchFiles = [];
  updateBatchQueue();
  updateBatchButton();
  showToast('Batch queue cleared', 'info');
}

// Update batch button visibility
function updateBatchButton() {
  const hasFiles = state.batchFiles.length > 0;
  const hasModel = elements.modelSelect.value !== '';

  if (hasFiles) {
    elements.transcribeBatchBtn.classList.remove('hidden');
    elements.transcribeBtn.classList.add('hidden');
    elements.transcribeBatchBtn.disabled = !hasModel;
  } else {
    elements.transcribeBatchBtn.classList.add('hidden');
    elements.transcribeBtn.classList.remove('hidden');
    updateTranscribeButton();
  }
}

// Handle batch transcription
async function handleBatchTranscribe() {
  if (state.batchFiles.length === 0) {
    showToast('No files in batch queue', 'error');
    return;
  }

  const modelStr = elements.modelSelect.value;
  if (!modelStr) {
    showToast('Please select a model', 'error');
    return;
  }

  const { backend, model } = JSON.parse(modelStr);

  state.batchProcessing = true;
  elements.transcribeBatchBtn.disabled = true;
  elements.batchProgress.classList.remove('hidden');
  elements.welcomeScreen.classList.add('hidden');
  elements.resultsContainer.classList.add('hidden');
  elements.resultsContainer.innerHTML = '';

  const total = state.batchFiles.length;
  let completed = 0;
  const results = [];

  elements.batchTotal.textContent = total;

  for (let i = 0; i < state.batchFiles.length; i++) {
    const file = state.batchFiles[i];

    elements.batchCurrent.textContent = i + 1;
    file.status = 'processing';

    showToast(`Processing ${file.name}...`, 'info', 2000);

    try {
      const result = await window.electronAPI.transcribe({
        audioPath: file.path,
        backend,
        modelName: model,
        task: backend === 'voxtral' ? 'transcribe' : undefined
      });

      file.status = 'completed';
      results.push({
        file: file.name,
        backend,
        model,
        result,
        success: result.success !== false
      });
      completed++;
    } catch (error) {
      file.status = 'failed';
      results.push({
        file: file.name,
        backend,
        model,
        result: { success: false, error: error.message },
        success: false
      });
    }

    // Update progress
    const progress = ((i + 1) / total) * 100;
    elements.batchProgressFill.style.width = progress + '%';
  }

  // Show results
  state.batchProcessing = false;
  elements.batchProgress.classList.add('hidden');
  elements.resultsContainer.classList.remove('hidden');

  displayBatchResults(results);

  showToast(`Batch complete: ${completed}/${total} successful`, completed === total ? 'success' : 'warning', 5000);

  // Clear batch
  state.batchFiles = [];
  updateBatchQueue();
  updateBatchButton();
  elements.transcribeBatchBtn.disabled = false;
}

// Display batch results
function displayBatchResults(results) {
  elements.resultsContainer.innerHTML = '<h2 style="margin-bottom: 1rem; color: var(--text-primary);">Batch Results</h2>';

  // Summary card
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  const summaryCard = document.createElement('div');
  summaryCard.className = 'batch-results-summary';
  summaryCard.innerHTML = `
    <h3>Summary</h3>
    <div style="display: flex; gap: 2rem; margin-top: 1rem;">
      <div>
        <div style="font-size: 2rem; font-weight: bold; color: var(--success-color);">${successCount}</div>
        <div style="font-size: 0.875rem; color: var(--text-muted);">Successful</div>
      </div>
      <div>
        <div style="font-size: 2rem; font-weight: bold; color: ${failCount > 0 ? 'var(--error-color)' : 'var(--text-muted)'};">${failCount}</div>
        <div style="font-size: 0.875rem; color: var(--text-muted);">Failed</div>
      </div>
      <div>
        <div style="font-size: 2rem; font-weight: bold; color: var(--text-primary);">${results.length}</div>
        <div style="font-size: 0.875rem; color: var(--text-muted);">Total</div>
      </div>
    </div>
  `;
  elements.resultsContainer.appendChild(summaryCard);

  // Individual results
  const resultsGrid = document.createElement('div');
  resultsGrid.style.marginTop = '1.5rem';
  resultsGrid.style.display = 'grid';
  resultsGrid.style.gap = '1rem';

  results.forEach(({ file, backend, model, result, success }) => {
    const card = document.createElement('div');
    card.className = 'result-card';

    if (success) {
      card.innerHTML = `
        <div class="result-header">
          <h3>${file}</h3>
          <span class="processing-time">${result.processing_time}s</span>
        </div>
        <div class="result-metrics">
          <span class="metric">Model: ${backend}/${model}</span>
          ${result.language ? `<span class="metric">Language: ${result.language}</span>` : ''}
        </div>
        <div class="result-text">${result.text || 'No transcription'}</div>
        <div class="result-actions">
          <button class="btn btn-sm copy-btn">Copy Text</button>
          <button class="btn btn-sm export-btn">Export</button>
        </div>
      `;

      // Add event listeners
      const copyBtn = card.querySelector('.copy-btn');
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(result.text).then(() => {
          showToast('Text copied!', 'success');
        });
      };

      const exportBtn = card.querySelector('.export-btn');
      exportBtn.onclick = () => exportResult(result, backend, model);
    } else {
      card.innerHTML = `
        <div class="result-header error">
          <h3>${file}</h3>
          <span class="error-badge">Error</span>
        </div>
        <div class="result-text error">${result.error || 'Unknown error'}</div>
      `;
    }

    resultsGrid.appendChild(card);
  });

  elements.resultsContainer.appendChild(resultsGrid);
}

// Start the app

// Export result function
async function exportResult(result, backend, model) {
  const formats = [
    { name: 'Plain Text', extensions: ['txt'] },
    { name: 'JSON', extensions: ['json'] },
    { name: 'SRT Subtitles', extensions: ['srt'] },
    { name: 'WebVTT Subtitles', extensions: ['vtt'] }
  ];
  
  // Show format selection
  const format = await promptForFormat();
  if (!format) return;
  
  const defaultName = 'transcription_' + backend + '_' + model + '_' + Date.now();
  const saveResult = await window.electronAPI.saveDialog(
    defaultName + '.' + format,
    [formats.find(f => f.extensions[0] === format)]
  );
  
  if (saveResult.success && !saveResult.canceled) {
    const exportResult = await window.electronAPI.exportResult(result, format, saveResult.filePath);
    if (exportResult.success) {
      showToast('Exported successfully!', 'success');
    } else {
      showToast('Export failed: ' + exportResult.error, 'error');
    }
  }
}

// Prompt for export format
async function promptForFormat() {
  return new Promise((resolve) => {
    const formats = ['txt', 'json', 'srt', 'vtt'];
    const choice = prompt('Select export format:\n1. Plain Text (TXT)\n2. JSON\n3. SRT Subtitles\n4. WebVTT\n\nEnter 1-4:', '1');
    
    if (!choice) {
      resolve(null);
      return;
    }
    
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < formats.length) {
      resolve(formats[index]);
    } else {
      resolve(null);
    }
  });
}


document.addEventListener('DOMContentLoaded', init);



// Settings Management
const defaultSettings = {
  devicePreference: 'auto',
  quantization: 'auto',
  defaultLanguage: 'auto',
  enableTimestamps: true,
  enableWordTimestamps: false,
  modelCachePath: '',
  exportPath: '',
  autoScroll: true,
  showNotifications: true,
  fontSize: 'medium'
};

let userSettings = {...defaultSettings};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('localvoice-settings');
  if (saved) {
    try {
      userSettings = {...defaultSettings, ...JSON.parse(saved)};
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }
  applySettings();
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('localvoice-settings', JSON.stringify(userSettings));
  applySettings();
  closeSettingsModal();
  showToast('Settings saved successfully!', 'success');
}

// Apply settings to UI
function applySettings() {
  // Apply font size
  const resultsText = document.querySelectorAll('.result-text');
  resultsText.forEach(el => {
    el.style.fontSize = userSettings.fontSize === 'small' ? '0.875rem' : 
                        userSettings.fontSize === 'large' ? '1.125rem' : '0.9375rem';
  });
}

// Settings Modal Management
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const resetSettingsBtn = document.getElementById('reset-settings');

if (settingsBtn) {
  settingsBtn.addEventListener('click', openSettingsModal);
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', closeSettingsModal);
}

if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', saveSettingsFromModal);
}

if (resetSettingsBtn) {
  resetSettingsBtn.addEventListener('click', resetSettings);
}

// Click outside modal to close
if (settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });
}

function openSettingsModal() {
  if (!settingsModal) return;
  
  // Populate modal with current settings
  document.getElementById('device-preference').value = userSettings.devicePreference;
  document.getElementById('quantization').value = userSettings.quantization;
  document.getElementById('default-language').value = userSettings.defaultLanguage;
  document.getElementById('enable-timestamps').checked = userSettings.enableTimestamps;
  document.getElementById('enable-word-timestamps').checked = userSettings.enableWordTimestamps;
  document.getElementById('model-cache-path').value = userSettings.modelCachePath;
  document.getElementById('export-path').value = userSettings.exportPath;
  document.getElementById('auto-scroll').checked = userSettings.autoScroll;
  document.getElementById('show-notifications').checked = userSettings.showNotifications;
  document.getElementById('font-size').value = userSettings.fontSize;
  
  settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  if (settingsModal) {
    settingsModal.classList.add('hidden');
  }
}

function saveSettingsFromModal() {
  userSettings = {
    devicePreference: document.getElementById('device-preference').value,
    quantization: document.getElementById('quantization').value,
    defaultLanguage: document.getElementById('default-language').value,
    enableTimestamps: document.getElementById('enable-timestamps').checked,
    enableWordTimestamps: document.getElementById('enable-word-timestamps').checked,
    modelCachePath: document.getElementById('model-cache-path').value,
    exportPath: document.getElementById('export-path').value,
    autoScroll: document.getElementById('auto-scroll').checked,
    showNotifications: document.getElementById('show-notifications').checked,
    fontSize: document.getElementById('font-size').value
  };
  
  saveSettings();
}

function resetSettings() {
  if (confirm('Reset all settings to defaults?')) {
    userSettings = {...defaultSettings};
    saveSettings();
  }
}

function showNotification(message, type = 'info') {
  if (userSettings.showNotifications) {
    showToast(message, type);
  }
}

// Load settings on init
loadSettings();




// Model Manager
const modelManagerModal = document.getElementById('model-manager-modal');
const modelManagerBtn = document.getElementById('model-manager-btn');
const closeModelManagerBtn = document.getElementById('close-model-manager');
const closeModelManagerFooter = document.getElementById('close-model-manager-footer');
const refreshModelsBtn = document.getElementById('refresh-models');

let activeDownloads = [];

// Tab Management
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Update tab buttons
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    document.getElementById(tabName + '-tab').classList.remove('hidden');
  });
});

// Model Manager Modal
if (modelManagerBtn) {
  modelManagerBtn.addEventListener('click', openModelManager);
}

if (closeModelManagerBtn) {
  closeModelManagerBtn.addEventListener('click', closeModelManager);
}

if (closeModelManagerFooter) {
  closeModelManagerFooter.addEventListener('click', closeModelManager);
}

if (refreshModelsBtn) {
  refreshModelsBtn.addEventListener('click', refreshModels);
}

if (modelManagerModal) {
  modelManagerModal.addEventListener('click', (e) => {
    if (e.target === modelManagerModal) {
      closeModelManager();
    }
  });
}

async function openModelManager() {
  if (!modelManagerModal) return;
  
  modelManagerModal.classList.remove('hidden');
  await loadModelLists();
}

function closeModelManager() {
  if (modelManagerModal) {
    modelManagerModal.classList.add('hidden');
  }
}

async function loadModelLists() {
  try {
    const result = await window.electronAPI.listBackends();
    
    if (result.success) {
      populateAvailableModels(result.backends);
      populateInstalledModels(result.backends);
    }
  } catch (error) {
    console.error('Error loading models:', error);
  }
}

function populateAvailableModels(backends) {
  const container = document.getElementById('available-models-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (const [backendName, backend] of Object.entries(backends)) {
    if (!backend.available) continue;
    
    backend.models.forEach(model => {
      const card = createModelCard(backendName, model);
      container.appendChild(card);
    });
  }
}

function populateInstalledModels(backends) {
  const container = document.getElementById('installed-models-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  let hasInstalled = false;
  
  for (const [backendName, backend] of Object.entries(backends)) {
    if (!backend.available) continue;
    
    backend.models.forEach(model => {
      if (model.installed) {
        hasInstalled = true;
        const card = createModelCard(backendName, model, true);
        container.appendChild(card);
      }
    });
  }
  
  if (!hasInstalled) {
    container.innerHTML = '<p class="no-downloads">No models installed yet</p>';
  }
}

function createModelCard(backend, model, installedView = false) {
  const card = document.createElement('div');
  card.className = 'model-card';
  
  const badge = model.installed ? 
    '<span class="model-badge installed">✓ Installed</span>' :
    '<span class="model-badge not-installed">Not Installed</span>';
  
  const features = model.features ? 
    '<div class="model-info-item"><div class="model-info-label">Features</div>' +
    '<div class="model-info-value">' + model.features.join(', ') + '</div></div>' : '';
  
  card.innerHTML = `
    <div class="model-card-header">
      <div>
        <div class="model-name">${backend} / ${model.name}</div>
      </div>
      ${badge}
    </div>
    <div class="model-info">
      <div class="model-info-item">
        <div class="model-info-label">Size</div>
        <div class="model-info-value">${model.size}</div>
      </div>
      <div class="model-info-item">
        <div class="model-info-label">Parameters</div>
        <div class="model-info-value">${model.params}</div>
      </div>
      <div class="model-info-item">
        <div class="model-info-label">WER</div>
        <div class="model-info-value">${model.wer}</div>
      </div>
      ${features}
    </div>
    <div class="model-actions">
      ${model.installed ? 
        '<button class="btn btn-sm" disabled>Installed</button>' :
        `<button class="btn btn-sm btn-primary" onclick="downloadModel('${backend}', '${model.name}')">Download</button>`
      }
    </div>
  `;
  
  return card;
}

async function downloadModel(backend, modelName) {
  const downloadId = `${backend}-${modelName}-${Date.now()}`;
  
  // Add to downloads list
  activeDownloads.push({
    id: downloadId,
    backend,
    modelName,
    progress: 0,
    status: 'starting'
  });
  
  updateDownloadsTab();
  
  // Show downloads tab
  document.querySelector('[data-tab="downloads"]').click();
  
  try {
    // Start download
    updateDownloadProgress(downloadId, 10, 'Initiating download...');
    
    const result = await window.electronAPI.downloadModel(backend, modelName);
    
    if (result.success) {
      updateDownloadProgress(downloadId, 100, 'Complete');
      setTimeout(() => {
        removeDownload(downloadId);
        refreshModels();
      }, 2000);
    } else {
      updateDownloadProgress(downloadId, 0, 'Failed: ' + result.error);
    }
  } catch (error) {
    updateDownloadProgress(downloadId, 0, 'Error: ' + error.message);
  }
}

function updateDownloadsTab() {
  const container = document.getElementById('downloads-list');
  if (!container) return;
  
  if (activeDownloads.length === 0) {
    container.innerHTML = '<p class="no-downloads">No active downloads</p>';
    return;
  }
  
  container.innerHTML = activeDownloads.map(download => `
    <div class="download-item ${download.status === 'downloading' ? 'active' : ''}" id="${download.id}">
      <div class="download-header">
        <span class="download-name">${download.backend} / ${download.modelName}</span>
      </div>
      <div class="download-progress">
        <div class="download-progress-fill" style="width: ${download.progress}%"></div>
      </div>
      <div class="download-status">${download.status}</div>
    </div>
  `).join('');
}

function updateDownloadProgress(downloadId, progress, status) {
  const download = activeDownloads.find(d => d.id === downloadId);
  if (download) {
    download.progress = progress;
    download.status = status;
    updateDownloadsTab();
  }
}

function removeDownload(downloadId) {
  activeDownloads = activeDownloads.filter(d => d.id !== downloadId);
  updateDownloadsTab();
}

async function refreshModels() {
  await loadModelLists();
  showNotification('Model list refreshed', 'success');
}

