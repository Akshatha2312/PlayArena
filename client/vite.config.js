import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons.svg'],
      manifest: {
        name: 'Play Arena',
        short_name: 'Play Arena',
        description: 'Indoor Gaming & Sports Center Booking Platform',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/socket.io\//],
        runtimeCaching: [
          {
            // CRITICAL SECURITY RULE: Exclude API requests from service worker caching
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            // CRITICAL SECURITY RULE: Exclude socket.io connection endpoints
            urlPattern: /^\/socket\.io\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            // Cache static assets securely
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});

