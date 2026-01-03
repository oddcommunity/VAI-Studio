import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

// Supabase project URL for storage (avatars, etc.)
const SUPABASE_STORAGE_URL = 'https://vjiexzktmduoguxvleiy.supabase.co';

// Plugin to inject CSP meta tag in production builds only
const cspPlugin = (): Plugin => ({
  name: 'csp-injection',
  transformIndexHtml(html, ctx) {
    // Only inject CSP in production builds
    if (ctx.bundle) {
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com",
        `img-src 'self' data: ${SUPABASE_STORAGE_URL}`,
        "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://fonts.cdnfonts.com",
        `connect-src 'self' ${SUPABASE_STORAGE_URL}`,
        "media-src 'self' file:"
      ].join('; ');

      return html.replace(
        '<!-- In production builds, CSP is set during the build process -->',
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
      );
    }
    return html;
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), cspPlugin()],

  base: './',

  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
    sourcemap: mode === 'production' ? 'hidden' : true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'onboarding-overlay': path.resolve(__dirname, 'onboarding-overlay.html'),
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          // CRITICAL: Bundle ALL Tamagui-related code together to prevent theme context issues
          // Splitting tamagui into separate chunks can cause "Missing theme" errors
          // because the context may be created before the theme config is loaded
          'ui-framework': [
            'tamagui',
            '@tamagui/core',
            '@tamagui/config',
            '@tamagui/themes',
            '@tamagui/shorthands',
            '@tamagui/toast',
          ],
          'state-management': ['zustand'],
        }
      }
    },
    // Remove console.log in production
    minify: 'esbuild',
    target: 'esnext',
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/react'),
      '@components': path.resolve(__dirname, './src/react/components'),
      '@services': path.resolve(__dirname, './src/react/services'),
      '@stores': path.resolve(__dirname, './src/react/stores'),
      '@hooks': path.resolve(__dirname, './src/react/hooks'),
      '@types': path.resolve(__dirname, './src/react/types'),
      '@themes': path.resolve(__dirname, './src/react/themes'),
      // CRITICAL: Force all React imports to resolve to ONE instance
      // This prevents "Invalid hook call" and context issues from duplicate React
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      // CRITICAL: Force all Tamagui imports to resolve to ONE instance
      // This prevents "Missing theme" errors from duplicate Tamagui contexts
      // Note: Using find/replacement pattern to handle subpath imports like @tamagui/config/v3
      'tamagui': path.resolve(__dirname, './node_modules/tamagui'),
      '@tamagui/core': path.resolve(__dirname, './node_modules/@tamagui/core'),
      '@tamagui/web': path.resolve(__dirname, './node_modules/@tamagui/web'),
      '@tamagui/toast': path.resolve(__dirname, './node_modules/@tamagui/toast'),
      '@tamagui/animate-presence': path.resolve(__dirname, './node_modules/@tamagui/animate-presence'),
      // React Native Web aliases for Tamagui
      'react-native': 'react-native-web',
      'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(__dirname, './src/react/shims/codegenNativeComponent.ts'),
      'react-native-svg': 'react-native-svg-web',
      'react-native-safe-area-context': path.resolve(__dirname, './src/react/shims/safe-area-context.ts'),
      // Odd design system - use source files directly for better Vite resolution
      '@odd-design-system/ui-components/tamagui.config': path.resolve(__dirname, './odd-design-system/packages/ui-components/tamagui.config.ts'),
      // Odd core UI - use web-only entry points to avoid Expo dependency issues
      '@odd-core/ui/hooks-web-only': path.resolve(__dirname, './odd-core/packages/ui/dist/hooks-web-only.mjs'),
      '@odd-core/ui/hooks': path.resolve(__dirname, './odd-core/packages/ui/dist/hooks/index.mjs'),
      '@odd-core/ui/immersive-onboarding': path.resolve(__dirname, './odd-core/packages/ui/dist/features/immersive-onboarding/index.mjs'),
      '@odd-core/ui': path.resolve(__dirname, './odd-core/packages/ui/dist/index.mjs'),
      // Odd core storage - use web-only entry point to avoid Expo dependencies
      '@odd-core/storage/web-only': path.resolve(__dirname, './odd-core/packages/storage/dist/web-only.mjs'),
      '@odd-core/storage/profile-cache/web': path.resolve(__dirname, './odd-core/packages/storage/dist/profile-cache/web.mjs'),
      // Use browser crypto API instead of Node.js crypto
      'crypto': path.resolve(__dirname, './src/react/shims/crypto.ts'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js']
  },

  server: {
    port: 3000,
    strictPort: true
  },

  // Optimize for Electron
  optimizeDeps: {
    exclude: ['electron']
  },

  // Define Node.js globals for browser compatibility
  define: {
    'process.env': {}
  },

  // Production-only settings
  esbuild: mode === 'production' ? {
    drop: ['console', 'debugger'],
    pure: ['console.log', 'console.debug', 'console.info'],
  } : {},
}))
