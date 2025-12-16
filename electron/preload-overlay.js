/**
 * Preload Script for Onboarding Overlay
 *
 * Minimal IPC bridge for the immersive onboarding overlay.
 * Only exposes the methods needed for onboarding flow.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('onboardingAPI', {
    /**
     * Complete onboarding - closes overlay and shows main window
     */
    complete: () => ipcRenderer.invoke('onboarding:complete'),

    /**
     * Request a system permission
     * @param {'microphone' | 'camera' | 'notifications'} type - Permission type
     * @returns {Promise<{ granted: boolean, needsSystemPreferences?: boolean }>}
     */
    requestPermission: (type) => ipcRenderer.invoke('onboarding:request-permission', type),
});

// Expose platform info for conditional UI
contextBridge.exposeInMainWorld('platformInfo', {
    platform: process.platform,
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',
});
