import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Build configuration
  build: {
    // Source maps for debugging in production (set to true if needed)
    sourcemap: false,
    // Minification
    minify: 'esbuild',
    // Ensure environment variables are included in build
    // Vite automatically includes all VITE_ prefixed variables
  },
  // Server configuration for development
  server: {
    port: 3000,
    strictPort: false,
  },
  // Preview configuration (for testing production build locally)
  preview: {
    port: 3000,
    strictPort: false,
  },
})
