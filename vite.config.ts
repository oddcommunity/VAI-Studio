import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  base: './',

  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
    sourcemap: mode === 'production' ? 'hidden' : true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'tamagui-core': ['tamagui'],
          'tamagui-config': ['@tamagui/config', '@tamagui/themes', '@tamagui/shorthands'],
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
      // React Native Web aliases for Tamagui
      'react-native': 'react-native-web',
      'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(__dirname, './src/react/shims/codegenNativeComponent.ts'),
      'react-native-svg': 'react-native-svg-web',
      'react-native-safe-area-context': path.resolve(__dirname, './src/react/shims/safe-area-context.ts'),
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

  // Production-only settings
  esbuild: mode === 'production' ? {
    drop: ['console', 'debugger'],
    pure: ['console.log', 'console.debug', 'console.info'],
  } : {},
}))
