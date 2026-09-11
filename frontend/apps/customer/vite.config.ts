import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      base: '/customer/',
      scope: '/customer/',
      registerType: 'prompt',
      devOptions: {
        enabled: false,
      },
      manifest: {
        id: '/customer/',
        name: 'Hakika Customer',
        short_name: 'Customer',
        description: 'Hakika Customer application',
        start_url: '/customer/',
        scope: '/customer/',
        display: 'standalone',
        theme_color: '#F6F2E9',
        background_color: '#F4F1EA',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  base: '/customer/',
  server: {
    host: true,
    port: 3002,
    allowedHosts: true,
  },
})
