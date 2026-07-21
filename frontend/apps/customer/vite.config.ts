import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/customer/',
  server: {
    host: true,
    port: 3002,
    allowedHosts: true,
  },
})
