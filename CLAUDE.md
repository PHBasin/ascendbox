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

- **`src/domain/exercise.ts`** — pure entities/types, no framework or data deps. Defines the `Exercise` interface and the **single source of truth for categories**: `CATEGORIES` (`{ id, label }[]` as const, ids `force`/`technique`/`mental`) with the derived `CategoryId` type, plus `Intensity` (`1 | 2 | 3`). Add new categories here only.
- **`src/data/exerciseRepository.ts`** — the ONLY module that knows the data source. It **`fetch`es `public/data/exercises.json` at runtime** (kept out of the JS bundle for TTI; preloaded via `<link rel="preload">` in `index.html`), `Object.freeze`s the result, and caches it (one request per app lifetime). `getAllExercises()` is `async`. Swap this file to move to an API; nothing upstream changes.
- **`src/application/useExercises.ts`** — the state composable. Its refs live at **module scope**, so it is a shared singleton: every component that calls `useExercises()` sees the same state. The dataset is held in a **`shallowRef`** (replaced wholesale, never deep-mutated — avoids proxying every exercise). Handles **pagination** (`PAGE_SIZE` slice via `visibleCount`, reset on category change) — exposes `exercises` (visible slice), `totalCount`, `hasMore`, `loadMore`, `setCategory`, `isLoading`/`error`. `load()` is idempotent and fires on first use. Put behavior here, not in components.
- **`src/components/`** — presentational only (no header/logo). `App.vue` composes `CategoryFilter` (emits `select` with a `CategoryId`) and `ExerciseFeed`. `ExerciseFeed` renders `ExerciseCard`s and takes a `category` prop that keys a `<Transition mode="out-in">` (clean crossfade on category switch) wrapping a `<TransitionGroup>` (per-item animation for paginated appends); it drives infinite scroll via an `IntersectionObserver` on a bottom sentinel, emitting `load-more`.
- **Path alias**: `@` → `./src` (declared in both `vite.config.ts` and `tsconfig.json` — keep them in sync).

The data file (`public/data/exercises.json`) is a **bare array**; each entry is `{ id, title, description, categoryId, tags, intensity, duration }` (`intensity` is `1 | 2 | 3`, `duration` in minutes). The `Exercise` interface (`src/domain/exercise.ts`) mirrors it exactly. Categories are lowercase ids (`force`/`technique`/`mental`) that intentionally match the `--color-*` tokens; display labels come from the `CATEGORIES` array. Since the JSON is fetched (not imported), a schema drift won't be caught by `vue-tsc` — it fails at runtime, so keep the file aligned with the interface manually.

> ⚠ **Taxonomy migration in progress (see Tasks).** The description above reflects the **current**
> code. Pending: `Force → Physique`, add a 4th category `Sécurité`, and `Intensity → Niveau`
> (`Débutant | Intermédiaire | Avancé`). Update this section as the code changes.

### Styling — Tailwind CSS v4

Uses the **v4** engine (`tailwindcss@next`), wired into Vite via the `@tailwindcss/postcss` plugin in `postcss.config.js`. There is no `tailwind.config.js`; config is CSS-first in `src/assets/main.css`:

- `@import "tailwindcss";` replaces the old `@tailwind` directives.
- The `@theme` block defines the tokens (category `--color-*`, neutrals, etc.), usable as utilities (`bg-force`, `text-force`, …).
- Reusable classes (e.g. `.card`) live in `@layer components` via `@apply`.
- **Token values, the category palette and the dark-mode policy live in `DESIGN.md`** (§2, §7) — not duplicated here.

**Critical Tailwind v4 gotcha** (also `DESIGN.md` §10): the JIT scanner only sees class names that appear as complete static strings in source. Never build class names by concatenation (`'bg-' + cat`) — they won't be generated. Map dynamic choices to full static strings (see the `activeClasses` record in `CategoryFilter.vue`).

## Taxonomy — 4 categories
Primary scope, mutually exclusive: **Physique · Technique · Mental · Sécurité**.
- `Sécurité` is the home for rope-work (belaying, knots, fall management, hauling…).
- Cross-cutting themes (e.g. fall management = Mental + Sécurité) → **tags**, never a duplicate category.
- Volume rule: a category with < ~5 exercises reverts to a tag.
- `CATEGORIES` in `src/domain/exercise.ts` remains the single source of truth for ids/labels.

## Tasks

### Taxonomy — decided here, reflect in `DESIGN.md` §2.1
- [ ] Rename `Force` → `Physique` (token, `domain/exercise.ts`, labels).
- [ ] Add the 4th category `Sécurité`: token `--color-securite` (green/amber is free — the level
      gauge is neutral) + icon + `CATEGORIES` entry + static string in `activeClasses` /
      `CATEGORY_STYLE` (JIT constraint above).
- [ ] File rope-work exercises there; tag `#corde` / `#chute` the cross-cutting ones.
- [ ] Update `DESIGN.md` §2.1 (3 → 4 categories).

### Design migration
→ Follow the checklist in **`DESIGN.md` §12** (Niveau, neutral gauge, neutral tags, category
icon+label, ~52px CTA, filter sheet, detail page, self-host Inter).
