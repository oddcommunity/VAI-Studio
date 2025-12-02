const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, crashReporter } = require('electron');
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ElectronStore = require('electron-store');

// Initialize Odd-Core services
const { getLogger } = require('./odd-core-integration');
const { authService } = require('./auth-service');
const logger = getLogger();

const store = new ElectronStore.default();
let mainWindow;
let autoUpdater;
let authWindow = null;

// Initialize crash reporting
crashReporter.start({
  productName: 'VAI Studio',
  companyName: 'VAI Studio',
  submitURL: '', // Leave empty for local crash reports only
  uploadToServer: false, // Set to true when you have a crash reporting server
  ignoreSystemCrashHandler: false,
  compress: true,
  extra: {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch
  }
});

logger.info('Crash reporting initialized', {
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load React app (different paths for dev vs production)
  if (app.isPackaged) {
    // Production: load from dist-react
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'));
  } else {
    // Development: load from Vite dev server or built files
    // First try Vite dev server, fallback to built files
    const devServerUrl = 'http://localhost:3000';
    const distHtmlPath = path.join(__dirname, '../dist-react/index.html');

    if (fs.existsSync(distHtmlPath)) {
      // Load from built files
      mainWindow.loadFile(distHtmlPath);
    } else {
      // Try dev server (when running npm run dev:react)
      mainWindow.loadURL(devServerUrl).catch(() => {
        // Fallback to vanilla JS if React not built yet
        mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
      });
    }
  }

  // Open DevTools only in development (--dev flag or when not packaged)
  if (process.argv.includes('--dev') || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize auto-updater after app is ready (Linear-style UX)
  const { autoUpdater: updater } = require('electron-updater');
  autoUpdater = updater;
  autoUpdater.autoDownload = true; // Download silently in background
  autoUpdater.autoInstallOnAppQuit = true;
  logger.info('Auto-update system initialized');

  // Set up auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('Update available, downloading in background', { version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    logger.info('No updates available');
  });

  autoUpdater.on('error', (err) => {
    logger.error('Auto-update error', { error: err.message });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    logger.info('Update download progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
    // Optionally send progress to renderer (for subtle progress indicator)
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded and ready', { version: info.version });
    // Send message to renderer to show "Reload to update" banner
    if (mainWindow) {
      mainWindow.webContents.send('update-ready', {
        version: info.version
      });
    }
  });

  // Initialize authentication service
  authService.initialize().catch(err => {
    logger.error('Failed to initialize auth service', { error: err.message });
  });

  createWindow();

  // Check for updates after 3 seconds (give app time to settle)
  setTimeout(() => {
    if (!process.argv.includes('--dev')) {
      checkForUpdates();
    }
  }, 3000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Helper to run Python backend commands
function runPythonCommand(args) {
  return new Promise((resolve, reject) => {
    const os = require('os');

    // Determine Python path based on environment
    let pythonPath;
    let scriptPath;

    if (process.env.DOCKER_ENV === 'true') {
      // Docker environment
      pythonPath = '/app/venv/bin/python';
      scriptPath = '/app/backends/runner.py';
    } else if (app.isPackaged) {
      // Production (packaged app) - use python wrapper that sets PYTHONHOME correctly
      pythonPath = path.join(process.resourcesPath, 'scripts', 'python-wrapper.sh');
      scriptPath = path.join(process.resourcesPath, 'backends', 'runner.py');
      console.log('[Python] Using python wrapper:', pythonPath);
      console.log('[Python] Using bundled scripts:', scriptPath);
    } else {
      // Development - use python wrapper script
      pythonPath = path.join(__dirname, '../scripts/python-wrapper.sh');
      scriptPath = path.join(__dirname, '../backends/runner.py');
      console.log('[Python] Using development python wrapper:', pythonPath);
    }

    // Add ffmpeg to PATH for audio processing
    const homeDir = os.homedir();
    const ffmpegPath = path.join(homeDir, '.local', 'bin');
    const envPath = process.env.PATH ? `${ffmpegPath}:${process.env.PATH}` : ffmpegPath;

    // PYTHONHOME is set by python-wrapper.sh
    const spawnEnv = { ...process.env, PATH: envPath };

    console.log('[Python] Running:', pythonPath, scriptPath, ...args);

    const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
      env: spawnEnv
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log('[Python stderr]:', output);

      // Parse progress messages
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.startsWith('PROGRESS:')) {
          try {
            const progressData = JSON.parse(line.substring(9));
            console.log('[Progress]:', progressData);
            // Send progress to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('transcription-progress', progressData);
            }
          } catch (e) {
            console.error('[Progress] Failed to parse:', e.message);
          }
        }
      }
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Extract JSON from stdout (may contain extra text before/after)
          // Try to find JSON object in the output
          let jsonStr = stdout.trim();

          // If output contains non-JSON text, try to extract the JSON part
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }

          const result = JSON.parse(jsonStr);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}\nOutput: ${stdout}`));
        }
      } else {
        reject(new Error(`Python process exited with code ${code}\nStderr: ${stderr}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

// ========================================
// AUDIO CONVERSION WITH FFMPEG
// ========================================

/**
 * Get the path to the bundled FFmpeg binary
 */
function getFfmpegPath() {
  // ffmpeg-static provides the path to the binary
  // In packaged app, we need to account for asar unpacking
  try {
    const ffmpegStatic = require('ffmpeg-static');
    let ffmpegPath = ffmpegStatic;

    // In packaged app, the path needs to be adjusted for asar unpacking
    if (app.isPackaged && ffmpegPath.includes('app.asar')) {
      ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    }

    logger.info('FFmpeg path resolved', { ffmpegPath });
    return ffmpegPath;
  } catch (e) {
    logger.error('Failed to get ffmpeg-static path', { error: e.message });
    return null;
  }
}

/**
 * Convert audio file to WAV format using FFmpeg
 * This ensures Python only needs to handle WAV files (most compatible)
 *
 * @param {string} inputPath - Path to input audio file
 * @returns {Promise<string>} - Path to converted WAV file (or original if already WAV)
 */
function convertToWav(inputPath) {
  return new Promise((resolve, reject) => {
    // If already WAV, just return the path
    const ext = path.extname(inputPath).toLowerCase();
    if (ext === '.wav') {
      console.log('[FFmpeg] File is already WAV, skipping conversion');
      resolve(inputPath);
      return;
    }

    const ffmpegPath = getFfmpegPath();
    if (!ffmpegPath) {
      reject(new Error('FFmpeg not available'));
      return;
    }

    // Check if FFmpeg exists
    if (!fs.existsSync(ffmpegPath)) {
      reject(new Error(`FFmpeg binary not found at: ${ffmpegPath}`));
      return;
    }

    // Create temp WAV file path
    const tempDir = os.tmpdir();
    const baseName = path.basename(inputPath, ext);
    const tempWavPath = path.join(tempDir, `vai-converted-${Date.now()}-${baseName}.wav`);

    console.log('[FFmpeg] Converting:', inputPath);
    console.log('[FFmpeg] Output:', tempWavPath);

    // FFmpeg arguments for conversion to WAV
    // -y: overwrite output
    // -i: input file
    // -ar 16000: resample to 16kHz (optimal for Whisper)
    // -ac 1: mono audio
    // -acodec pcm_s16le: 16-bit signed little-endian PCM (standard WAV)
    const args = [
      '-y',
      '-i', inputPath,
      '-ar', '16000',
      '-ac', '1',
      '-acodec', 'pcm_s16le',
      tempWavPath
    ];

    const ffmpeg = execFile(ffmpegPath, args, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[FFmpeg] Conversion failed:', error);
        console.error('[FFmpeg] stderr:', stderr);
        reject(new Error(`FFmpeg conversion failed: ${error.message}`));
        return;
      }

      console.log('[FFmpeg] Conversion successful');
      resolve(tempWavPath);
    });

    ffmpeg.on('error', (err) => {
      console.error('[FFmpeg] Process error:', err);
      reject(err);
    });
  });
}

