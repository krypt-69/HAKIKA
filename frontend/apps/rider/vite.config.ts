import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      base: '/rider/',
      scope: '/rider/',
      registerType: 'prompt',
      devOptions: {
        enabled: false,
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        id: '/rider/',
        name: 'Hakika Rider',
        short_name: 'Rider',
        description: 'Hakika Rider application',
        start_url: '/rider/',
        scope: '/rider/',
        display: 'standalone',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: '/rider/',
  server: {
    host: true,
    port: 3003,
    allowedHosts: true,
  },
})
