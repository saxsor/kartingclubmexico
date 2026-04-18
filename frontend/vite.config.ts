import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Karting Club México',
        short_name: 'KCM',
        description: 'Eventos, parrillas, resultados y campeonato de Karting Club México',
        theme_color: '#dc2626',
        background_color: '#0f0f0f',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'es-MX',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/events\/.*\/grid/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-grid-cache', expiration: { maxEntries: 50 } },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/events\/.*\/results/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-results-cache', expiration: { maxEntries: 50 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('recharts')) return 'charts';
          if (id.includes('@dnd-kit')) return 'dnd-kit';
          if (id.includes('@tanstack/react-query')) return 'query';
          if (id.includes('react-helmet-async')) return 'seo';

          return 'vendor';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
