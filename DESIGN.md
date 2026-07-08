# DESIGN.md — AscendBox Design System

AscendBox's design system — a mobile-first app for climbing-club coaches to browse training
exercises. This document is the **design source of truth**.

> **Technical context**: Tailwind CSS **v4** (`tailwindcss@next` engine), _CSS-first_ config in
> [`src/assets/main.css`](src/assets/main.css) via the `@theme` block — there is **no**
> `tailwind.config.js`. The tokens below are therefore CSS variables exposed as Tailwind
> utilities (`bg-force`, `text-mental`, etc.).

---

## 1. Principles

1. **Mobile-first** — everything is designed thumb-first (touch targets ≥ 44px, single-column feed, sticky filters at the top).
2. **Calm above all** — borders rather than heavy shadows, soft tints (`/10`, `/20`) rather than saturated fills, no glow.
3. **Color carries meaning** — each category has ITS color, intensity has a semantic scale. Color is never decorative.
4. **Motion guides, it does not distract** — short transitions (200–300 ms), subtle tactile feedback (`active:scale`), crossfade on context change.
5. **Dark = comfort, not an option** — the theme follows the OS (`prefers-color-scheme`), no manual toggle. Every token has its dark variant.

---

## 2. Colors

### 2.1 Categories — brand identity

Source of truth: `@theme` in [`main.css`](src/assets/main.css). The ids (`force`/`technique`/`mental`)
intentionally match the token names.

| Category      | Token               | Hex       | Tailwind base |
| ------------- | ------------------- | --------- | ------------- |
| **Force**     | `--color-force`     | `#f43f5e` | Rose 500      |
| **Technique** | `--color-technique` | `#06b6d4` | Cyan 500      |
| **Mental**    | `--color-mental`    | `#a855f7` | Purple 500    |

Usable as `bg-force`, `text-technique`, `ring-mental`, and with opacity `bg-force/10`.

### 2.2 Neutrals (Slate scale)

| Usage                        | Light       | Dark        |
| ---------------------------- | ----------- | ----------- |
| Page background              | `slate-50`  | `slate-900` |
| Primary text                 | `slate-800` | `slate-100` |
| Surface (card)               | `white`     | `slate-800` |
| Border                       | `slate-200` | `slate-700` |
| Secondary text               | `slate-500` | `slate-400` |
| Neutral background (inactive chip) | `slate-100` | `slate-800` |

### 2.3 Semantic — exercise intensity

A 3-level scale (`Intensity = 1 | 2 | 3`), **tokenized** in `@theme` ([`main.css`](src/assets/main.css))
like the categories. The level → token map lives in [`ExerciseCard.vue`](src/components/ExerciseCard.vue):

| Level | Label   | Token                    | Hex       | Tailwind base | Utilities                                  |
| ----- | ------- | ------------------------ | --------- | ------------- | ------------------------------------------ |
| 1     | Faible  | `--color-intensity-low`  | `#059669` | Emerald 600   | `bg-intensity-low`, `text-intensity-low`   |
| 2     | Modérée | `--color-intensity-mid`  | `#d97706` | Amber 600     | `bg-intensity-mid`, `text-intensity-mid`   |
| 3     | Élevée  | `--color-intensity-high` | `#e11d48` | Rose 600      | `bg-intensity-high`, `text-intensity-high` |

> Green → amber → rose: a universally legible "easy → hard" progression.
> A single token per level serves both the bar and the text (same logic as the categories);
> the 600 shade is chosen to preserve the label's contrast in light mode.

---

## 3. Typography

