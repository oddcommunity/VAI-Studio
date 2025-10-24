const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let autoUpdater;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize auto-updater after app is ready
  const { autoUpdater: updater } = require('electron-updater');
  autoUpdater = updater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  console.log('[Auto-Update] System initialized');

  // Set up auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('[Auto-Update] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Auto-Update] Update available:', info.version);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available!`,
        detail: 'Would you like to download it now?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
          if (mainWindow) {
            mainWindow.webContents.send('update-downloading');
          }
        }
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Auto-Update] No updates available');
  });

  autoUpdater.on('error', (err) => {
    console.error('[Auto-Update] Error:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
    log += ` (${progressObj.transferred}/${progressObj.total})`;
    console.log('[Auto-Update]', log);
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Auto-Update] Update downloaded');
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded successfully!',
        detail: 'The application will restart to install the update.',
        buttons: ['Restart Now', 'Restart Later'],
        defaultId: 0,
        cancelId: 1
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
    }
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
    // Use venv Python if in Docker, otherwise system Python
    const pythonPath = process.env.DOCKER_ENV === 'true'
      ? '/app/venv/bin/python'
      : 'python3';
    const scriptPath = path.join(__dirname, '../backends/runner.py');
    const os = require('os');

    // Add ffmpeg to PATH for audio processing
    const homeDir = os.homedir();
    const ffmpegPath = path.join(homeDir, '.local', 'bin');
    const envPath = process.env.PATH ? `${ffmpegPath}:${process.env.PATH}` : ffmpegPath;

    console.log('[Python] Running:', pythonPath, scriptPath, ...args);

    const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
      env: { ...process.env, PATH: envPath }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('[Python stderr]:', data.toString());
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
  try {
    const args = ['transcribe', backend, audioPath, modelName];
    if (task) {
      args.push(task);
    }
    
    const result = await runPythonCommand(args);
    return result;
  } catch (error) {
    console.error('Error transcribing:', error);
    return { success: false, error: error.message };
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
  try {
    const args = ['benchmark', backend, audioPath, modelName, referenceText];
    const result = await runPythonCommand(args);
    return result;
  } catch (error) {
    console.error('Error running benchmark:', error);
    return { success: false, error: error.message };
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

console.log('[Auto-Update] System initialized');
