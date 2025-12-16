/**
 * Onboarding Overlay Entry Point
 *
 * React entry point for the immersive onboarding overlay window.
 * Configures the ImmersiveOnboardingOverlay with VAI Studio-specific content.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { OddProvider } from './providers/OddProvider';
import {
    ImmersiveOnboardingOverlay,
    type ImmersiveOnboardingConfig,
    type PermissionType,
} from '@odd-core/ui/immersive-onboarding';

// Declare global window types for IPC bridge
declare global {
    interface Window {
        onboardingAPI: {
            complete: () => Promise<{ success: boolean }>;
            requestPermission: (type: PermissionType) => Promise<{
                granted: boolean;
                needsSystemPreferences?: boolean;
            }>;
        };
        platformInfo: {
            platform: string;
            isMac: boolean;
            isWindows: boolean;
            isLinux: boolean;
        };
    }
}

// VAI Blue theme colors
const VAI_BLUE = 'hsl(215, 83%, 50%)';
const VAI_BLUE_HOVER = 'hsl(215, 83%, 45%)';
const VAI_BLUE_PRESS = 'hsl(215, 83%, 40%)';

/**
 * VAI Studio onboarding configuration
 */
const vaiOnboardingConfig: ImmersiveOnboardingConfig = {
    appName: 'VAI Studio',
    appIcon: './app-icon.png',
    steps: [
        {
            id: 'welcome',
            type: 'welcome',
            title: 'Welcome to VAI Studio',
            description:
                'Your local Speech-to-Text testing and comparison tool.\n100% Private. No Cloud Required.',
        },
        {
            id: 'microphone',
            type: 'permission',
            title: 'Enable Microphone Access',
            description:
                'VAI Studio can record audio directly from your microphone for transcription.',
            permission: {
                type: 'microphone',
                required: false,
                explanation:
                    'Microphone access is needed to record voice notes. You can also import audio files without this permission.',
            },
            buttonText: 'Allow Microphone',
            skippable: true,
        },
        {
            id: 'ready',
            type: 'ready',
            title: "You're All Set!",
            description:
                'Start by selecting an audio file or recording your voice. All processing happens locally on your machine.',
        },
    ],
    theme: {
        overlayOpacity: 0.9,
        accentColor: VAI_BLUE,
        accentColorHover: VAI_BLUE_HOVER,
        accentColorPress: VAI_BLUE_PRESS,
        textColor: 'white',
        subtitleColor: 'rgba(255, 255, 255, 0.7)',
    },
    // Note: Lottie animation will be added once we have the asset
    // animations: {
    //     background: gradientAnimation,
    // },
    onComplete: async () => {
        console.log('[OnboardingOverlay] Completing onboarding...');
        await window.onboardingAPI.complete();
    },
    onRequestPermission: async (type) => {
        console.log(`[OnboardingOverlay] Requesting permission: ${type}`);
        return window.onboardingAPI.requestPermission(type);
    },
    showSkip: true,
    skipText: 'Skip',
};

/**
 * Main overlay app component
 */
function OnboardingOverlayApp(): React.ReactElement {
    return (
        <OddProvider defaultTheme="vai_dark">
            <ImmersiveOnboardingOverlay config={vaiOnboardingConfig} />
        </OddProvider>
    );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<OnboardingOverlayApp />);
}

export default OnboardingOverlayApp;
