/**
 * macOS Notarization Script
 *
 * This script is called by electron-builder after signing.
 * It submits the app to Apple's notarization service.
 *
 * Required environment variables:
 * - APPLE_ID: Your Apple ID email
 * - APPLE_APP_SPECIFIC_PASSWORD: App-specific password from appleid.apple.com
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 *
 * To generate an app-specific password:
 * 1. Go to https://appleid.apple.com
 * 2. Sign in → Security → App-Specific Passwords → Generate
 */

const { notarize } = require('@electron/notarize');
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: not macOS');
    return;
  }

  // Check for required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping notarization: missing environment variables');
    console.log('  APPLE_ID:', appleId ? '✓' : '✗ missing');
    console.log('  APPLE_APP_SPECIFIC_PASSWORD:', appleIdPassword ? '✓' : '✗ missing');
    console.log('  APPLE_TEAM_ID:', teamId ? '✓' : '✗ missing');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appName}...`);
  console.log(`App path: ${appPath}`);

  try {
    await notarize({
      tool: 'notarytool',
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });
    console.log(`Successfully notarized ${appName}`);

    // Staple the notarization ticket to the app
    console.log('Stapling notarization ticket...');
    try {
      execSync(`stapler staple "${appPath}"`, { stdio: 'inherit' });
      console.log('Successfully stapled notarization ticket');
    } catch (stapleError) {
      console.error('Warning: Stapling failed:', stapleError.message);
      console.error('The app is notarized but ticket is not stapled.');
      console.error('Users will need internet connection on first launch.');
      // Don't throw - stapling failure is not fatal, just a warning
    }

    // Validate the staple was applied
    console.log('Validating notarization staple...');
    try {
      const validateOutput = execSync(`stapler validate "${appPath}"`, { encoding: 'utf8' });
      if (validateOutput.includes('The validate action worked')) {
        console.log('✅ Notarization ticket validated successfully');
      } else {
        console.warn('⚠️ Staple validation returned unexpected output');
        console.warn(validateOutput);
      }
    } catch (validateError) {
      console.error('⚠️ Staple validation failed - ticket may not be attached');
      console.error('Users may see Gatekeeper warnings on first launch');
    }

  } catch (error) {
    console.error('Notarization failed:', error.message);
    throw error;
  }
};