/**
 * Clean up temporary WAV file after transcription
 */
function cleanupTempWav(tempPath) {
  if (tempPath && tempPath.includes('vai-converted-') && fs.existsSync(tempPath)) {
    try {
      fs.unlinkSync(tempPath);
      console.log('[FFmpeg] Cleaned up temp file:', tempPath);
    } catch (e) {
      console.warn('[FFmpeg] Failed to cleanup temp file:', e);
    }
  }
}

// IPC Handlers

// List all available backends
ipcMain.handle('list-backends', async () => {
  try {
    const result = await runPythonCommand(['list-backends']);
    return result;
  } catch (error) {
    console.error('Error listing backends:', error);
    return { success: false, error: error.message };
  }
});

// List models for a specific backend
ipcMain.handle('list-models', async (event, { backend }) => {
  try {
    const result = await runPythonCommand(['list-models', backend]);
    return result;
  } catch (error) {
    console.error('Error listing models:', error);
    return { success: false, error: error.message };
  }
});

// Transcribe audio file
ipcMain.handle('transcribe', async (event, { audioPath, backend, modelName, task }) => {
  let convertedPath = null;
  try {
    // Convert audio to WAV if needed (handles WebM, MP4, OGG, etc.)
    // This ensures Python only needs to handle WAV files
    logger.info('Starting transcription', {
      originalPath: audioPath,
      backend,
      modelName,
      task
    });
    convertedPath = await convertToWav(audioPath);
    logger.info('Audio converted', { convertedPath });

    const args = ['transcribe', backend, convertedPath, modelName];
    if (task) {
      args.push(task);
    }

    const result = await runPythonCommand(args);
    logger.info('Transcription completed', {
      success: result.success,
      backend,
      modelName
    });
    return result;
  } catch (error) {
    logger.error('Transcription failed', {
      error: error.message,
      backend,
      modelName,
      audioPath
    });
    return { success: false, error: error.message };
  } finally {
    // Clean up temporary WAV file if we created one
    if (convertedPath && convertedPath !== audioPath) {
      cleanupTempWav(convertedPath);
    }
  }
});