- **Family**: `--font-sans: "Inter", system-ui, -apple-system, sans-serif`.
  Inter is loaded from Google Fonts in [`index.html`](index.html) (weights 400/500/600/700,
  `display=swap` + `preconnect` so it doesn't block first paint). `system-ui` remains the
  fallback if the font is unavailable.
- **Scale in use** (observed in the components):

| Role                          | Classes                                    |
| ----------------------------- | ------------------------------------------ |
| Card title                    | `text-lg font-bold leading-tight`          |
| Description                   | `text-[15px] leading-relaxed`              |
| Category label / duration / tags | `text-xs font-semibold` (or `font-medium`) |
| Filter button                 | `font-bold capitalize`                     |

---

## 4. Spacing

### 4.1 Scale

**4px grid.** All spacing (padding, margin, gap) are multiples of `4px`, applied via Tailwind's
native utilities (`--spacing` = `0.25rem`). We do **not** tokenize spacing in `@theme` — unlike
colors, Tailwind's numeric scale _is_ already the source of truth. We simply **restrict** the steps
to those below and give each a role.

| Step  | rem   | px  | Tailwind | Role                                                                         |
| ----- | ----- | --- | -------- | ---------------------------------------------------------------------------- |
| `3xs` | 0.125 | 2   | `-0.5`   | tight micro-gap (intensity bars)                                             |
| `2xs` | 0.25  | 4   | `-1`     | icon↔text gap, title↔description spacing                                     |
| `xs`  | 0.375 | 6   | `-1.5`   | inline gap (dot↔label, meter, tags)                                          |
| `sm`  | 0.5   | 8   | `-2`     | gap between chips / within a row                                             |
| `md`  | 0.75  | 12  | `-3`     | **intra-card** rhythm (blocks, header, footer), chip horizontal padding      |
| `lg`  | 1     | 16  | `-4`     | **card padding** (`p-4`), filter horizontal padding                          |
| `xl`  | 1.5   | 24  | `-6`     | **feed gutter** (`gap-6`) + container padding (`p-6`)                        |
| `2xl` | 2     | 32  | `-8`     | **section** rhythm (`main py-8`, sentinel `h-8`)                             |
| `3xl` | 3     | 48  | `-12`    | breathing room for empty / error states (`py-12`)                            |

### 4.2 Rhythm (finest to widest)

1. **Inline** (`3xs`→`xs`) — what lives on the same line: an icon and its text, dots, bars.
2. **Intra-card** (`md`) — the stacked blocks of a card breathe at `12px` (`flex flex-col gap-3`).
3. **Card** (`lg`) — internal padding at `16px`.
4. **Between cards / container** (`xl`) — the feed gutter _and_ the container margin share `24px`,
   so the feed "breathes" at the same step inside as around.
5. **Section** (`2xl`) — the vertical break between page zones.
6. **Empty** (`3xl`) — an empty/error state takes twice the section step so it doesn't look broken.

### 4.3 Rules

- **Stay on the steps above.** No arbitrary value (`px-5`, `px-2.5`, `p-[13px]`…):
  pick the nearest named step. _(Regularized: filters go `px-5`→`px-4`, chips `px-2.5`→`px-3`.)_
- **One role = one step.** Two elements playing the same role use the same step (e.g. feed gutter
  and container padding = `xl`) — that's what makes the rhythm legible.
- **The touch target is not a rhythm step.** `min-h-11` (44px) is an accessibility constraint (§8),
  independent of the scale.
- **Dimensions (`w-*`/`h-*`) follow the same grid** where possible (dot `w-2 h-2`, sentinel `h-8`),
  except icon sizing, left pragmatic (`w-3.5 h-3.5`).

### 4.4 Radii & surfaces

- **Radii**: `rounded-3xl` (cards), `rounded-full` (dots, chips, filter buttons).
- **Elevation**: **no shadows** by default. Separation comes from `border` + surface contrast (`white` vs `slate-50`).

---

## 5. Components

### 5.1 `.card` — base surface

Defined in `@layer components` in [`main.css`](src/assets/main.css):

```
bg-white dark:bg-slate-800
border border-slate-200 dark:border-slate-700
rounded-3xl p-4
transition-all duration-300
```

Interaction: clickable cards add `active:scale-[0.98]`.

### 5.2 Filter chip / pill — `CategoryFilter`

- **Active**: `bg-{category}/10 dark:bg-{category}/20 text-{category} ring-{category}/30` (soft tint + colored text + thin ring).
- **Inactive**: `bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-transparent` + `hover:bg-slate-200 dark:hover:bg-slate-700`.
- Always `ring-1` to avoid a layout jump between states.

### 5.3 Category dot

`w-2 h-2 rounded-full bg-{category}` — color marker at the top of a card.

### 5.4 Tags

`text-xs font-semibold px-2.5 py-1 rounded-full`, tinted to the category color: `bg-{category}/10 text-{category}`.

### 5.5 Intensity meter

3 bars of increasing height (`h-2`, `h-3`, `h-4`), `w-1 rounded-full`.
Filled (`n <= intensity`) → level color; empty → `bg-slate-200 dark:bg-slate-600`.
**The level IS the number of filled bars** (no need to read the label).

### 5.6 Loading skeleton

`animate-pulse` on `bg-slate-200 dark:bg-slate-700` blocks reproducing the shape of a card.
The shell stays interactive during the `fetch`.

### 5.7 Filter bar (nav)

`sticky top-0 z-20` + `bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md` — stays reachable while scrolling, translucent.

---

## 6. Motion & transitions

| Context                     | Recipe                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Color / theme change        | `transition-colors duration-300`                                                                                                         |
| Button feedback             | `active:scale-95`                                                                                                                        |
| Card feedback               | `active:scale-[0.98]`                                                                                                                    |
| Category change             | `<Transition mode="out-in">` — crossfade + slight `translate-y` (enter 300 ms, leave 200 ms)                                             |
| Card additions (pagination) | `<TransitionGroup>` — enter `opacity-0 translate-y-4` → visible (500 ms), `move` in 300 ms, **no `leave`** (avoids overlap)              |

Principle: one transition per intent. We don't stack animations.

---

## 7. Dark theme

- Driven by `@media (prefers-color-scheme: dark)` (OS setting), **never** by a manually toggled `dark` class.
- Every neutral token has its `dark:*` counterpart. Category colors are shared, but their background opacity rises (`/10` → `dark:/20`) to stay visible on dark backgrounds.

---

## 8. Accessibility

- **Touch targets** ≥ 44px (`min-h-11` on filters).
- **Announced states**: `aria-pressed` (active filter), `aria-busy` + `aria-live="polite"` (skeleton), `aria-hidden` (decorative: dot, sentinel, SVG).
- **Contrast**: primary text `slate-800`/`slate-100` on `slate-50`/`slate-900` backgrounds.
- **Color redundancy**: intensity is also conveyed by the number of bars and a text label, not by hue alone.

---

## 9. ⚠️ Critical constraint — Tailwind v4 JIT

The JIT scanner generates **only** the classes present as **complete static strings** in the source.
**Never build a class name by concatenation**:

```ts
// ❌ INVISIBLE to the scanner — the class will not be generated
:class="'bg-' + category"

// ✅ Map each choice to a complete, static string
const activeClasses: Record<CategoryId, string> = {
  force: 'bg-force/10 dark:bg-force/20 text-force ring-force/30',
  technique: 'bg-technique/10 dark:bg-technique/20 text-technique ring-technique/30',
  mental: 'bg-mental/10 dark:bg-mental/20 text-mental ring-mental/30',
};
```

See `activeClasses` in [`CategoryFilter.vue`](src/components/CategoryFilter.vue) and `CATEGORY_STYLE`
in [`ExerciseCard.vue`](src/components/ExerciseCard.vue).

---

## 10. Known design debt / TODO

- [x] ~~**Actually load the Inter font**~~ — loaded from Google Fonts in [`index.html`](index.html) (§3).
- [x] ~~**Tokenize the semantic intensity colors**~~ — `--color-intensity-*` tokens in `@theme` (§2.3).
- [x] ~~**Formalize a spacing scale**~~ — named scale on a 4px grid + rhythm + rules (§4); `px-5` and `px-2.5` regularized.
- [ ] **Self-host Inter** — the current loading depends on Google Fonts (third-party request). Consider a local `@font-face` for perf/privacy.

---

## 11. Where to add what

| I want to…                                  | File                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Add/change a token color                    | `@theme` in [`main.css`](src/assets/main.css)                                                 |
| Add a category                              | [`domain/exercise.ts`](src/domain/exercise.ts) (`CATEGORIES`) **+** color token in `@theme`   |
| Create a reusable class (e.g. `.card`)      | `@layer components` in [`main.css`](src/assets/main.css)                                       |
| Change a card / chip style                  | the relevant component in [`src/components/`](src/components/)                                 |
| Pick a spacing (padding/margin/gap)         | the §4 scale — nearest named step, never an arbitrary value                                    |
