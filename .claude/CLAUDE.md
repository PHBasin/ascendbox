# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product context

AscendBox is a mobile-first PWA for climbing-club coaches to browse ~150 training exercises (content
is in French). It is used **outdoors, often in a hurry**. The
non-negotiables that follow: high contrast (aim AAA), large touch targets, **no meaning carried by
colour alone** (colour-vision safety), state always visible.

## Design source of truth

**Read `DESIGN.md` before any UI work** - colours, type, spacing, components, motion, accessibility.
UI must conform to it; do not restate its spec here. On any design change, update `DESIGN.md` in the
same move.

## Commands

- `npm run dev` - start Vite dev server on **port 3000** (configured in `vite.config.ts`)
- `npm run type-check` - run `vue-tsc --noEmit` (type-checking is NOT part of `dev` **or** `build`)
- `npm run validate:data` - check `public/data/exercises.json` against the `Exercise` contract (add `--verbose` to list every editorial warning)
- `npm run data:export` - JSON → CSV for spreadsheet editing (`-- --out fichier.csv`; default `exercises.csv`, gitignored)
- `npm run data:import` - CSV → JSON (`-- --in fichier.csv`). Converts only - **run `validate:data` afterwards** to check the content
- `npm run lint` - ESLint with `--fix`; `npm run lint:ci` - ESLint without fixing (CI mode)
- `npm run format` - Prettier write across the repo (it owns Markdown too - run it after editing this file or `DESIGN.md`)
- `npm run build` - production build to `dist/` (**`vite build` only - does NOT type-check**)
- `npm run preview` - serve the production build locally

Everything in `scripts/` runs on **Node's own TypeScript stripping** (`node scripts/validate-data.ts`) - there is no ts-node, no tsx, no build step for the tooling. Two consequences: Node is pinned to **24.18.0** in `.nvmrc` (CI installs from it), and an import between script files must spell out the **`.ts` extension** - Node resolves ESM specifiers literally. `tsconfig.json` sets `allowImportingTsExtensions` for exactly this, and states `noEmit` in the config rather than only on the `vue-tsc` CLI so that ESLint's project service agrees with `type-check`.

### The gates

There is no test runner. Quality is enforced by **`vue-tsc`** (type safety; `tsconfig.json`, `strict: true` plus `noUncheckedIndexedAccess`, `noImplicitReturns`, `verbatimModuleSyntax`, …), **ESLint** (flat config in `eslint.config.js` - type-aware via `typescript-eslint`, plus `eslint-plugin-vue`, Prettier-reconciled) and **`validate:data`** (the data contract, below). None of them run during `dev` or `build`, so a green build is not type/lint/data-clean - run `type-check`, `lint:ci` and `validate:data` before pushing.

Those three are what you can run locally. **A fourth gate exists only in CI**: Lighthouse CI (`lighthouserc.json`) asserts **accessibility ≥ 0.95 as an _error_** (best-practices ≥ 0.9 as a warning) against the built `dist/`. An a11y regression therefore fails the pipeline without any local command having said a word - see "CI/CD and releases" below.

**Browser check** (in neither): the `visual-check` skill (`.claude/skills/visual-check/`) screenshots the app at fixed viewports and exits non-zero on horizontal overflow. The gates above prove the app compiles; only this proves it _lays out_ - it exists because a metrics-only check once passed green while `Technique` rendered as `Techniq…`.

## Architecture

AscendBox is a mobile-first Vue 3 + Vite single-page app for climbing-club coaches to browse training exercises (content is in French). It follows a layered (Clean-Architecture-inspired) structure so the data source can be swapped without touching UI. Data flows one way: **domain → data → application → presentation**.

