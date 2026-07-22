import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { version } from './package.json'

export default defineConfig({
  // electron-vite turns minification off for all three targets by default, which is a
  // deliberate deviation from Vite and easy to inherit without noticing. Klik was
  // shipping every chunk unminified — react-dom alone arrived as 517 kB of formatted
  // source that the renderer had to parse before the first frame.
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { minify: 'esbuild' }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { minify: 'esbuild' }
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
      minify: 'esbuild',
      rollupOptions: {
        output: {
          /**
           * Split the vendors that dominate the bundle so the shell isn't blocked on
           * parsing all of them, and so a dependency bump doesn't invalidate the whole
           * cache. Measured before splitting: one 1.62 MB chunk.
           */
          manualChunks(id: string): string | undefined {
            if (!id.includes('node_modules')) return undefined
            // Match on the resolved path, not the bare specifier: the app imports
            // `react-dom/client`, which a specifier list keyed on `react-dom` misses
            // entirely — react-dom was landing in the main chunk the split existed to
            // relieve.
            if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'react'
            if (/[\/]node_modules[\/]motion/.test(id)) return 'motion'
            if (/[\/]node_modules[\/]lucide-react[\/]/.test(id)) return 'icons'
            if (/[\/]node_modules[\/]@base-ui/.test(id)) return 'base-ui'
            return undefined
          }
        }
      }
    }
  }
})
