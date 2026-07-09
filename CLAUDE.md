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
- **`src/components/`** — presentational only (no header/logo). `App.vue` composes `CategoryFilter` (emits `select` with a `CategoryId`) and `ExerciseFeed`. `ExerciseFeed` renders `ExerciseCard`s and takes a `category` prop that keys a `<Transition mode="out-in">` (clean crossfade on category switch) wrapping a `<TransitionGroup>` (per-item animation for paginated appends); it drives infinite scroll via an `IntersectionObserver` on a bottom sentinel, emitting `load-more`.
- **Path alias**: `@` → `./src` (declared in both `vite.config.ts` and `tsconfig.json` — keep them in sync).

The data file (`public/data/exercises.json`) is a **bare array**; each entry is `{ id, title, description, categoryId, tags, level, duration }` (`level` is `1 | 2 | 3`, `duration` in minutes). The `Exercise` interface (`src/domain/exercise.ts`) mirrors it exactly. Categories are lowercase ids (`physique`/`technique`/`mental`) that intentionally match the `--color-*` tokens; display labels come from the `CATEGORIES` array. Since the JSON is fetched (not imported), a schema drift won't be caught by `vue-tsc` — it fails at runtime, so keep the file aligned with the interface manually.

### Styling — Tailwind CSS v4

Uses the **v4** engine (`tailwindcss@next`), wired into Vite via the `@tailwindcss/postcss` plugin in `postcss.config.js`. There is no `tailwind.config.js`; config is CSS-first in `src/assets/main.css`:

- `@import "tailwindcss";` replaces the old `@tailwind` directives.
- The `@theme` block defines the tokens (category `--color-*`, neutrals, etc.), usable as utilities (`bg-physique`, `text-physique`, …).
- Reusable classes (e.g. `.card`) live in `@layer components` via `@apply`.
- **Token values, the category palette and the dark-mode policy live in `DESIGN.md`** (§2, §7) — not duplicated here.

**Critical Tailwind v4 gotcha** (also `DESIGN.md` §10): the JIT scanner only sees class names that appear as complete static strings in source. Never build class names by concatenation (`'bg-' + cat`) — they won't be generated. Map dynamic choices to full static strings (see the `iconTint` record in `CategoryFilter.vue` and `CATEGORY_TINT` in `ExerciseCard.vue`).

## Tasks

This is the **only** place tasks are tracked — `DESIGN.md` describes the design, never its to-do list.

### Taxonomy — done

- [x] Rename `Force` → `Physique` (token, `domain/exercise.ts`, labels).
- [x] Rename `Intensity` → `Level` (`Débutant`/`Intermédiaire`/`Avancé`).

### Design migration (`DESIGN.md` conformance) — done

- [x] **Neutral 3-segment level gauge** (§5.3) — `ExerciseCard.vue`: equal segments, filled = `slate-900 dark:slate-50`, empty = `slate-200 dark:slate-700`, always paired with the text label. Hue meter dropped.
- [x] **Removed `--color-level-*` tokens** (§2.3) — the level scale is count + label only.
- [x] **Neutral tags** (§5.4) — `bg-slate-100 … border` + `#` prefix; no category tint; capped at 2 per card.
- [x] **Category = icon + label** (§2.1) — new `CategoryIcon.vue` (dumbbell/target/spark, the icon map of §11); bare coloured dot removed. Colour is icon-only reinforcement; the label stays neutral (`text-*` category hues fail AA on light, §2.4).
- [x] **Darkened text tokens** (§2.2) — body ink `slate-900 dark:slate-50`; secondary `slate-600 dark:slate-300`.
- [x] **`CategoryFilter` active = solid ink fill** (§5.2, option A) — `bg-slate-900 text-white` (inverted in dark), AAA, meaning never carried by hue.
- [x] **Filter sheet** (§5.5) — `FilterSheet.vue` (bottom sheet: Durée / Niveau / Tags multi-select, in-sheet tag search when >10, `~52px` "Voir N exercices" CTA, `Réinitialiser`) + `FilterControls.vue` (Filtres button with active-count badge, removable applied-filter chips). Filter state lives in `useExercises` (`selectedBuckets`/`selectedLevels`/`selectedTags`, `availableTags`, `activeFilterCount`, toggles, `resetFilters`).
- [x] **Opaque sticky header** (§5.8) — dropped the translucent `/80` + `backdrop-blur` for `bg-slate-50 dark:bg-slate-900` + solid border, for sunlight contrast.
- [x] **Collapsible global search** (§5.9) — magnifier in `FilterControls.vue` expands into a field; `searchQuery`/`isSearching`/`clearSearch` in `useExercises`. When non-empty it overrides the category scope and matches title+description+tags (case/accent-insensitive via `fold()`); tags also stay tap-filterable. `resetAll()` clears filters + search.
- [x] **Category change snaps to top** — `App.vue` `onSelectCategory` calls `window.scrollTo({ top: 0, behavior: 'smooth' })` after `setCategory`.
- [x] **Flat card metadata** (§5.1/§5.4) — duration + tags flattened to icon+text / plain `#text` (no fill/border); description darkened `slate-700`. Elevated pills now signal _interactive_ only (§1.5).
- [x] **Self-host Inter** (§3) — `@fontsource-variable/inter/wght.css` imported in `main.ts`; `--font-sans` = `'Inter Variable'`; Google Fonts `<link>`/preconnects + the workbox Google-Fonts `runtimeCaching` removed. Only `latin`/`latin-ext` subsets are precached (globIgnores trims cyrillic/greek/vietnamese).
- [x] **Lighthouse a11y gate in CI** — `lighthouse` job in `ci-cd.yml` (`npx @lhci/cli autorun`, config in `lighthouserc.json`): builds, audits `dist/`, asserts `accessibility ≥ 0.9` (error) + `best-practices ≥ 0.9` (warn). Independent of release/deploy; no external upload. **Tighten the a11y floor toward 1.0 once the first run's baseline is known.**

### Pending / out of scope

- [ ] **Exercise detail page** (§5.6) — deferred: needs a **router** (vue-router not installed) **and new `Exercise` fields** (protocol/déroulé reps·sets·rest·hold, matériel, coach cues, sécurité) absent from the interface and `exercises.json`. Requires a data-model decision before build.
- [ ] **`Tous` scope option** — **deliberately not built** (product decision): the scope bar stays 3-way single-select, defaulting to `physique`. The cross-category / all-catalogue need is served instead by the global search (§5.9), which overrides the scope. `DESIGN.md` §5.2 was updated to match; revisit only if term-free full-catalogue browsing is needed.

### Known simplification

- The filter sheet applies filters **live** (no draft/commit state). "Voir N exercices" therefore shows the _current_ match count and just closes the sheet — acceptable for a read-only catalog; upgrade to a pending-selection model only if needed.
