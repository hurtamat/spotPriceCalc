import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The Shelly wizard imports ../scripts/shelly/dist/*.js?raw — the minified device scripts it
    // fills in and hands the user. They live outside this package, so dev-server reads need allowing.
    fs: { allow: ['..'] },
  },
})
