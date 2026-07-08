// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // 'autoUpdate' = a new deploy activates and reloads the page automatically,
      // no prompt. Safe here: the app is a read-only catalog (nothing to lose but
      // scroll position), and updates only fetch when online — never at the crag.
      registerType: 'autoUpdate',

      // Served at the domain root (custom domain www.ascendbox.fr) → base '/'.
      // On a project-pages URL (github.io/ascendbox/) you would set scope/base to
      // '/ascendbox/' instead. See README "GitHub Pages" note.
      scope: '/',
      base: '/',

      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],

      manifest: {
        name: 'AscendBox — Exercices d’escalade',
        short_name: 'AscendBox',
        description:
          'Catalogue d’exercices d’entraînement pour coachs d’escalade, utilisable hors ligne.',
        lang: 'fr',
        dir: 'ltr',
        // 'standalone' = no browser chrome → looks/behaves like a native app.
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        // theme_color drives the Android status bar; background_color the splash screen.
        theme_color: '#0f172a', // slate-900 (matches dark shell)
        background_color: '#0f172a',
        categories: ['sports', 'health', 'education'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          // 'maskable' lets Android crop to any shape without clipping the logo.
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // PRECACHE: everything the app shell needs offline — JS, CSS, HTML, icons,
        // AND the exercise data (public/data/exercises.json → dist/data). Each file
        // is revisioned, so a new deploy invalidates only what changed.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        // Don't waste the cache on the 284KB social share image (never used in-app).
        globIgnores: ['**/social-preview.jpg'],
        // SPA offline fallback: any navigation resolves to the cached index.html.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          // Google Fonts stylesheet (fonts.googleapis.com) — small, changes rarely.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts webfont files (fonts.gstatic.com) — the actual .woff2.
          // CacheFirst so Inter renders offline at the crag after the first visit.
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Enable the SW in `vite dev` too, so the offline flow is testable locally.
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
