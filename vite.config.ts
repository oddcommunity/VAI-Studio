import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  base: './',

  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
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
      'react-native-svg': 'react-native-svg-web'
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
  }
})
