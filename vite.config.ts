import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base makes the same build work on GitHub Pages project sites,
// custom domains, and Electron's app:// protocol.
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'GoGame 3D',
        short_name: 'Go3D',
        description: '3D Go with KataGo and chess-piece stones',
        theme_color: '#1a120b',
        background_color: '#1a120b',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,png,svg,json,bin,glb}'],
        maximumFileSizeToCacheInBytes: 32 * 1024 * 1024
      }
    })
  ],
  build: {
    outDir: 'dist',
    target: 'es2022',
    chunkSizeWarningLimit: 4000
  },
  server: {
    port: 5173
  }
});