// Download model
ipcMain.handle('download-model', async (event, { backend, modelName }) => {
  try {
    const result = await runPythonCommand(['download', backend, modelName]);
    return result;
  } catch (error) {
    console.error('Error downloading model:', error);
    return { success: false, error: error.message };
  }
});

// Benchmark model
ipcMain.handle('benchmark', async (event, { audioPath, backend, modelName, referenceText }) => {
  let convertedPath = null;
  try {
    // Convert audio to WAV if needed
    convertedPath = await convertToWav(audioPath);

    const args = ['benchmark', backend, convertedPath, modelName, referenceText];
    const result = await runPythonCommand(args);
    return result;
  } catch (error) {
    console.error('Error running benchmark:', error);
    return { success: false, error: error.message };
  } finally {
    if (convertedPath && convertedPath !== audioPath) {
      cleanupTempWav(convertedPath);
    }
  }
});

// Open file dialog
ipcMain.handle('select-audio-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'wma'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, filePath: result.filePaths[0] };
  } catch (error) {
    console.error('Error selecting file:', error);
    return { success: false, error: error.message };
  }
});

// Open multiple files dialog
ipcMain.handle('select-multiple-audio-files', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'wma'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, filePaths: result.filePaths };
  } catch (error) {
    console.error('Error selecting files:', error);
    return { success: false, error: error.message };
  }
});

