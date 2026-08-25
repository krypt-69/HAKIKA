import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/rider/",
  server: {
    host: true,
    port: 3003,
    allowedHosts: true,
  },
})