- **`src/domain/exercise.ts`** - pure entities/types, no framework or data deps. Defines the `Exercise` interface and the **single source of truth for the two closed vocabularies**: `CATEGORIES` (`{ id, label }[]` as const, ids `physique`/`technique`/`mental`) with the derived `CategoryId` type, and `LEVELS` (ordered, because the filter sheet renders it as a scale) with `Level` (`1 | 2 | 3`). `CATEGORY_LABELS` / `LEVEL_LABELS` are **derived** from those lists, and the **runtime guards `isCategoryId` / `isLevel`** are derived from them too - they are what lets the data layer check a fetched payload instead of casting past it. Add new categories or levels here only.
- **`src/data/exerciseRepository.ts`** - the ONLY module that knows the data source. It **`fetch`es `public/data/exercises.json` at runtime** (kept out of the JS bundle for TTI) from `import.meta.env.BASE_URL`, not a leading slash, so the fetch survives a move to project-pages. The file is preloaded via `<link rel="preload">` in `index.html`, whose **`crossorigin` attribute is load-bearing**: it is what makes the preload match the bare `fetch()`, and removing it measurably turns one request into two. The full derivation is in the comment on that tag - read it before touching it. The repository memoises the **in-flight promise** as well as the result (two overlapping callers used to fire two requests, because the cache was only written after the `await`), aborts after a 10 s timeout - a hung request otherwise leaves the skeleton on screen forever instead of reaching the branch that offers a way out - and never memoises a rejection, which is what makes a retry a real retry. It also **checks the payload** instead of casting past it: not a second `validate:data`, but the failures a _deploy_ produces - a truncated body, or the SPA fallback handing back `index.html` where JSON was expected. Bad shape → reject; individual malformed entries → dropped with a warning; an empty result → rejected, since an empty catalogue reaches the feed as an ordinary empty _category_. Failures are raised as a `CatalogueError` carrying a `kind` (`network` / `timeout` / `http` / `malformed`) - **a value, never a sentence**: infrastructure knows what broke, not what a French coach should read. `getAllExercises()` is `async`. Swap this file to move to an API; nothing upstream changes.
- **`src/application/`** - the state, split by what owns it. Every module keeps its refs at **module scope**, so the layer is a shared singleton: every component sees the same state.
  - **`useCatalogue.ts`** - the dataset (in a **`shallowRef`**: replaced wholesale, never deep-mutated, so Vue never proxies the ~150 objects), a `byId` **Map** for O(1) detail lookup, `isLoading` / `error`, and the two entry points `loadCatalogue()` (idempotent, fires on first use, guarded so a failed load does not turn every remount into another request) and **`retryCatalogue()`**. It is also the one place that maps a `CatalogueError` `kind` to French copy - the layer that knows the app speaks French.
  - **`useSearch.ts`** - `searchOpen` / `searchQuery` / `isSearching`, and `fold()` (case- and accent-insensitive).
  - **`useFilters.ts`** - `DURATION_BUCKETS` and the three selections, exposed as **two compiled predicates** (`matchesDurationAndLevel`, `matchesTags`) built once per selection change rather than re-read per exercise. They come in two pieces because the tag facet must be applied last: see `availableTags` below.
  - **`usePagination.ts`** - `PAGE_SIZE` and a generic `createPagination(source)`. It knows a length and a slice, nothing about exercises.
  - **`useExercises.ts`** - the **façade**: it owns `activeCategory` and the composition. It builds the **search index** (each exercise folded **once per load**, not once per keystroke per exercise), runs the pipeline in four stages - scope → text → duration/level → tags - so a change re-runs only what it invalidates, and derives `availableTags` from everything _except_ the tag facet (so the sheet can never offer an option that returns zero, and a selected tag never loses its toggle). Its public API is `useExercises()` / `useExercise(id)`, unchanged by the split. **One watcher** on the whole refinement surface holds the invariant "any change of scope, search or filter restarts pagination at the top" - it used to be six remembered call sites. `setCategory` still calls `resetPage()` explicitly, and that is load-bearing: re-tapping the _already active_ pill does not write the ref, so the watcher would not fire, and that gesture has to send the feed home. Put behavior here, not in components.
  - **`plural.ts`** - `plural(n)` and `countOf(n, noun)`. Not a composable, but it belongs in this layer for the same reason `useCatalogue`'s error copy does: this is the layer that knows the app speaks French. **French agrees from 2, not from 1** - `0 exercice` and `1 exercice` are both singular, so the rule is `count > 1`, never `count !== 1`. It exists because the rule had been written out three times and one of the three shipped `filtre(s) actif(s)` into an `aria-label`.