// Get file info
ipcMain.handle('get-file-info', async (event, { filePath }) => {
  try {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileSize = stats.size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

    return {
      success: true,
      fileName,
      fileSize,
      fileSizeMB,
      filePath
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export result to file
ipcMain.handle('export-result', async (event, { result, format, filePath }) => {
  try {
    let content = '';

    switch (format) {
      case 'txt':
        content = result.text || '';
        break;

      case 'json':
        content = JSON.stringify(result, null, 2);
        break;

      case 'srt':
        // Generate SRT format from segments
        if (result.segments && result.segments.length > 0) {
          content = result.segments.map((seg, i) => {
            const startTime = formatSRTTime(seg.start);
            const endTime = formatSRTTime(seg.end);
            return `${i + 1}\n${startTime} --> ${endTime}\n${seg.text.trim()}\n`;
          }).join('\n');
        } else {
          content = `1\n00:00:00,000 --> 00:00:05,000\n${result.text || ''}\n`;
        }
        break;

      case 'vtt':
        // Generate WebVTT format from segments
        content = 'WEBVTT\n\n';
        if (result.segments && result.segments.length > 0) {
          content += result.segments.map((seg, i) => {
            const startTime = formatVTTTime(seg.start);
            const endTime = formatVTTTime(seg.end);
            return `${i + 1}\n${startTime} --> ${endTime}\n${seg.text.trim()}\n`;
          }).join('\n');
        } else {
          content += `1\n00:00:00.000 --> 00:00:05.000\n${result.text || ''}\n`;
        }
        break;

      default:
        return { success: false, error: 'Unknown export format' };
    }

    fs.writeFileSync(filePath, content, 'utf8');

    return { success: true, filePath };
  } catch (error) {
    console.error('Error exporting result:', error);
    return { success: false, error: error.message };
  }
});

// Save file dialog for export
ipcMain.handle('save-dialog', async (event, { defaultPath, filters }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Error showing save dialog:', error);
    return { success: false, error: error.message };
  }
});

// Helper functions for time formatting
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVTTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

console.log('Electron main process ready');

// ========================================
// USER AUTHENTICATION (SUPABASE)
// ========================================

// Sign in with email (OTP)
ipcMain.handle('auth:sign-in-email', async (event, email) => {
  try {
    logger.info('Sign in request', { email });
    const result = await authService.signInWithEmail(email);
    return result;
  } catch (error) {
    logger.error('Sign in failed', { email, error: error.message });
    return { success: false, error: error.message };
  }
});

// Sign out
ipcMain.handle('auth:sign-out', async () => {
  try {
    logger.info('Sign out request');
    const result = await authService.signOut();
    return result;
  } catch (error) {
    logger.error('Sign out failed', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Get current session
ipcMain.handle('auth:get-session', async () => {
  try {
    const result = await authService.getSession();
    return result;
  } catch (error) {
    logger.error('Get session failed', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Check model access
ipcMain.handle('auth:check-model-access', async (event, modelName) => {
  try {
    const hasAccess = authService.hasModelAccess(modelName);
    return { success: true, hasAccess };
  } catch (error) {
    logger.error('Check model access failed', { modelName, error: error.message });
    return { success: false, error: error.message };
  }
});

logger.info('User authentication system initialized');

// ========================================
// HUGGINGFACE OAUTH AUTHENTICATION
// ========================================

// HuggingFace OAuth - Manual Token Entry (Simple approach for MVP)
// Note: Full OAuth requires backend server for client_secret security
ipcMain.handle('save-hf-token', async (event, token) => {
  try {
    // Encrypt token using safeStorage before storing
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      store.set('huggingface_token', encrypted.toString('base64'));
    } else {
      // Fallback for systems where encryption is not available
      console.warn('[HuggingFace] Encryption not available, storing token in plain text');
      store.set('huggingface_token', token);
    }

    // Also write to HuggingFace cache location for Python to use
    const os = require('os');
    const hfCacheDir = path.join(os.homedir(), '.cache', 'huggingface');
    const tokenPath = path.join(hfCacheDir, 'token');

    // Create cache directory if it doesn't exist
    if (!fs.existsSync(hfCacheDir)) {
      fs.mkdirSync(hfCacheDir, { recursive: true });
    }

    // Write token file (Python needs plain text)
    fs.writeFileSync(tokenPath, token, 'utf8');

    console.log('[HuggingFace] Token saved successfully');
    return { success: true };
  } catch (error) {
    console.error('[HuggingFace] Error saving token:', error);
    return { success: false, error: error.message };
  }
});

// Get stored HuggingFace token
ipcMain.handle('get-hf-token', async () => {
  try {
    const storedToken = store.get('huggingface_token', '');
    if (!storedToken) {
      return { success: true, token: '' };
    }

    // Decrypt token if encryption is available
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(storedToken, 'base64');
        const token = safeStorage.decryptString(buffer);
        return { success: true, token };
      } catch (decryptError) {
        // If decryption fails, the token might be stored in plain text (old format)
        console.warn('[HuggingFace] Token decryption failed, returning as-is');
        return { success: true, token: storedToken };
      }
    } else {
      // Encryption not available, return plain text
      return { success: true, token: storedToken };
    }
  } catch (error) {
    console.error('[HuggingFace] Error getting token:', error);
    return { success: false, error: error.message };
  }
});

// Clear HuggingFace token (logout)
ipcMain.handle('clear-hf-token', async () => {
  try {
    // Remove from electron-store
    store.delete('huggingface_token');

    // Remove token file
    const os = require('os');
    const tokenPath = path.join(os.homedir(), '.cache', 'huggingface', 'token');

    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }

    console.log('[HuggingFace] Token cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('[HuggingFace] Error clearing token:', error);
    return { success: false, error: error.message };
  }
});

// Open HuggingFace token page in browser
ipcMain.handle('open-hf-token-page', async () => {
  try {
    await shell.openExternal('https://huggingface.co/settings/tokens');
    return { success: true };
  } catch (error) {
    console.error('[HuggingFace] Error opening token page:', error);
    return { success: false, error: error.message };
  }
});

// Test HuggingFace token validity
ipcMain.handle('test-hf-token', async (event, token) => {
  try {
    // Test the token by making a simple API request
    const https = require('https');

    return new Promise((resolve) => {
      const options = {
        hostname: 'huggingface.co',
        path: '/api/whoami-v2',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const userData = JSON.parse(data);
              resolve({
                success: true,
                valid: true,
                username: userData.name || 'Unknown'
              });
            } catch (e) {
              resolve({ success: true, valid: true });
            }
          } else {
            resolve({
              success: true,
              valid: false,
              error: 'Invalid token or unauthorized'
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout'
        });
      });

      req.end();
    });
  } catch (error) {
    console.error('[HuggingFace] Error testing token:', error);
    return { success: false, error: error.message };
  }
});

console.log('[HuggingFace] Authentication system initialized');

// ========================================
// AUTO-UPDATE SYSTEM
// ========================================

function checkForUpdates() {
  console.log('[Auto-Update] Checking for updates...');
  autoUpdater.checkForUpdates().catch(err => {
    console.error('[Auto-Update] Error checking for updates:', err);
  });
}

// IPC handler for manual update check
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for restarting to install update (Linear-style)
ipcMain.handle('restart-to-update', () => {
  console.log('[Auto-Update] Restarting to install update...');
  autoUpdater.quitAndInstall(false, true);
});

// ========================================
// VOICE RECORDING IPC HANDLERS
// ========================================

// Get or create the recordings folder
function getRecordingsFolder() {
  const os = require('os');
  const homeDir = os.homedir();
  const recordingsDir = path.join(homeDir, 'VAI - Recorded Audio');

  // Create directory if it doesn't exist
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
    console.log('[Recording] Created recordings folder:', recordingsDir);
  }

  return recordingsDir;
}

// Save recorded audio blob to file
ipcMain.handle('save-recording', async (event, { blob, mimeType, duration }) => {
  try {
    const crypto = require('crypto');

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(4).toString('hex');

    // Determine file extension from MIME type
    let extension = 'webm'; // Default
    if (mimeType.includes('audio/ogg')) extension = 'ogg';
    else if (mimeType.includes('audio/mp4')) extension = 'm4a';
    else if (mimeType.includes('audio/wav')) extension = 'wav';
    else if (mimeType.includes('audio/webm')) extension = 'webm';

    // Create file path in dedicated recordings folder
    const recordingsDir = getRecordingsFolder();
    const fileName = `vai-recording-${timestamp}-${randomId}.${extension}`;
    const filePath = path.join(recordingsDir, fileName);

    // Convert blob data (received as array buffer) to Buffer
    const buffer = Buffer.from(blob);

    // Write to file
    fs.writeFileSync(filePath, buffer);

    console.log('[Recording] Saved to:', filePath);

    return {
      success: true,
      filePath: filePath,
      fileName: fileName,
      duration: duration
    };
  } catch (error) {
    console.error('[Recording] Error saving:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Show recording file in folder
ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    console.error('[Recording] Error showing file:', error);
    return { success: false, error: error.message };
  }
});

// Open recordings folder
ipcMain.handle('open-recordings-folder', async () => {
  try {
    // Get or create the recordings folder
    const recordingsDir = getRecordingsFolder();

    // Open the recordings directory in file explorer
    shell.openPath(recordingsDir);

    return { success: true };
  } catch (error) {
    console.error('[Recording] Error opening folder:', error);
    return { success: false, error: error.message };
  }
});

// Select audio file from recordings folder
ipcMain.handle('select-from-recordings', async () => {
  try {
    const recordingsDir = getRecordingsFolder();

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      defaultPath: recordingsDir,
      filters: [
        { name: 'Audio Files', extensions: ['webm', 'mp3', 'wav', 'm4a', 'ogg', 'flac'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);

    // Try to get file stats for duration (we can't easily get audio duration without loading it)
    // For now, just return 0 for duration
    return {
      success: true,
      filePath: filePath,
      fileName: fileName,
      duration: 0
    };
  } catch (error) {
    console.error('[Recording] Error selecting file:', error);
    return { success: false, error: error.message };
  }
});

// Cleanup temporary recording file
ipcMain.handle('cleanup-temp-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath) && filePath.includes('vai-recording-')) {
      fs.unlinkSync(filePath);
      console.log('[Cleanup] Deleted temporary file:', filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return { success: false, error: error.message };
  }
});

// Open external URL (for Apache License link)
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('[Open External] Error:', error);
    return { success: false, error: error.message };
  }
});

// Open LICENSE file in default text editor
ipcMain.handle('open-license-file', async () => {
  try {
    const licensePath = path.join(__dirname, '..', 'LICENSE');
    await shell.openPath(licensePath);
    return { success: true };
  } catch (error) {
    console.error('[Open License] Error:', error);
    return { success: false, error: error.message };
  }
});

console.log('[Auto-Update] System initialized');
