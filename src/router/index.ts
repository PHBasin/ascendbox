// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';

// Hash history (DESIGN §5.6): the app is deployed to GitHub Pages, a static host with no rewrite
// rule. Everything after `#` is never sent to the server, so `/#/exercice/12` always resolves to
// `index.html` — deep links, refreshes and cold hits work with zero build machinery. `history` mode
// would 404 on a first visit until a `404.html` fallback is emitted; not worth it today. Switching
// later is this one line plus that fallback.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    // `.vue` default import is `any` to ESLint (no Volar) — same false positive as main.ts.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/exercice/:id',
      name: 'exercise',
      // Lazy: the detail page is off the critical path, and TTI is a priority here (the catalogue
      // JSON is already kept out of the bundle for the same reason).
      component: () => import('@/views/ExerciseView.vue'),
      props: true, // `:id` arrives as a prop — the view never reaches into the route
    },
    // Unknown path → the catalogue, rather than a dead end.
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  // Back returns you where you were (the feed keeps its scroll); a forward navigation starts at the
  // top. `savedPosition` is only ever set on a popstate.
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 };
  },
});
