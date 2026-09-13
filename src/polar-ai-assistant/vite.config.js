import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      name: 'PolarAIAssistant',
      fileName: (format) => `polar-ai-assistant.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'lucide-react'],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'lucide-react': 'lucideReact',
        },
      },
    },
  },
})
