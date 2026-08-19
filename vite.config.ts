// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // 'autoUpdate': new deploy activates + reloads silently. Safe - read-only catalog,
      // updates only fetch when online.
      registerType: 'autoUpdate',

      // Domain root (www.ascendbox.fr) → '/'. For project-pages (github.io/ascendbox/) use '/ascendbox/'.
      scope: '/',
      base: '/',

      // No includeAssets: everything in public/ is already swept up by the `globPatterns` below,
      // and listing favicon.svg / apple-touch-icon.png there only duplicated their precache entries.

      manifest: {
        name: 'AscendBox - Exercices d’escalade',
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
        // Precache the app shell + exercise data (revisioned; a deploy invalidates only what changed).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // Keep only the Inter subsets French needs (latin + latin-ext, for the œ ligature).
        // social-preview.jpg needs no entry here: `jpg` is absent from globPatterns above, so it
        // was never a precache candidate - same for robots.txt and CNAME.
        globIgnores: [
          '**/inter-cyrillic-*.woff2',
          '**/inter-greek-*.woff2',
          '**/inter-vietnamese-*.woff2',
        ],
        // SPA offline fallback: any navigation resolves to the cached index.html.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // No runtimeCaching: Inter is self-hosted (precached via globPatterns); no third-party fetch.
      },

      // Enable the SW in `vite dev` too, so the offline flow is testable locally.
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  resolve: {
    alias: {
      // `import.meta.dirname`, not `__dirname`: the CJS global does not exist under Vite's native
      // ESM config loader, which is due to become the default. Same form as eslint.config.js.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
