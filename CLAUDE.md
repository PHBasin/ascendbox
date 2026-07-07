# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server on **port 3000** (configured in `vite.config.ts`)
- `npm run type-check` — run `vue-tsc --noEmit` (type-checking is NOT part of `dev`)
- `npm run build` — type-check then production build to `dist/`
- `npm run preview` — serve the production build locally

There is no test runner or linter. Type safety is enforced via `vue-tsc` (see `tsconfig.json`, `strict: true`), which `build` runs before `vite build` — so type errors fail the build but not the dev server.

## Architecture

AscendBox is a mobile-first Vue 3 + Vite single-page app for climbing-club coaches to browse training exercises (content is in French). It follows a layered (Clean-Architecture-inspired) structure so the data source can be swapped without touching UI. Data flows one way: **domain → data → application → presentation**.

- **`src/domain/exercise.ts`** — pure entities/types, no framework or data deps. Defines the `Exercise` interface and the **single source of truth for categories**: `CATEGORIES` (`{ id, label }[]` as const, ids `force`/`technique`/`mental`) with the derived `CategoryId` type, plus `Intensity` (`1 | 2 | 3`). Add new categories here only.
- **`src/data/exerciseRepository.ts`** — the ONLY module that knows the data source. It **`fetch`es `public/data/exercises.json` at runtime** (kept out of the JS bundle for TTI; preloaded via `<link rel="preload">` in `index.html`), `Object.freeze`s the result, and caches it (one request per app lifetime). `getAllExercises()` is `async`. Swap this file to move to an API; nothing upstream changes.
- **`src/application/useExercises.ts`** — the state composable. Its refs live at **module scope**, so it is a shared singleton: every component that calls `useExercises()` sees the same state. The dataset is held in a **`shallowRef`** (replaced wholesale, never deep-mutated — avoids proxying every exercise). Handles **pagination** (`PAGE_SIZE` slice via `visibleCount`, reset on category change) — exposes `exercises` (visible slice), `totalCount`, `hasMore`, `loadMore`, `setCategory`, `isLoading`/`error`. `load()` is idempotent and fires on first use. Put behavior here, not in components.
- **`src/components/`** — presentational only (no header/logo). `App.vue` composes `CategoryFilter` (emits `select` with a `CategoryId`) and `ExerciseFeed`. `ExerciseFeed` renders `ExerciseCard`s and takes a `category` prop that keys a `<Transition mode="out-in">` (clean crossfade on category switch) wrapping a `<TransitionGroup>` (per-item animation for paginated appends); it drives infinite scroll via an `IntersectionObserver` on a bottom sentinel, emitting `load-more`.
- **Path alias**: `@` → `./src` (declared in both `vite.config.ts` and `tsconfig.json` — keep them in sync).

The data file (`public/data/exercises.json`) is a **bare array**; each entry is `{ id, title, description, categoryId, tags, intensity, duration }` (`intensity` is `1 | 2 | 3`, `duration` in minutes). The `Exercise` interface (`src/domain/exercise.ts`) mirrors it exactly. Categories are lowercase ids (`force`/`technique`/`mental`) that intentionally match the `--color-*` tokens; display labels come from the `CATEGORIES` array. Since the JSON is fetched (not imported), a schema drift won't be caught by `vue-tsc` — it fails at runtime, so keep the file aligned with the interface manually.

### Styling — Tailwind CSS v4

Uses the **v4** engine (`tailwindcss@next`), wired into Vite via the `@tailwindcss/postcss` plugin in `postcss.config.js`. There is no `tailwind.config.js`; config is CSS-first in `src/assets/main.css`:

- `@import "tailwindcss";` replaces the old `@tailwind` directives.
- The `@theme` block defines tokens including category colors `--color-force` (rose), `--color-technique` (cyan), `--color-mental` (purple), usable as utilities `bg-force`, `text-force`, `shadow-force`, etc.
- Dark mode is driven by `@media (prefers-color-scheme: dark)` (OS setting), NOT a `dark` class toggle.
- Reusable classes (e.g. `.card`) live in `@layer components` via `@apply`.

**Critical Tailwind v4 gotcha**: the JIT scanner only sees class names that appear as complete static strings in source. Never build class names by concatenation (`'bg-' + cat`) — they won't be generated. Map dynamic choices to full static strings (see the `activeClasses` record in `CategoryFilter.vue`).
