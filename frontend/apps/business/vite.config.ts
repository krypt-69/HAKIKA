import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/business/',
  server: {
    host: true,
    port: 3001,
    allowedHosts: true,
  },
})
