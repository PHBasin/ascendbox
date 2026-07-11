// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';

// Self-hosted Inter (variable, weight axis only)
import '@fontsource-variable/inter/wght.css';

// Tailwind v4 style entry
import './assets/main.css';

// .vue default import is `any` to ESLint (no Volar) — false positive.
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
createApp(App).mount('#app');
