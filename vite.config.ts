import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'http://localhost:5290'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // The SPA talks to relative paths, so dev and production behave the same.
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
})
