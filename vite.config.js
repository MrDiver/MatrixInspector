import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
        // Cache pyodide and html2canvas for offline use
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Matrix Inspector',
        short_name: 'MatrixInsp',
        description: 'Interactive matrix multiplication and dependency visualization',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/MatrixInspector/',
        start_url: '/MatrixInspector/',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231a1a1a" width="192" height="192"/><text x="50%" y="50%" font-size="80" fill="white" text-anchor="middle" dy=".3em" font-weight="bold">M</text></svg>',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  // Use relative paths so the app works when served from a GitHub Pages subpath
  base: './',
  build: {
    // Always build with debug settings
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        // Keep chunk size warnings but don't error
        manualChunks: undefined
      }
    }
  }
})
