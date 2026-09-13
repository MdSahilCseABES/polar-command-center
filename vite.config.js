// Vite is the tool that runs our development server and bundles the app.
// This config is intentionally minimal — it just turns on React support.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // automatically opens your browser when you run `npm run dev`
  },
})
