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
- `npm run validate:data` — check `public/data/exercises.json` against the `Exercise` contract (add `--verbose` to list every editorial warning)
- `npm run lint` — ESLint with `--fix`; `npm run lint:ci` — ESLint without fixing (CI mode)
- `npm run format` — Prettier write across the repo
- `npm run build` — production build to `dist/` (**`vite build` only — does NOT type-check**)
- `npm run preview` — serve the production build locally

There is no test runner. Quality is enforced by **`vue-tsc`** (type safety; `tsconfig.json`, `strict: true`), **ESLint** (flat config in `eslint.config.js` — type-aware via `typescript-eslint`, plus `eslint-plugin-vue`, Prettier-reconciled) and **`validate:data`** (the data contract, below). None of them run during `dev` or `build`, so a green build is not type/lint/data-clean — run `type-check`, `lint:ci` and `validate:data` before pushing. All three are the CI quality gate.

**Browser check** (not in CI): the `visual-check` skill (`.claude/skills/visual-check/`) screenshots the app at fixed viewports and exits non-zero on horizontal overflow. The three gates above prove the app compiles; only this proves it _lays out_ — it exists because a metrics-only check once passed green while `Technique` rendered as `Techniq…`.

## Architecture

AscendBox is a mobile-first Vue 3 + Vite single-page app for climbing-club coaches to browse training exercises (content is in French). It follows a layered (Clean-Architecture-inspired) structure so the data source can be swapped without touching UI. Data flows one way: **domain → data → application → presentation**.

