<div align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="AscendBox logo" />
  <h1>AscendBox</h1>
  <p><em>The exercise toolbox for climbing coaches.</em></p>

  <p>
    <a href="https://github.com/PHBasin/ascendbox/actions/workflows/ci-cd.yml"><img src="https://github.com/PHBasin/ascendbox/actions/workflows/ci-cd.yml/badge.svg" alt="CI/CD" /></a>
    <a href="https://github.com/PHBasin/ascendbox/actions/workflows/codeql.yml"><img src="https://github.com/PHBasin/ascendbox/actions/workflows/codeql.yml/badge.svg" alt="Security Analysis" /></a>
    <a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/release-semantic--release-e10079?logo=semantic-release" alt="semantic-release" /></a>
    <a href="LICENSE.md"><img src="https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey.svg" alt="License: CC BY-NC-SA 4.0" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white" alt="Vue 3" />
    <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" alt="Vite 8" />
    <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" alt="TypeScript strict" />
    <img src="https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  </p>
</div>

---

**AscendBox** is a _mobile-first_ web app that lets climbing-club coaches browse a catalog of
training exercises, filtered by category (**Physique**, **Technique**, **Mental** — strength, technique,
mental) and qualified by level and duration.

> Exercise content is in French; the code and comments are in English.

## ✨ Features

- 🎯 **Category scope** — Physique, Technique, Mental, each with its own icon + identity color.
- 🔍 **Collapsible search** — a magnifier expands into a field; when used it searches the whole catalog (title, teaser, tags — case/accent-insensitive), overriding the category scope.
- 🎛️ **Attribute filters** — a bottom sheet refines the feed by duration, level and tags (multi-select), with an active-count badge and removable chips.
- 📊 **At-a-glance reading** — every card shows duration, up to 3 tags and a neutral 3-segment level gauge with its label (no meaning carried by colour alone).
- 📖 **Exercise detail page** — a shareable route (`/#/exercice/12`) with the objective, a numbered step-by-step, adaptations and any safety warning; each section renders only when its data exists.
- ♾️ **Infinite scroll** — automatic pagination on scroll (with prefetch).
- 🌗 **Light / dark theme** — automatic, follows the operating-system setting.
- 📱 **Mobile-minded** — touch targets ≥ 44px, single-column feed, sticky filter bar.
- 📶 **Installable PWA** — service worker + manifest; the app shell, exercises and fonts are precached, so it works **fully offline** at the crag and auto-updates on a new deploy.

## 🚀 Getting started

**Prerequisites**: Node.js **24.18.0** (see [`.nvmrc`](.nvmrc)) and npm.

```bash
nvm use          # align the Node version with .nvmrc
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:3000
```

## 📜 Scripts

