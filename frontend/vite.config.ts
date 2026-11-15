import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward /api calls to Laravel so the browser sees one origin (no CORS locally).
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
