// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';

// Self-hosted Inter (variable, weight axis only). Bundled by Vite → fingerprinted
// .woff2 served from our origin and precached by Workbox (true offline, no Google
// Fonts third-party request). Import before main.css so the @font-face is defined
// before --font-sans references it.
import '@fontsource-variable/inter/wght.css';

// Tailwind v4 style entry
import './assets/main.css';

createApp(App).mount('#app');
