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
- `npm run type-check` — run `vue-tsc --noEmit` (type-checking is NOT part of `dev` **or** `build`)
- `npm run lint` — ESLint with `--fix`; `npm run lint:ci` — ESLint without fixing (CI mode)
- `npm run format` — Prettier write across the repo
- `npm run build` — production build to `dist/` (**`vite build` only — does NOT type-check**)
- `npm run preview` — serve the production build locally

There is no test runner. Quality is enforced by **`vue-tsc`** (type safety; `tsconfig.json`, `strict: true`) and **ESLint** (flat config in `eslint.config.js` — type-aware via `typescript-eslint`, plus `eslint-plugin-vue`, Prettier-reconciled). Neither runs during `dev` or `build`, so a green build is not type/lint-clean — run `type-check` and `lint:ci` before pushing.

## Architecture

AscendBox is a mobile-first Vue 3 + Vite single-page app for climbing-club coaches to browse training exercises (content is in French). It follows a layered (Clean-Architecture-inspired) structure so the data source can be swapped without touching UI. Data flows one way: **domain → data → application → presentation**.

- **`src/domain/exercise.ts`** — pure entities/types, no framework or data deps. Defines the `Exercise` interface and the **single source of truth for categories**: `CATEGORIES` (`{ id, label }[]` as const, ids `physique`/`technique`/`mental`) with the derived `CategoryId` type, plus `Level` (`1 | 2 | 3`). Add new categories here only.
- **`src/data/exerciseRepository.ts`** — the ONLY module that knows the data source. It **`fetch`es `public/data/exercises.json` at runtime** (kept out of the JS bundle for TTI; preloaded via `<link rel="preload">` in `index.html`), `Object.freeze`s the result, and caches it (one request per app lifetime). `getAllExercises()` is `async`. Swap this file to move to an API; nothing upstream changes.
- **`src/application/useExercises.ts`** — the state composable. Its refs live at **module scope**, so it is a shared singleton: every component that calls `useExercises()` sees the same state. The dataset is held in a **`shallowRef`** (replaced wholesale, never deep-mutated — avoids proxying every exercise). Handles **pagination** (`PAGE_SIZE` slice via `visibleCount`, reset on category change) — exposes `exercises` (visible slice), `totalCount`, `hasMore`, `loadMore`, `setCategory`, `isLoading`/`error`. `load()` is idempotent and fires on first use. Put behavior here, not in components.
- **`src/router/index.ts`** — vue-router in **hash** history (`/#/exercice/12`). GitHub Pages is a static host with no rewrite rule, so `history` mode would 404 on a cold deep link until a `404.html` fallback is emitted; hash needs none. Routes: `/` → `HomeView`, `/exercice/:id` → `ExerciseView` (lazy — kept off the catalogue's critical path), plus a catch-all back to `/`. `scrollBehavior` returns `savedPosition`, so **Back restores the feed's scroll**.
- **`src/views/`** — one component per route. `HomeView` = the catalogue (owns the sticky bar; search/scope steer *that* feed, so the detail route must not inherit them). `ExerciseView` = the detail page (§5.6), read-only; it carries its own back nav. `App.vue` is a **shell**: `<RouterView>` and nothing else.
- **`src/components/`** — presentational only. `HeaderToolbar` is the sticky bar (search + Filtres + applied-filter chips + the filter sheet) and slots `CategoryScope` (the scope buttons, emitting `select` with a `CategoryId`) as its centered scope. `ExerciseFeed` renders `ExerciseCard`s and takes a `category` prop that keys a `<Transition mode="out-in">` (crossfade on category switch) wrapping a `<TransitionGroup>` (per-item animation for paginated appends); it drives infinite scroll via an `IntersectionObserver` on a bottom sentinel, emitting `load-more`. `ExerciseCard`'s title is a **stretched link** (`after:absolute after:inset-0`) — the whole card is the hit area, but the link's accessible name stays the title. `LevelGauge` is shared by the card and the detail page.
- **Path alias**: `@` → `./src` (declared in both `vite.config.ts` and `tsconfig.json` — keep them in sync).

The data file (`public/data/exercises.json`) is a **bare array**; each entry is `{ id, title, teaser, categoryId, tags, level, duration }` (`level` is `1 | 2 | 3`, `duration` in minutes) plus the **optional** detail fields `{ protocol?: { reps?, sets?, restSec?, holdSec? }, equipment?, instructions?, safety? }` (§5.6). **`teaser` and `instructions` are two surfaces, not one field**: `teaser` is the card's hook (aim ≤ 71 chars, §5.1), `instructions` is the detail's how-to — the detail never echoes the teaser. `teaser` was called `description` while it did both jobs and did neither well. Optional is load-bearing: the catalogue is authored incrementally, so `ExerciseView` renders each section only when its data exists — a gap must stay a non-event. Units live in the field *names* (`restSec`/`holdSec`) because `duration` is already minutes and the JSON is hand-authored. The `Exercise` interface (`src/domain/exercise.ts`) mirrors it exactly. Categories are lowercase ids (`physique`/`technique`/`mental`) that intentionally match the `--color-*` tokens; display labels come from the `CATEGORIES` array. Since the JSON is fetched (not imported), a schema drift won't be caught by `vue-tsc` — it fails at runtime, so keep the file aligned with the interface manually.

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
- [ ] **Fill in the detail data** — `protocol` / `equipment` / `safety` are only seeded on ids 1–2 as samples, and **`instructions` is empty everywhere**, so every detail page currently shows no prose. Content authoring, not code. The `safety` text on id 1 is a **placeholder to validate**. Two things to settle **before** doing all ~100, because 4 exercises already broke the model twice:
  - **`restSec` is ambiguous** — documented as "rest between sets", but #8 *Suspensions Intermittentes (7/3)* means rest **between reps**. One field, two meanings.
  - **No field carries "par bras"** — #2 *Tracter et Bloquer* is `5s par bras`; `holdSec: 5` renders "5 s TENUE", which is wrong by half.
  Do a dry run on 10–15 representative exercises, fix `Protocol` from what it reveals, *then* bulk-fill. Splitting `teaser` (≤ 71 chars) from `instructions` is the other half of this: most current teasers still recite the protocol they now duplicate.
- [ ] **`Tous` scope option** — **deliberately not built** (product decision): the scope bar stays 3-way single-select, defaulting to `physique`. The cross-category / all-catalogue need is served instead by the global search (§5.9), which overrides the scope. `DESIGN.md` §5.2 was updated to match; revisit only if term-free full-catalogue browsing is needed.

### Known simplification

- The filter sheet applies filters **live** (no draft/commit state). "Voir N exercices" therefore shows the _current_ match count and just closes the sheet — acceptable for a read-only catalog; upgrade to a pending-selection model only if needed.

