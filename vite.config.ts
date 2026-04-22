import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tauri v2 expects the dev server on port 1420
  // and needs the host to be accessible from the Tauri process
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    watch: {
      // Tell Vite to ignore watching src-tauri so Rust rebuilds don't trigger
      // the Vite HMR watcher unnecessarily
      ignored: ['**/src-tauri/**'],
    },
  },

  // Prevent Vite from obscuring Rust compile errors in the terminal
  clearScreen: false,

  // Tauri needs an absolute base path when building for production
  base: './',

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux.
    // Both support modern JS/CSS, so we can target ES2021+
    target: ['es2021', 'chrome100', 'safari15'],
    // Don't minify for debug builds — Tauri handles this
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce source maps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