- **`src/domain/exercise.ts`** — pure entities/types, no framework or data deps. Defines the `Exercise` interface and the **single source of truth for categories**: `CATEGORIES` (`{ id, label }[]` as const, ids `physique`/`technique`/`mental`) with the derived `CategoryId` type, plus `Level` (`1 | 2 | 3`). Add new categories here only.
- **`src/data/exerciseRepository.ts`** — the ONLY module that knows the data source. It **`fetch`es `public/data/exercises.json` at runtime** (kept out of the JS bundle for TTI; preloaded via `<link rel="preload">` in `index.html`), `Object.freeze`s the result, and caches it (one request per app lifetime). `getAllExercises()` is `async`. Swap this file to move to an API; nothing upstream changes.
- **`src/application/useExercises.ts`** — the state composable. Its refs live at **module scope**, so it is a shared singleton: every component that calls `useExercises()` sees the same state. The dataset is held in a **`shallowRef`** (replaced wholesale, never deep-mutated — avoids proxying every exercise). Handles **pagination** (`PAGE_SIZE` slice via `visibleCount`, reset on category change) — exposes `exercises` (visible slice), `totalCount`, `hasMore`, `loadMore`, `setCategory`, `isLoading`/`error`. `load()` is idempotent and fires on first use. Put behavior here, not in components.
- **`src/router/index.ts`** — vue-router in **hash** history (`/#/exercice/12`). GitHub Pages is a static host with no rewrite rule, so `history` mode would 404 on a cold deep link until a `404.html` fallback is emitted; hash needs none. Routes: `/` → `HomeView`, `/exercice/:id` → `ExerciseView` (lazy — kept off the catalogue's critical path), plus a catch-all back to `/`. `scrollBehavior` returns `savedPosition`, so **Back restores the feed's scroll**.
- **`src/views/`** — one component per route. `HomeView` = the catalogue (owns the sticky bar; search/scope steer _that_ feed, so the detail route must not inherit them). `ExerciseView` = the detail page (§5.6), read-only; it carries its own back nav. `App.vue` is a **shell**: `<RouterView>` and nothing else.
- **`src/components/`** — presentational only. `HeaderToolbar` is the sticky bar (search + Filtres + applied-filter chips + the filter sheet) and slots `CategoryScope` (the scope buttons, emitting `select` with a `CategoryId`) as its centered scope. `ExerciseFeed` renders `ExerciseCard`s and takes a `category` prop that keys a `<Transition mode="out-in">` (crossfade on category switch) wrapping a `<TransitionGroup>` (per-item animation for paginated appends); it drives infinite scroll via an `IntersectionObserver` on a bottom sentinel, emitting `load-more`. `ExerciseCard`'s title is a **stretched link** (`after:absolute after:inset-0`) — the whole card is the hit area, but the link's accessible name stays the title. `LevelGauge` is shared by the card and the detail page.
- **Path alias**: `@` → `./src` (declared in both `vite.config.ts` and `tsconfig.json` — keep them in sync).

The data file (`public/data/exercises.json`) is a **bare array**; each entry is `{ id, title, teaser, categoryId, tags, level, duration }` (`level` is `1 | 2 | 3`, `duration` in minutes) plus the **optional** detail fields `{ objective?, equipment?, instructions?: string[], variants?: { harder?, easier? }, safety? }` (§5.6). **`teaser`, `objective` and `instructions` are three surfaces, not one field**: `teaser` is the card's hook (aim ≤ 70 chars, §5.1) and says _what you do_; `objective` is the detail's subtitle and says _what it buys you_; `instructions` is the step-by-step, **one bullet per step**. The detail never echoes the teaser. `teaser` was called `description` while it did every job and did none well. Optional is load-bearing: the catalogue is authored incrementally, so `ExerciseView` renders each section only when its data exists — a gap must stay a non-event. **There is no `protocol`** — the `reps`/`sets`/`restSec`/`holdSec` tiles were removed because a fixed vocabulary of four figures could not describe the catalogue (`restSec` meant both "between sets" and "between reps"; nothing could say "5 s **par bras**"). Figures now live in `instructions` prose, in the unit a coach says out loud ("3 min", never "180 s"). Do not reintroduce it: the exceptions are the rule here. The `Exercise` interface (`src/domain/exercise.ts`) mirrors it exactly. Categories are lowercase ids (`physique`/`technique`/`mental`) that intentionally match the `--color-*` tokens; display labels come from the `CATEGORIES` array. Since the JSON is fetched (not imported), `vue-tsc` cannot see it — schema drift would only fail at runtime, in the field. **`scripts/validate-data.ts` is the gate that closes this** (`npm run validate:data`, wired into the CI quality gate): it checks every entry against the contract and exits non-zero on a violation. Its `FIELDS` record is a mapped type over `keyof Required<Exercise>`, and each spec's `required` flag is derived from the interface's optionality, so **changing `Exercise` fails `type-check` until the validator is updated** — the check cannot fall behind what it checks. One exception, commented in the file: `Level` is a union of literals with no runtime form, so `LEVELS` restates `1 | 2 | 3` by hand. The teaser ceiling (100, DESIGN §5.1) is an error; the 70-char target is a warning only, as DESIGN §5.1 requires.

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

- [ ] **Upgrade to TypeScript 7** — held back: stable is 7.0.2 (the native compiler rewrite) but `typescript-eslint` still peers `typescript <6.1.0` (even canary), so TS 7 would break the type-aware linting. Currently pinned `^6.0.0`. Unblock when `typescript-eslint` ships TS 7 support; `vue-tsc` already allows `>=5.0.0`.
- [ ] **Split `tsconfig.json` when Vitest lands** — today a single hardened config is enough (one Node-side file, `vite.config.ts`). When Vitest arrives (a 2nd+ Node-side config/setup), split into the canonical `tsconfig.json` (references) + `tsconfig.app.json` (DOM, `vite/client`) + `tsconfig.node.json` (Node, `@types/node`), with a shared base for the strict flags and `vue-tsc -b` for `type-check`.
- [ ] **Fill in the detail data** — `objective` / `instructions` / `variants` / `equipment` / `safety` are only seeded on **ids 1–2** as samples; the other 98 detail pages show the identity block + spec block + tags and nothing else. Content authoring, not code — the model is settled (the two blockers that stalled this, `restSec`'s double meaning and "par bras", are gone with `protocol`). The `safety` text on id 1 is still a **placeholder to validate**, and no `safety` has been written since: that field is coaching advice, so it needs a human who coaches, not a bulk pass. Rewriting the teasers is the other half — most still recite a protocol nothing displays any more, and they should shrink toward the 70-char target as `instructions` takes over the how-to.
- [ ] **Drop the teaser ceiling to 90 (360px guarantee)** — the current ceiling of 100 is the _390px_ budget; at 360px (common Android) 5 teasers still reach a 4th line and get clamped (ids 52, 92, 95, 98, 100). A real 360 guarantee needs ~90, which 29 teasers exceed today. Deliberately deferred: the teaser/`instructions` split above rewrites those same strings toward the 70 target anyway, so editing them twice is waste. Do it **after** the split — re-measure at 360, then lower `TEASER_CEILING` and DESIGN §5.1 together.
- [ ] **`Tous` scope option** — **deliberately not built** (product decision): the scope bar stays 3-way single-select, defaulting to `physique`. The cross-category / all-catalogue need is served instead by the global search (§5.9), which overrides the scope. `DESIGN.md` §5.2 was updated to match; revisit only if term-free full-catalogue browsing is needed.

### Known simplification

- The filter sheet applies filters **live** (no draft/commit state). "Voir N exercices" therefore shows the _current_ match count and just closes the sheet — acceptable for a read-only catalog; upgrade to a pending-selection model only if needed.
