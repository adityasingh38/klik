import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { version } from './package.json'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    },
    // Single source of truth for the version the UI shows — package.json, the same
    // value electron-builder names the installer after.
    define: {
      __APP_VERSION__: JSON.stringify(version)
    },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          /**
           * Split the vendors that dominate the bundle so the shell isn't blocked on
           * parsing all of them, and so a dependency bump doesn't invalidate the whole
           * cache. Measured before splitting: one 1.62 MB chunk.
           */
          manualChunks: {
            react: ['react', 'react-dom'],
            motion: ['motion'],
            icons: ['lucide-react']
          }
        }
      }
    }
  }
})
