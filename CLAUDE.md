# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product context

AscendBox is a mobile-first PWA for climbing-club coaches to browse ~100 training exercises (content
is in French). It is used **outdoors, often in a hurry**. The
non-negotiables that follow: high contrast (aim AAA), large touch targets, **no meaning carried by
colour alone** (colour-vision safety), state always visible.

## Design source of truth

**Read `DESIGN.md` before any UI work** — colours, type, spacing, components, motion, accessibility.
UI must conform to it; do not restate its spec here. On any design change, update `DESIGN.md` in the
same move.

## Commands

- `npm run dev` — start Vite dev server on **port 3000** (configured in `vite.config.ts`)
- `npm run type-check` — run `vue-tsc --noEmit` (type-checking is NOT part of `dev`)
- `npm run build` — type-check then production build to `dist/`
- `npm run preview` — serve the production build locally

There is no test runner or linter. Type safety is enforced via `vue-tsc` (see `tsconfig.json`, `strict: true`), which `build` runs before `vite build` — so type errors fail the build but not the dev server.

## Architecture

AscendBox is a mobile-first Vue 3 + Vite single-page app for climbing-club coaches to browse training exercises (content is in French). It follows a layered (Clean-Architecture-inspired) structure so the data source can be swapped without touching UI. Data flows one way: **domain → data → application → presentation**.

- **`src/domain/exercise.ts`** — pure entities/types, no framework or data deps. Defines the `Exercise` interface and the **single source of truth for categories**: `CATEGORIES` (`{ id, label }[]` as const, ids `physique`/`technique`/`mental`) with the derived `CategoryId` type, plus `Level` (`1 | 2 | 3`). Add new categories here only.
- **`src/data/exerciseRepository.ts`** — the ONLY module that knows the data source. It **`fetch`es `public/data/exercises.json` at runtime** (kept out of the JS bundle for TTI; preloaded via `<link rel="preload">` in `index.html`), `Object.freeze`s the result, and caches it (one request per app lifetime). `getAllExercises()` is `async`. Swap this file to move to an API; nothing upstream changes.
- **`src/application/useExercises.ts`** — the state composable. Its refs live at **module scope**, so it is a shared singleton: every component that calls `useExercises()` sees the same state. The dataset is held in a **`shallowRef`** (replaced wholesale, never deep-mutated — avoids proxying every exercise). Handles **pagination** (`PAGE_SIZE` slice via `visibleCount`, reset on category change) — exposes `exercises` (visible slice), `totalCount`, `hasMore`, `loadMore`, `setCategory`, `isLoading`/`error`. `load()` is idempotent and fires on first use. Put behavior here, not in components.
- **`src/components/`** — presentational only (no header/logo). `App.vue` composes `HeaderToolbar` (the sticky bar: search + Filtres + applied-filter chips + the filter sheet) — which slots `CategoryScope` (the category scope buttons, emitting `select` with a `CategoryId`) as its centered scope — and `ExerciseFeed`. `ExerciseFeed` renders `ExerciseCard`s and takes a `category` prop that keys a `<Transition mode="out-in">` (clean crossfade on category switch) wrapping a `<TransitionGroup>` (per-item animation for paginated appends); it drives infinite scroll via an `IntersectionObserver` on a bottom sentinel, emitting `load-more`.
- **Path alias**: `@` → `./src` (declared in both `vite.config.ts` and `tsconfig.json` — keep them in sync).

The data file (`public/data/exercises.json`) is a **bare array**; each entry is `{ id, title, description, categoryId, tags, level, duration }` (`level` is `1 | 2 | 3`, `duration` in minutes). The `Exercise` interface (`src/domain/exercise.ts`) mirrors it exactly. Categories are lowercase ids (`physique`/`technique`/`mental`) that intentionally match the `--color-*` tokens; display labels come from the `CATEGORIES` array. Since the JSON is fetched (not imported), a schema drift won't be caught by `vue-tsc` — it fails at runtime, so keep the file aligned with the interface manually.

### Styling — Tailwind CSS v4

Uses the **v4** engine (`tailwindcss@next`), wired into Vite via the `@tailwindcss/postcss` plugin in `postcss.config.js`. There is no `tailwind.config.js`; config is CSS-first in `src/assets/main.css`:

- `@import "tailwindcss";` replaces the old `@tailwind` directives.
- The `@theme` block defines the tokens (category `--color-*`, neutrals, etc.), usable as utilities (`bg-physique`, `text-physique`, …).
- Reusable classes (e.g. `.card`) live in `@layer components` via `@apply`.
- **Token values, the category palette and the dark-mode policy live in `DESIGN.md`** (§2, §7) — not duplicated here.

**Critical Tailwind v4 gotcha** (also `DESIGN.md` §10): the JIT scanner only sees class names that appear as complete static strings in source. Never build class names by concatenation (`'bg-' + cat`) — they won't be generated. Map dynamic choices to full static strings (see the `iconTint` record in `CategoryScope.vue` and `CATEGORY_TINT` in `ExerciseCard.vue`).

## Tasks

This is the **only** place tasks are tracked — `DESIGN.md` describes the design, never its to-do list.

### Pending / out of scope

- [ ] **Tighten the Lighthouse a11y floor** — `lighthouserc.json` asserts `accessibility ≥ 0.9` as a conservative floor; raise toward 0.95–1.0 once the first CI run's baseline is known.
- [ ] **Upgrade to TypeScript 7** — held back: stable is 7.0.2 (the native compiler rewrite) but `typescript-eslint` still peers `typescript <6.1.0` (even canary), so TS 7 would break the type-aware linting. Currently pinned `^6.0.0`. Unblock when `typescript-eslint` ships TS 7 support; `vue-tsc` already allows `>=5.0.0`.
- [ ] **Split `tsconfig.json` when Vitest lands** — today a single hardened config is enough (one Node-side file, `vite.config.ts`). When Vitest arrives (a 2nd+ Node-side config/setup), split into the canonical `tsconfig.json` (references) + `tsconfig.app.json` (DOM, `vite/client`) + `tsconfig.node.json` (Node, `@types/node`), with a shared base for the strict flags and `vue-tsc -b` for `type-check`.
- [ ] **Exercise detail page** (§5.6) — deferred: needs a **router** (vue-router not installed) **and new `Exercise` fields** (protocol/déroulé reps·sets·rest·hold, matériel, coach cues, sécurité) absent from the interface and `exercises.json`. Requires a data-model decision before build.
- [ ] **`Tous` scope option** — **deliberately not built** (product decision): the scope bar stays 3-way single-select, defaulting to `physique`. The cross-category / all-catalogue need is served instead by the global search (§5.9), which overrides the scope. `DESIGN.md` §5.2 was updated to match; revisit only if term-free full-catalogue browsing is needed.

### Known simplification

- The filter sheet applies filters **live** (no draft/commit state). "Voir N exercices" therefore shows the _current_ match count and just closes the sheet — acceptable for a read-only catalog; upgrade to a pending-selection model only if needed.
