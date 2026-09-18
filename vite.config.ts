import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function buildId() {
  const sha = process.env.GITHUB_SHA?.slice(0, 7)
  if (sha) return sha
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12) }
}

export default defineConfig({
  base: './',
  define: { __APP_BUILD__: JSON.stringify(buildId()) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Pomiar 3D',
        short_name: 'Pomiar3D',
        description: 'Offline-first rejestrator pomiarów pomieszczeń dla Blendera',
        theme_color: '#111827',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,json}']
      },
      devOptions: { enabled: true }
    })
  ]
})
