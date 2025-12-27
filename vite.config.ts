
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Esto le dice a Vite que la raíz del proyecto es la carpeta actual, no 'src'
  root: './',
  build: {
    outDir: 'dist',
  }
})