| Command                 | Description                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run dev`           | Vite development server (port **3000**).                                                            |
| `npm run type-check`    | Type-checking via `vue-tsc` (emits no files).                                                       |
| `npm run validate:data` | Check `exercises.json` against the `Exercise` contract (`--verbose` lists every editorial warning). |
| `npm run build`         | Production build into `dist/`.                                                                      |
| `npm run preview`       | Serve the production build locally.                                                                 |
| `npm run lint`          | ESLint over the project, auto-fixing where possible (`--fix`).                                      |
| `npm run lint:ci`       | ESLint with no auto-fix — the exact gate CI runs.                                                   |
| `npm run format`        | Prettier write across the project.                                                                  |

> ℹ️ There is **no test runner yet**, but correctness is enforced **statically**:
>
> - a **hardened `tsconfig`** checked by `vue-tsc` — `strict` plus `noUncheckedIndexedAccess`,
>   `noImplicitReturns`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `noImplicitOverride`…
> - **type-aware ESLint** (`typescript-eslint` _recommendedTypeChecked_ via `projectService`), which
>   catches type-level bugs `vue-tsc` compiles through — e.g. floating promises — plus Prettier.
> - **`validate:data`**, which closes the one hole the two above cannot see: the catalogue JSON is
>   fetched, not imported, so no compiler reads it.
>
> None of the three runs during `dev` or `build` — a green build is not type-, lint- or data-clean.
> CI runs all three plus a **Lighthouse accessibility gate** on every push and pull request.
>
> They prove the app _compiles_; only a browser proves it _lays out_. The `visual-check` skill
> (`.claude/skills/visual-check/`) screenshots the app at fixed viewports and fails on horizontal
> overflow — it exists because a metrics-only check once passed green while `Technique` rendered as
> `Techniq…`.

## 🧱 Tech stack

- [Vue 3](https://vuejs.org/) (`<script setup>` + Composition API)
- [Vite 8](https://vitejs.dev/) (bundler & dev server)
- [TypeScript](https://www.typescriptlang.org/) (`strict` + hardened compiler flags)
- [Tailwind CSS v4](https://tailwindcss.com/) (_CSS-first_ config, no `tailwind.config.js`)
- [Inter](https://rsms.me/inter/) — **self-hosted** (`@fontsource-variable/inter`), no third-party request

## 🏗️ Architecture

The project follows a **layered architecture** (Clean-Architecture-inspired) so that the data
source can be swapped without touching the UI. Dependencies flow in a single direction:

```
domain  →  data  →  application  →  presentation
```

| Layer            | File                                                                 | Role                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain**       | [`src/domain/exercise.ts`](src/domain/exercise.ts)                   | Pure business entities & types. Single source of truth for the closed vocabularies — `CATEGORIES` and `LEVELS`, with their label records derived from them. Zero framework dependency. |
| **Data**         | [`src/data/exerciseRepository.ts`](src/data/exerciseRepository.ts)   | The only module that knows the source. `fetch`es the JSON, freezes it (`Object.freeze`) and caches it. Swap it to move to an API.                                                      |
| **Application**  | [`src/application/useExercises.ts`](src/application/useExercises.ts) | State composable (shared singleton): scope, search, filtering, pagination, loading/error. Behavior lives here.                                                                         |
| **Presentation** | [`src/views/`](src/views/) + [`src/components/`](src/components/)    | One component per route (`HomeView`, `ExerciseView`), plus purely visual components: `HeaderToolbar`, `CategoryScope`, `ExerciseFeed`, `ExerciseCard`, `LevelGauge`, `FilterSheet`.    |

- **Path alias**: `@` → `./src` (declared in both `vite.config.ts` **and** `tsconfig.json`).
- **Routing**: [`src/router/index.ts`](src/router/index.ts) — **hash** history (`/#/exercice/12`), because GitHub Pages is a static host with no rewrite rule.
- **No duplicated look**: repeated Tailwind strings live as classes in `@layer components`
  ([`main.css`](src/assets/main.css)); the category palette lives in
  [`categoryStyles.ts`](src/components/categoryStyles.ts); a glyph used more than once is a component
  in [`src/components/icons/`](src/components/icons/). See [DESIGN.md §10/§11](DESIGN.md).
- **Design system**: see [DESIGN.md](DESIGN.md).

## 📂 Data

Exercises live in [`public/data/exercises.json`](public/data/exercises.json), **fetched at runtime**
(out of the JS bundle for a better _time-to-interactive_; preloaded via `<link rel="preload">` in
[`index.html`](index.html)).

Each entry conforms to the `Exercise` interface. Seven fields are required; the rest feed the detail
page (§5.6) and are **optional by design** — the catalogue is authored incrementally, and a section
with no data simply does not render.

```json
{
  "id": 1,
  "title": "Suspensions Max (Morts)",
  "teaser": "Tenir 7 secondes sur réglette 15mm. 3 minutes de repos. 5 séries.",
  "categoryId": "physique",
  "tags": ["poutre"],
  "level": 3,
  "duration": 20,

  "objective": "Développer la force maximale des doigts en suspension isométrique.",
  "equipment": ["Poutre", "Réglette 15 mm"],
  "instructions": ["Échauffer doigts et épaules pendant 10 minutes minimum.", "…"],
  "variants": { "harder": ["Descendre sur une réglette 12 mm."], "easier": ["…"] },
  "safety": "Échauffement complet obligatoire (doigts + épaules)."
}
```

- `categoryId`: `"physique"` | `"technique"` | `"mental"`.
- `level`: `1` (low) | `2` (moderate) | `3` (high).
- `duration`: in minutes.
- **`teaser` ≠ `objective` ≠ `instructions`** — three surfaces, not one field. The teaser is the
  card's hook and says _what you do_; the objective is the detail's subtitle and says _what it buys
  you_; `instructions` is the step-by-step, one bullet per step. The detail never echoes the teaser.

