import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  esbuild: {
    // Remove console.log and debugger statements in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  // Exclude the api folder (Vercel serverless functions) from Vite processing
  server: {
    watch: {
      ignored: ['**/api/**'],
    },
  },
  optimizeDeps: {
    exclude: ['api'],
  },
  build: {
    // Optimize chunk splitting for better caching and smaller initial load
    rollupOptions: {
      external: [/^\/api\/.*/],
      output: {
        manualChunks: (id) => {
          // React core - must load first
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Charts library (large)
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'charts-vendor';
          }
          // Supabase client
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          // Animation library
          if (id.includes('node_modules/framer-motion/')) {
            return 'animation-vendor';
          }
          // i18n
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'i18n-vendor';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns/')) {
            return 'date-vendor';
          }
          // PDF generation
          if (id.includes('node_modules/jspdf')) {
            return 'pdf-vendor';
          }
          // State management and data fetching
          if (id.includes('node_modules/@tanstack/') || id.includes('node_modules/zustand/')) {
            return 'state-vendor';
          }
          // Other vendor modules
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'AgroAfrica - Farm Management',
        short_name: 'AgroAfrica',
        description: 'Voice-enabled farm management app for African smallholder farmers',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.worldbank\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'worldbank-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
}))
