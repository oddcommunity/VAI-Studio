/**
 * Onboarding Overlay Window
 *
 * Creates a fullscreen, transparent overlay window for immersive first-run onboarding.
 * Features:
 * - Transparent background (shows animated content from React)
 * - Always on top (above Dock and Menu Bar on macOS)
 * - Visible on all workspaces
 * - No frame or shadow (seamless overlay effect)
 */

const { BrowserWindow, screen, ipcMain, systemPreferences } = require('electron');
const path = require('path');

let overlayWindow = null;

/**
 * Create the onboarding overlay window
 * @param {BrowserWindow} mainWindow - Reference to main window (to hide/show)
 * @returns {BrowserWindow} The overlay window instance
 */
function createOnboardingOverlay(mainWindow) {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.focus();
        return overlayWindow;
    }

    // Get primary display dimensions
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const bounds = screen.getPrimaryDisplay().bounds;

    overlayWindow = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        focusable: true,
        fullscreen: false, // Use manual sizing to avoid fullscreen mode issues
        show: false, // Show after content loads
        // macOS specific
        ...(process.platform === 'darwin' && {
            hasShadow: false,
            vibrancy: null,
            hiddenInMissionControl: true,
        }),
        webPreferences: {
            preload: path.join(__dirname, 'preload-overlay.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
        backgroundColor: '#00000000', // Fully transparent
    });

    // Set window level to appear above system UI on macOS
    if (process.platform === 'darwin') {
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }

    // Hide main window while overlay is shown
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
    }

    // Load the overlay HTML
    const isDev = process.argv.includes('--dev') || !require('electron').app.isPackaged;
    if (isDev) {
        // Development: try Vite dev server first
        overlayWindow.loadURL('http://localhost:3000/onboarding-overlay.html').catch(() => {
            // Fallback to built file
            overlayWindow.loadFile(path.join(__dirname, '..', 'dist-react', 'onboarding-overlay.html'));
        });
    } else {
        // Production: load from dist
        overlayWindow.loadFile(path.join(__dirname, '..', 'dist-react', 'onboarding-overlay.html'));
    }

    // Show once ready
    overlayWindow.once('ready-to-show', () => {
        overlayWindow.show();
        overlayWindow.focus();
    });

    // Clean up on close
    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });

    return overlayWindow;
}

/**
 * Close the onboarding overlay and show main window
 * @param {BrowserWindow} mainWindow - Reference to main window
 */
function closeOnboardingOverlay(mainWindow) {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.close();
        overlayWindow = null;
    }

    // Show and focus main window
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
    }
}

/**
 * Check if overlay is currently open
 * @returns {boolean}
 */
function isOverlayOpen() {
    return overlayWindow !== null && !overlayWindow.isDestroyed();
}

/**
 * Register IPC handlers for onboarding overlay
 * @param {BrowserWindow} mainWindow - Reference to main window
 * @param {object} store - Electron store instance
 */
function registerOverlayHandlers(mainWindow, store) {
    // Handle onboarding completion
    ipcMain.handle('onboarding:complete', async () => {
        console.log('[OnboardingOverlay] Onboarding complete');

        // Update settings
        const settings = store.get('vai-studio-settings', {});
        store.set('vai-studio-settings', {
            ...settings,
            hasCompletedOnboarding: true,
        });

        // Close overlay and show main window
        closeOnboardingOverlay(mainWindow);

        // Notify main window
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('onboarding-completed');
        }

        return { success: true };
    });

    // Handle permission request
    ipcMain.handle('onboarding:request-permission', async (event, type) => {
        console.log(`[OnboardingOverlay] Requesting permission: ${type}`);

        if (process.platform !== 'darwin') {
            // Non-macOS: permissions handled differently
            return { granted: true };
        }

        try {
            switch (type) {
                case 'microphone': {
                    const currentStatus = systemPreferences.getMediaAccessStatus('microphone');
                    if (currentStatus === 'granted') {
                        return { granted: true };
                    }
                    if (currentStatus === 'denied') {
                        return { granted: false, needsSystemPreferences: true };
                    }
                    // Request permission
                    const granted = await systemPreferences.askForMediaAccess('microphone');
                    return { granted };
                }
                case 'camera': {
                    const currentStatus = systemPreferences.getMediaAccessStatus('camera');
                    if (currentStatus === 'granted') {
                        return { granted: true };
                    }
                    if (currentStatus === 'denied') {
                        return { granted: false, needsSystemPreferences: true };
                    }
                    const granted = await systemPreferences.askForMediaAccess('camera');
                    return { granted };
                }
                case 'notifications': {
                    // Notifications don't have the same permission API on macOS
                    // The app will request when needed
                    return { granted: true };
                }
                default:
                    return { granted: false };
            }
        } catch (error) {
            console.error(`[OnboardingOverlay] Permission request error:`, error);
            return { granted: false };
        }
    });
}

module.exports = {
    createOnboardingOverlay,
    closeOnboardingOverlay,
    isOverlayOpen,
    registerOverlayHandlers,
};