- **`src/router/index.ts`** - vue-router in **hash** history (`/#/exercice/12`). GitHub Pages is a static host with no rewrite rule, so `history` mode would 404 on a cold deep link until a `404.html` fallback is emitted; hash needs none. Routes: `/` → `HomeView`, `/exercice/:id` → `ExerciseView` (lazy - kept off the catalogue's critical path), plus a catch-all back to `/`. `scrollBehavior` returns `savedPosition`, so **Back restores the feed's scroll**.
- **`src/views/`** - one component per route. `HomeView` = the catalogue (owns the sticky bar; search/scope steer _that_ feed, so the detail route must not inherit them). `ExerciseView` = the detail page (§5.6), read-only; it carries its own back nav. `App.vue` is a **shell**: `<RouterView>` and nothing else.
- **`src/components/`** - presentational only. `HeaderToolbar` is the sticky bar (search + Filtres + the filter sheet; **no applied-filter chips** - see DESIGN §5.5 for why the row was removed) and slots `CategoryScope` (the scope buttons, emitting `select` with a `CategoryId`) as its centered scope. `FilterSheet` is the bottom sheet (§5.5) and the app's only modal surface: it is also the largest component here, so read it before changing the refinement flow. `ExerciseFeed` renders `ExerciseCard`s and takes a `category` prop that keys a `<Transition mode="out-in">` (crossfade on category switch) wrapping a `<TransitionGroup>` (per-item animation for paginated appends); it drives infinite scroll via an `IntersectionObserver` on a bottom sentinel, emitting `load-more`. `ExerciseCard`'s title is a **stretched link** (`after:absolute after:inset-0`) - the whole card is the hit area, but the link's accessible name stays the title. `LevelGauge` is shared by the card and the detail page; `CategoryBadge`, `CategoryIcon` and `ToggleChip` are the smaller shared pieces.
  - **`useFocusTrap.ts`** - keyboard containment for a modal surface (DESIGN §8), used by `FilterSheet`. `role="dialog" aria-modal="true"` is a promise that nothing behind the scrim is reachable; this is what makes it a behaviour rather than a label. Any new modal uses this, not its own handler.
- **`src/appRoot.ts`** - `APP_ROOT_ID`, the id Vue mounts onto, named once. It is spent by `main.ts`'s `mount()` **and** by `FilterSheet`, which takes `inert` off that element while open. It exists because those two used to agree only by coincidence: a literal `'app'` in the sheet, a literal `'#app'` in `main.ts`, and a rename would have left the feed reachable behind an open modal with every gate still green.
- **Path alias**: `@` → `./src` (declared in both `vite.config.ts` and `tsconfig.json` - keep them in sync).

### The catalogue and its contract

The data file (`public/data/exercises.json`) is a **bare array**; each entry is `{ id, title, teaser, categoryId, tags, level, duration }` (`level` is `1 | 2 | 3`, `duration` in minutes) plus the **optional** detail fields `{ objective?, equipment?, instructions?: string[], variants?: { harder?, easier? }, safety? }` (§5.6). Measured **2026-08-22**: **149 exercises** (technique 90, physique 29, mental 30) over a vocabulary of **16 tags**. That is the one place the size is written down - elsewhere say "the catalogue", so the figure has one home to go stale in.

**`teaser`, `objective` and `instructions` are three surfaces, not one field**: `teaser` is the card's hook (aim ≤ 70 chars, §5.1) and says _what you do_; `objective` is the detail's subtitle and says _what it buys you_; `instructions` is the step-by-step, **one bullet per step**. The detail never echoes the teaser. The full rationale, including the two character budgets and why they differ, is in the `Exercise` JSDoc. Optional is load-bearing: the catalogue is authored incrementally, so `ExerciseView` renders each section only when its data exists - a gap must stay a non-event. **There is no `protocol`**: figures live in `instructions` prose, in the unit a coach says out loud ("3 min", never "180 s"), because a fixed vocabulary of `reps`/`sets`/`restSec` tiles could not describe a hand-authored catalogue. Do not reintroduce it.

Categories are lowercase ids that intentionally match the `--color-*` tokens; labels come from `CATEGORIES` / `LEVELS` (above), so a label is written once and read everywhere. Since the JSON is fetched (not imported), `vue-tsc` cannot see it - schema drift would only fail at runtime, in the field. **`scripts/validate-data.ts` is the gate that closes this** (`npm run validate:data`, wired into the CI quality gate): it checks every entry against the contract and exits non-zero on a violation. Its `FIELDS` record is a mapped type over `keyof Required<Exercise>`, and each spec's `required` flag is derived from the interface's optionality, so **changing `Exercise` fails `type-check` until the validator is updated** - the check cannot fall behind what it checks. It reads both closed vocabularies off the domain, so neither can drift from what it validates. The teaser ceiling (100, DESIGN §5.1) is an error; the 70-char target is a warning only, as DESIGN §5.1 requires.

**`scripts/catalogue.ts`** is what the two scripts both need: `CATALOGUE_PATH` (one expression, **one name** - the path used to exist under two, which is how two tools end up disagreeing about which file they operate on), plus `isPlainObject`, `messageOf` and `entryLabel`. Tooling messages are English; French is for catalogue content only.

### Editing the catalogue in a spreadsheet

A spreadsheet is how a coach would rather author ~150 exercises, so **`scripts/exercises-csv.ts`** (`npm run data:export` / `data:import`) converts both ways. One file, in sections: the column map, JSON → CSV, CSV → JSON, file access, the commands, the CLI. `csv-parse` / `csv-stringify` (devDeps) do the parsing and the quoting - the file only maps fields to cells; `node:util`'s native `parseArgs` reads the flags, so a typo is an error rather than a silent fallback to the default path. `FIELD_KINDS` is the same mapped type over `keyof Required<Exercise>` that `FIELDS` is, so a new field fails `type-check` in **both** it and `validate-data.ts` until it has a rule _and_ a column - a round trip can never silently drop one.

**It converts, and nothing else.** Checking the content is `npm run validate:data`, run as a separate second step after an import - the converter never wraps, restates or invokes it. The cost is deliberate: an import writes whatever the CSV says, so a bad one lands in `exercises.json` and is caught after the fact. `git checkout` is the undo.

The refusals it _does_ make are about the conversion being faithful, never about the data being good - and one of them is the reason the boundary is safe at all: a CSV with **no data row** is rejected, because an empty array is valid JSON _and_ passes the contract, so a header-only file would erase the catalogue while `validate:data` reported "0 exercises checked, 0 errors". The converter is the only place that can catch it. The others (a `|` inside a value, a mismatched header, an all-empty row, a stray positional argument) follow the same logic and are documented in the file. Export is lenient the other way on purpose: a wrongly-typed value is written to the cell as text rather than dropped, because exporting not-yet-green JSON to fix it in a spreadsheet is the expected path.

The dialect is `;`-separated (RFC 4180 quoting, CRLF, UTF-8 BOM - what a French Excel opens without an import wizard); list fields collapse to one `|`-separated cell rather than to numbered columns, since `instructions` has no fixed length.

`public/data/exercises.json` sits in **`.prettierignore`**, and that is the same ownership rule: the converter writes it with `JSON.stringify(entries, null, 2)`, Prettier would re-fold those arrays, and the two would then undo each other on every `data:import` / `format` pair - roughly 900 lines of churn per round trip. A file a tool writes is a file that tool formats.

### Styling - Tailwind CSS v4

Uses the **v4** engine, wired into Vite via the `@tailwindcss/postcss` plugin in `postcss.config.js`. There is no `tailwind.config.js`; config is CSS-first in `src/assets/main.css`:

- `@import "tailwindcss";` replaces the old `@tailwind` directives.
- The `@theme` block defines the tokens (category `--color-*`, neutrals, etc.), usable as utilities (`bg-physique`, `text-physique`, …).
- Reusable classes (e.g. `.card`) live in `@layer components` via `@apply`.
- **Token values, the category palette and the dark-mode policy live in `DESIGN.md`** (§2, §7) - not duplicated here.

**Critical Tailwind v4 gotcha** (also `DESIGN.md` §10): the JIT scanner only sees class names that appear as complete static strings in source. Never build class names by concatenation (`'bg-' + cat`) - they won't be generated. Map dynamic choices to full static strings; a `.ts` is scanned like any other source, so the two style modules cost the scanner nothing:

- **`src/components/categoryStyles.ts`** - `CATEGORY_TINT` / `CATEGORY_RULE`, the single home for the category palette.
- **`src/components/toggleStyles.ts`** - `TOGGLE_ON` / `TOGGLE_OFF`, the one toggle recipe shared by the scope pills (§5.2) and the filter sheet's options (§5.5). Only the **duration** lives here, because that is the part that differs by state (§6): 300ms to fill, 150ms to recede.

Repeated class strings live in `@layer components` (`.card`, `.pill-action`, `.toggle-on`/`.toggle-off`, `.eyebrow`, `.app-bar`, `.meta-chip`, `.state-block`, `.state-error`, `.page-gutter`, `.btn-ink`, `.btn-ghost`) and carry a **skin, never a box**: size, padding and any deliberate timing stay at the call site, so two controls can share a look without being fused. A glyph used in more than one place is a component in `src/components/icons/`; single-use glyphs stay inline. DESIGN §10/§11 hold both rules.

### PWA and offline

`vite-plugin-pwa` is configured in `vite.config.ts`, and the app is genuinely offline-first at the crag: the shell, the Inter subsets and **`exercises.json` itself** are precached (`workbox.globPatterns`), so the repository's runtime fetch is served from the cache with no network. `globIgnores` drops the Inter subsets French does not need; `navigateFallback: 'index.html'` covers navigation offline; `registerType: 'autoUpdate'` means a new deploy activates and reloads silently, which is safe for a read-only catalogue.

**The service worker also runs under `npm run dev`** (`devOptions: { enabled: true }`, so the offline flow is testable locally). Budget for it: content that stays stale after you edit `exercises.json`, or a change that will not appear on reload, is usually the SW serving precache - unregister it in DevTools → Application, or hard-reload, before concluding the code is wrong.

`scope` and `base` are hardcoded `'/'` for the custom domain (`public/CNAME` → www.ascendbox.fr). The repository's `BASE_URL`-relative fetch is therefore only half of what a move to project-pages needs; these two are the other half.

### CI/CD and releases

`.github/workflows/ci-cd.yml` runs on push and PR to `main` (plus `workflow_dispatch`). The Quality Gate gates everything; build and Lighthouse then run in parallel, and only the build branch continues:

```
🛡️ Quality Gate ─┬─ ⚒️ Build ── 📦 Semantic Release ── 🚀 Deploy to Production
                 └─ 🔦 Lighthouse
```

- **Quality Gate** = `type-check`, `lint:ci`, `validate:data` - the three local gates, nothing more.
- **Lighthouse** = the a11y gate described above; independent of the release chain but it fails the run.
- **Semantic Release** derives the version tag and the GitHub release notes from commit messages, so **[Conventional Commits](https://www.conventionalcommits.org/) are load-bearing** (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `refactor:`, `perf:`…). A malformed subject line is a release bug, not a style nit. No `CHANGELOG.md` is committed.
- Concurrency is grouped per ref with `cancel-in-progress: false` - a release must never be interrupted mid-publish.
- `.github/workflows/codeql.yml` scans `javascript-typescript` and `actions` on push/PR plus weekly (Mondays 00:00 UTC). Dependabot opens weekly npm and Actions PRs. Every action is pinned to a commit SHA; dependency install is shared through `.github/actions/setup`.

## Tasks

This is the **only** place tasks are tracked - `DESIGN.md` describes the design, never its to-do list.

### Pending / out of scope

- [ ] **Upgrade to TypeScript 7** - held back: stable is 7.0.2 (the native compiler rewrite) but `typescript-eslint` still peers `typescript <6.1.0` (even canary), so TS 7 would break the type-aware linting. Currently pinned `^6.0.0`. Unblock when `typescript-eslint` ships TS 7 support; `vue-tsc` already allows `>=5.0.0`.
- [ ] **Vitest will need the module-scope state reset between tests** - every module in `src/application/` holds its refs at **module scope** (`const all = shallowRef(...)`, outside any function). That is what makes the layer a shared singleton, and it is deliberate - but it also means the state cannot be reset: two suites importing `useExercises` share one `activeCategory`, one search query and one page position, so tests leak into each other in file order. Whatever lands will need `vi.resetModules()` plus a re-`import` in a `beforeEach`, or the composables will need a factory form. Recorded here so the constraint shapes the test setup rather than being discovered halfway through it. Converting to injectable factories **now** was considered and rejected: it is a rewrite of the whole layer and its six consumers, for a benefit that does not exist until the first test does.
- [ ] **Split `tsconfig.json` when Vitest lands** - today a single hardened config is enough (one Node-side file, `vite.config.ts`). When Vitest arrives (a 2nd+ Node-side config/setup), split into the canonical `tsconfig.json` (references) + `tsconfig.app.json` (DOM, `vite/client`) + `tsconfig.node.json` (Node, `@types/node`), with a shared base for the strict flags and `vue-tsc -b` for `type-check`.
- [ ] **Finish the detail data** - **re-measured 2026-08-22, on 149 exercises**: `objective` and `instructions` are complete at **149/149**. What is still partial: `equipment` **52/149**, `variants` **35/149**, `safety` **8/149**. Content authoring, not code - the model is settled (the two blockers that stalled this, `restSec`'s double meaning and "par bras", are gone with `protocol`). `safety` is the one that cannot be bulk-filled: it is coaching advice, so it needs a human who coaches. Rewriting the teasers is the other half, and it has largely happened - see the ceiling task below.
- [ ] **Drop the teaser ceiling to 90 (360px guarantee)** - the current ceiling of 100 is the _390px_ budget; a real 360 guarantee needs ~90. **Re-measured 2026-08-22: the longest teaser in the catalogue is 84 chars, and only 4 exceed the 70-char target.** The blocker this task recorded - "29 teasers exceed today" - is gone: the editorial rewrite it was waiting on has happened. Lowering `TEASER_CEILING` to 90 and DESIGN §5.1 with it now costs **zero data edits**. The 360px render re-measure this task asked for was taken on 2026-08-21 (headless Chromium, **all 123 entries of the catalogue as it then stood**): not one teaser reached a 4th line - 115 landed on two lines and 8 on three at 360, 122 / 1 at 390 - so the clamp held at 360 and the 90 ceiling would be belt-and-braces rather than a fix. **That render measurement predates the growth to 149 and has not been re-run**; the character counts above have. DESIGN §5.1 carries it. **The ceiling change itself still needs the maintainer's go-ahead**; it is not to be made on initiative.
- [ ] **`Tous` scope option** - **deliberately not built** (product decision): the scope bar stays 3-way single-select, defaulting to `physique`. The cross-category / all-catalogue need is served instead by the global search (§5.9), which overrides the scope. `DESIGN.md` §5.2 was updated to match; revisit only if term-free full-catalogue browsing is needed.

### Settled

- [x] **Filter sheet vertical budget - resolved by the tag rationalisation, not by a layout change** (2026-08-22). At **25 tags** the sheet ran 62-218px past `max-h-[85vh]` on three scopes of four at 360px, putting `Voir N exercices` below the fold of a panel whose whole rationale is thumb-zone reach. Re-measured after the vocabulary shrank to **16 tags**: worst case is **10px** of overflow (Technique and search mode), and the CTA is reachable without scrolling on **every** scope, at 360 and 390. No layout lever was needed. What survives is the constraint, now in DESIGN §5.5: the budget is spent by the **tag count**, so it is an editorial lever as much as a layout one - roughly six more tags would put the CTA back under the fold. Re-measure before adding anything to that panel, or a batch of new tags.

### Known simplification

- The filter sheet applies filters **live** (no draft/commit state). "Voir N exercices" therefore shows the _current_ match count and just closes the sheet - acceptable for a read-only catalog; upgrade to a pending-selection model only if needed.