> Because the JSON is _fetched_ (not imported), `vue-tsc` cannot see it — a schema drift would only
> fail at runtime, in the field. **`npm run validate:data` is the gate that closes this** and runs in
> CI: it checks every entry against the contract and exits non-zero on a violation. Its field table is
> a mapped type over `keyof Required<Exercise>`, so **changing the interface fails `type-check` until
> the validator is updated** — the check cannot fall behind what it checks.

## 🔄 CI/CD & security

Two GitHub Actions workflows run on every push and pull request to `main`.

### `CI/CD` — [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

Triggered on push and PR to `main`, and manually (`workflow_dispatch`). Jobs run sequentially, each
gating the next via `needs`:

1. **🛡️ Quality Gate** — `npm ci`, then `type-check` (`vue-tsc`), `lint:ci` and `validate:data`.
2. **⚒️ Build Application** — `npm run build`, then uploads `dist/` as a GitHub Pages artifact.
3. **🔦 Lighthouse** — builds and audits the app with [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) (`lighthouserc.json`): asserts an **accessibility** floor (error) plus best-practices (warn). Independent of the release/deploy chain.
4. **📦 Semantic Release** — on push to `main` only. Runs [semantic-release](https://semantic-release.gitbook.io/):
   version bump, changelog and GitHub release driven by commit messages.
5. **🚀 Deploy to Production** — publishes the artifact to GitHub Pages (`production` environment).

Concurrency is grouped per ref with **`cancel-in-progress: false`** — a semantic-release run must
never be interrupted mid-publish. Deploy only fires when a release actually happened.

### `Security Analysis` — [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml)

[CodeQL](https://codeql.github.com/) scanning on push and PR to `main`, plus a weekly schedule
(Mondays, 00:00 UTC). Analyzes the `javascript` and `actions` languages with the
`security-extended` + `security-and-quality` query suites.

> 💡 Because commit messages drive releases, follow
> [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`…).

## 🗂️ Project structure

```
ascendbox/
├── .github/workflows/        # CI/CD (ci-cd.yml) & security (codeql.yml)
├── public/
│   ├── data/exercises.json   # the exercise catalog
│   └── favicon.svg           # logo (isometric cube + chevron)
├── scripts/validate-data.ts  # the data-contract gate
├── src/
│   ├── domain/               # entities & types
│   ├── data/                 # data access
│   ├── application/          # state & logic (composables)
│   ├── router/               # routes (hash history)
│   ├── views/                # one component per route
│   ├── components/           # Vue components
│   │   ├── icons/            # glyphs used in 2+ places
│   │   └── categoryStyles.ts # the category palette, as classes
│   ├── assets/main.css       # Tailwind v4 tokens (@theme) + shared classes
│   └── main.ts               # entry point
├── index.html
├── CLAUDE.md                 # guide for the AI assistant
└── DESIGN.md                 # design system
```

## 🚧 Roadmap

Possible directions, grouped by theme. None is blocking — the project works as-is.

### Quality & robustness

- **Tests** — there are no tests yet. Add [Vitest](https://vitest.dev/) for the logic
  ([`useExercises.ts`](src/application/useExercises.ts): filtering, pagination) and
  [Vue Test Utils](https://test-utils.vuejs.org/) for the components, then wire them into the
  Quality Gate.
- **Runtime JSON validation** — `validate:data` guards the file in CI, but the app itself trusts what
  it fetches. Validating in [`exerciseRepository.ts`](src/data/exerciseRepository.ts) would also catch
  a bad response from a future API.

### Features

- **Favorites** for exercises (persisted in `localStorage`).
- **Session builder** — pick exercises to assemble a training session.

### Technical

- **API migration** — the architecture is already prepared: just rewrite
  [`exerciseRepository.ts`](src/data/exerciseRepository.ts); nothing else moves.
- **Automated accessibility tests** (axe-core) — component-level a11y assertions, to come with the Vitest setup above.

### Design (see [DESIGN.md](DESIGN.md) — status tracked in [CLAUDE.md](CLAUDE.md))

- **Fill in the detail content** — the detail page ([DESIGN.md §5.6](DESIGN.md)) is built, but
  `objective` / `instructions` / `variants` / `equipment` / `safety` are only authored on ids 1–2.
  Content work, not code.
