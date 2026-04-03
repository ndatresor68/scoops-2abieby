import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: 'esbuild',
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    chunkSizeWarningLimit: 600,
    target: ['es2020', 'chrome91', 'firefox88', 'safari14'],
    cssCodeSplit: true,
    reportCompressedSize: false,
    modulePreload: {
      polyfill: false,
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: '127.0.0.1',
  },
  preview: {
    port: 3000,
    strictPort: false,
    host: '127.0.0.1',
  },
}))
