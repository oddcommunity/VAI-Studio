/**
 * Tamagui Configuration
 * Using VAI theme with dark mode optimized for Electron
 */

import { createTamagui } from '@odd-design-system/ui-components'
import { shorthands } from '@tamagui/shorthands'
import { themes, tokens } from '@tamagui/themes'
import { createMedia } from '@tamagui/react-native-media-driver'
import { vaiTheme, vaiDarkTheme } from './themes/vai'

// Create VAI tokens based on the existing themes
const vaiTokens = {
  ...tokens,
  color: {
    ...tokens.color,
    ...vaiTheme,
    ...vaiDarkTheme
  }
}

// Create VAI themes
const vaiThemes = {
  light: {
    ...themes.light,
    ...vaiTheme
  },
  dark: {
    ...themes.dark,
    ...vaiDarkTheme
  },
  // Alias for easier use
  vai_light: {
    ...themes.light,
    ...vaiTheme
  },
  vai_dark: {
    ...themes.dark,
    ...vaiDarkTheme
  }
}

export const config = createTamagui({
  themes: vaiThemes,
  tokens: vaiTokens,
  shorthands,
  media: createMedia({
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 }
  }),
  settings: {
    // Optimized for Electron
    shouldAddPrefersColorThemes: false,
    themeClassNameOnRoot: false,
    mediaQueryDefaultActive: {
      xl: true
    }
  }
})

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
