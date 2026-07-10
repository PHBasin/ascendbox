# DESIGN.md — AscendBox Design System

AscendBox is a mobile-first PWA that lets climbing-club coaches browse training exercises.
This document is the **design source of truth** for the UI. Product context (usage environment,
audience) lives in `CLAUDE.md` — the rules here implement it.

> **Technical context** — Vue 3 + Tailwind CSS **v4** (`tailwindcss@next`), _CSS-first_ config in
> [`src/assets/main.css`](src/assets/main.css) via `@theme` (no `tailwind.config.js`). Tokens are
> CSS variables exposed as utilities (`bg-physique`, `text-mental`, …). Read §10 (Tailwind v4 JIT)
> before writing any dynamic class.

---

## 1. Principles

1. **Legibility first.** The design is readable at arm's length before it is anything else.
   Contrast and size win over subtlety.
2. **Thumb-first.** Single-column feed on mobile (a responsive 2-/3-column grid on wider screens,
   §5.1), targets ≥ 44px (48px comfortable; the primary full-width CTA ~52px tall), reachable
   controls, no precision gestures (no sliders for critical input).
3. **Never hue alone — always redundant encoding.** Every meaningful signal is carried by at least
   two channels: shape/count/icon **and** text, with colour as reinforcement only. Passes a
   grayscale test.
4. **Recognition over recall.** Active filters, current scope and selected state are always visible.
   The coach never has to remember what they set.
5. **One intent, one component.** Distinct data types get distinct controls; a control looks like
   what it does (action = filled/elevated; information = flat).
6. **Motion guides, never distracts.** Short (200–300 ms), single-purpose transitions; subtle
   tactile feedback (`active:scale`). Never stack animations.

---

## 2. Foundations — Colour

### 2.1 Categories (navigation, not a filter)

Category is the app's **primary scope** (Physique / Technique / Mental) — mutually exclusive, always
visible. Source of truth: `@theme` in [`main.css`](src/assets/main.css).

| Category      | Token               | Hex       | Base       | Mandatory icon |
| ------------- | ------------------- | --------- | ---------- | -------------- |
| **Physique**  | `--color-physique`  | `#f43f5e` | Rose 500   | dumbbell       |
| **Technique** | `--color-technique` | `#06b6d4` | Cyan 500   | target         |
| **Mental**    | `--color-mental`    | `#a855f7` | Purple 500 | spark          |

> **Redundancy is mandatory.** Physique (rose) and Mental (purple) are adjacent hues and can merge for
> protan/deutan users and in glare. Category is therefore **always** rendered as _icon + label_, with
> colour as reinforcement — never a bare coloured dot as the sole marker.

Usable as `bg-physique`, `text-technique`, `ring-mental`, with opacity `bg-physique/10`.

### 2.2 Neutrals (Slate scale)

| Usage            | Light       | Dark        |
| ---------------- | ----------- | ----------- |
| Page background  | `slate-50`  | `slate-900` |
| Surface (card)   | `white`     | `slate-800` |
| Border           | `slate-200` | `slate-700` |
| Primary text     | `slate-900` | `slate-50`  |
| Secondary text   | `slate-600` | `slate-300` |
| Inactive chip bg | `slate-100` | `slate-800` |

> Primary/secondary text darkened one step vs. the previous spec (`slate-800`→`slate-900`,
> `slate-500`→`slate-600`) to hold contrast (§2.4).

### 2.3 Level scale (`Niveau`)

Each exercise is classified by required **level**: `Débutant` (1) · `Intermédiaire` (2) · `Avancé` (3).
This is an **ordinal** scale — an échauffement lands in _Débutant_, a max-strength drill in _Avancé_.

**Encoding = a 3-segment gauge, filled left-to-right by level, plus the text label.** The level is
read from **how many segments are filled** and the word — _not_ from hue.

- Filled segment → `slate-900 dark:slate-50` (neutral ink). Empty → `slate-200 dark:slate-700`.
- The label (`Débutant`/`Intermédiaire`/`Avancé`) is **always present** next to the gauge.
- Optional semantic accent (`--color-level-*`) may tint the label **only** where it clears AAA —
  never the gauge, and never as the sole cue.

> **Changed from the old model:** the previous emerald→amber→rose _hue_ meter is dropped — hue
> collapses for CVD users. Count + label is the robust, glove-readable encoding.

### 2.4 Contrast targets

| Content                                             | Target                              |
| --------------------------------------------------- | ----------------------------------- |
| Primary text, primary actions                       | **≥ 7:1 (AAA)** wherever achievable |
| Secondary text, borders on surface                  | ≥ 4.5:1 (AA), never below           |
| Do **not** use faint tints (`/10`) to carry meaning | tints are decoration only           |

---

## 3. Typography

- **Family**: `--font-sans: "Inter Variable", "Inter", system-ui, -apple-system, sans-serif`.
  **Self-hosted** via `@fontsource-variable/inter` (weight axis), imported in
  [`main.ts`](src/main.ts) — no third-party request; the `.woff2` ship from our origin and are
  precached for offline (latin + latin-ext subsets).

| Role                                          | Classes (base → `lg`)                             |
| --------------------------------------------- | ------------------------------------------------- |
| Screen / hero title                           | `text-2xl lg:text-3xl font-bold tracking-tight`   |
| **Title band** — card titles + scope/Filtres  | `text-base lg:text-lg font-bold` (`sm+`)          |
| Body / description                            | `text-[15px] lg:text-base leading-relaxed`        |
| Meta (category, duration, tags, level)        | `text-xs font-semibold`                           |
| Section eyebrow                               | `text-[11px] font-bold tracking-widest uppercase` |
| Sheet option / chip                           | `text-sm font-medium`                             |

> Weight and size carry hierarchy; avoid using colour boxes to rank information.

**One title size links the page.** Card titles **and** the header's scope pills + `Filtres` share the
same **title** size (`text-base → lg:text-lg`), so the scope reads as the same typographic family as
the cards it filters — the page feels tied together. On the **phone**, the scope becomes a segmented
control (§5.2) and drops to `text-sm` (Filtres follows) to keep all three axes on one line; the link
re-expresses from `sm` up, where there is room for the full title size. Content roles (hero, title,
body) scale one step at `lg`; meta/eyebrow stay fixed — deliberately small. The base *is* the mobile
size; never scale below it.

---

## 4. Spacing & layout

**4px grid.** Use Tailwind's native scale, restricted to these named steps — one role per step.

| Step  | px  | Tailwind | Role                            |
| ----- | --- | -------- | ------------------------------- |
| `3xs` | 2   | `-0.5`   | micro-gap (gauge/bar segments)  |
| `2xs` | 4   | `-1`     | icon↔text, title↔description    |
| `xs`  | 6   | `-1.5`   | inline gap (label, tags)        |
| `sm`  | 8   | `-2`     | gap between chips               |
| `md`  | 12  | `-3`     | intra-card rhythm, chip padding |
| `lg`  | 16  | `-4`     | card padding, control padding   |
| `xl`  | 24  | `-6`     | feed gutter + container padding |
| `2xl` | 32  | `-8`     | section rhythm                  |
| `3xl` | 48  | `-12`    | empty / error states            |

**Rules:** stay on the steps (no `px-5`, `p-[13px]`); same role → same step; the 44 px touch target
(`min-h-11`) is an accessibility constraint, **not** a rhythm step (§8).

**Unified rhythm — 4 nested tiers.** One structural unit carries the page; everything nests under it,
read top-down (24 > 20 > 12 > 8) so the interface has rhythm instead of scattered ad-hoc gaps:

| Tier          | Value            | Sole role                                                          |
| ------------- | ---------------- | ----------------------------------------------------------------- |
| **Page**      | **24** (`-6`, → `lg:-8`=32) | gutter (header **=** feed), gap header↔cards, **grid gap** |
| **Component** | **20** (`p-5`)   | card / panel padding — one notch under the page, so it reads as a *contained* surface |
| **Group**     | **12** (`-3`)    | title↔copy block, meta rows, pill rows, section labels            |
| **Atom**      | **8** (`-2`)     | icon↔text, tight pairs inside a control                           |

Below the atom, only typographic micro-gaps remain: title↔teaser `gap-1` (4), gauge segments
`gap-0.5` (2).

**icon↔text — two values, by role.** Inside a **control** (scope pills, `Filtres`, sheet reset,
empty-state action) the icon sits at the atom `gap-2` (8). Inside **meta** (card category, duration,
level gauge label, applied chips — all `text-xs`) it tightens to `gap-1.5` (6) so the glyph hugs the
small text. Never mix the two within a role.

**Compact "chip" tier.** Applied-filter chips are a deliberately small element: `min-h-9` (36 px),
`text-xs`, `px` on the `pl-3 pr-2` scale — read-mostly, tapped occasionally (§8 documents the a11y
carve-out). Every *primary* control stays on the `min-h-11` / `text-sm`+ system.

**Responsive bumps (mobile-first).** A few roles step up with the viewport — generous on desktop
without crowding the phone. Header and feed share the **exact same horizontal gutter** at every
breakpoint so their edges stay aligned (§5.8).

| Role                              | Mobile  | up            |
| --------------------------------- | ------- | ------------- |
| Page gutter (header = feed, `px`) | `px-6`  | `lg:px-8`     |
| Feed vertical padding (`py`)      | `py-6`  | `lg:py-8`     |
| Scope pill padding (`px`)         | `px-3`  | `sm:px-4`     |
| Between-control gap               | `gap-2` | `sm:gap-3`    |

The grid gap stays a flat `gap-6` (= the page unit) at every size; the filter sheet keeps `p-6`
(a page-level surface).

**Radii & elevation:** `rounded-3xl` (cards, sheets), `rounded-2xl` (buttons/tiles),
`rounded-full` (chips). **Separation by border + surface contrast, not shadow** — the one exception
is the filter sheet, which uses a soft top shadow to read as an overlay.

---

## 5. Components

### 5.1 `.card` — exercise summary (triage, not execution)

The list is an **index**: it helps _choose_, the detail page helps _execute_ (§5.6). A card shows
identity + key metadata only, and is **entirely tappable** → opens detail. **No per-card play
button** (it competes with the tap target and implies the wrong model).

```
bg-white dark:bg-slate-800
border border-slate-200 dark:border-slate-700
rounded-3xl p-5            /* component tier — §4 */
active:scale-[0.98] transition-all duration-300
```

Anatomy: category (icon + label) · duration · title · 1-line teaser · up to 2 tags · level gauge.

**All card metadata is _flat_** — icon + text, **no fill/border** (duration, tags). A card is pure
information, so nothing on it may wear the elevated/filled _pill_ form the system reserves for
**controls** (§1.5). Filled/bordered pills appear only on interactive surfaces (scope bar, filter
sheet options, applied-filter chips, buttons). This keeps "data vs. action" readable at a glance.

**Feed layout.** The cards sit in a **responsive grid** — `max-w-7xl mx-auto p-6`, `grid gap-6`,
`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`: **one column on the phone** (thumb-first, §1.2), two on
tablets, three on desktop. The header (§5.8) shares the same `max-w-7xl` measure, so its edges line up
with the grid's outer columns.

### 5.2 Category scope bar — `CategoryScope`

Persistent, sticky, single-select navigation across the **3 categories** (defaults to Physique),
kept **out of the filter sheet** as the primary _scope_ rather than an attribute. Only 3 values →
cheap to keep visible, and it is the coach's most frequent entry point. No `Tous` / all-categories
option today — scope is always exactly one category.

**Two responsive forms (never a scroll, never a clipped label):**

- **Phone (`< sm`) — segmented control.** Equal-width `flex-1` pills share the row so all three axes
  stay **icon + label on one line down to ~360 px**, full labels, no horizontal scroll. To make
  `Technique` + icon fit one third of a phone, the phone form runs tight: `text-sm`, a **14 px icon**
  (`w-3.5`), `gap-1`, and a `px-1` floor — but because the `flex-1` cell is wider than its content,
  the pill still reads roomy (content is centred with slack, the padding is only a minimum). Below
  ~360 px a label may `truncate` as a last resort.
- **`sm+` — natural-width pills, centered** at the full `text-base → lg:text-lg` title size (§3, the
  size that links the scope to the card titles), 16 px icon, `px-4`. There is room; nothing tightens.

- **Active**: **solid ink fill** — `bg-slate-900 text-white` (inverted `dark:bg-slate-50
dark:text-slate-900`). Chosen over a category tint so the active state clears AAA and never relies
  on hue (§2.4); the label already identifies the category.
- **Inactive**: `bg-slate-100 text-slate-600` with a **visible border** `ring-slate-200
  dark:ring-slate-700`, `hover:bg-slate-200`, the icon (from `sm+`) category-tinted as reinforcement.
  The border is shared with the search/`Filtres` buttons so the whole header reads as one family of
  pills; the recessed `slate-100` fill (vs the actions' white surface) still marks it as an
  *unselected toggle* rather than a standalone action.
- Always `ring-1` to avoid a layout jump between states.

> **Judgement call, not a law.** Keep category persistent _if_ coaches usually start by picking one,
> then browse. If instead they combine category with the other criteria as equal, movable filters,
> move it **into the sheet** as a multi-select section for a unified model. Decide from real usage;
> don't split the difference (avoid showing it in both places).

### 5.3 Level gauge

3 segments, `rounded-full`, filled left-to-right where `segment ≤ level`; filled = ink, empty =
`slate-200 dark:slate-700`. Always paired with the text label. (Replaces the old ascending-bar
meter.)

### 5.4 Tags — **flat metadata, category-independent**

On a **card**, a tag is plain text: `text-xs font-semibold text-slate-600 dark:text-slate-400`,
prefixed `#`, **no fill, no border**. Tags are information, not controls — they must not wear the
elevated pill form reserved for interactive elements (§1.5, §5.1). A bordered pill reads as tappable
and invites a tap that does nothing; the sheet's tag _pills_ **are** tappable (same shape, opposite
meaning), so the card must not mimic them.

> **Changed twice:** first de-tinted from the category colour (coloured tags were unscannable), then
> **flattened** from a neutral pill to plain text so card metadata never looks like a control.
> Neutral still lets the eye separate _category_ from _attributes_.

### 5.5 Filter sheet — secondary refinement

A bottom sheet (thumb zone) opened from a **Filtres** button that carries an **active-count badge**.
Holds the _attribute_ filters, each a distinct labelled section, same tap interaction:

- **Durée** — time buckets (`< 10 min` · `10–25 min` · `> 25 min`), multi-select.
- **Niveau** — `Débutant` · `Intermédiaire` · `Avancé`, multi-select.
- **Tags** — most-used first; add an in-sheet search when the list exceeds ~10.

Live feedback: the apply button reads **“Voir N exercices”**. Applied filters also appear as
**removable chips** under the scope bar. `Réinitialiser` clears all.

> Category is kept out of the sheet by default (§5.2) — single-select scope vs. multi-select
> attributes. If usage shows category is combined freely with the rest, add it here as a section.

### 5.6 Exercise detail page

Master-detail: full protocol, big text, execution focus.
Anatomy: back nav · category (icon+label) · title + teaser · **stat strip** (Durée · Niveau gauge ·
Matériel) · **Déroulé** as numeric tiles (reps / sets / rest / hold) · coach cues · **Sécurité**
callout (distinct surface) · tags · **sticky footer** with the primary `Démarrer` action (~52px tall,
full-width) + a secondary "save to session".

### 5.7 Loading skeleton

`animate-pulse` on `slate-200 dark:slate-700` blocks in the card's shape; shell stays interactive
during `fetch` (`aria-busy` + `aria-live="polite"`).

### 5.8 Sticky filter bar

`sticky top-0 z-30`, reachable while scrolling. **Opaque** ground (`bg-slate-50 dark:bg-slate-900`

- a solid bottom border) — **not** translucent/blurred: a frosted-glass effect erodes contrast in
  direct sunlight, the primary use context (§1, §2.4). Switching category snaps the feed back to the
  top.

**Layout — same width as the body, responsive within it.** The bar's background is full-bleed, but
its controls share the **same `max-w-7xl mx-auto px-6` measure as the feed grid**, so the header's
edges line up with the outer card columns — the header is the **same width as the body**, not a
narrower or wider strip. Within that measure the arrangement adapts to the feed's own breakpoints:

- **Mobile & tablet (`< lg`) — two tiers.** Tier 1 is `[ title · search · Filtres ]`; tier 2 is the
  category scope on its own full-width line — a **segmented control** on phones, natural-width pills
  centered on `sm+` (§5.2) — always fully visible with **no horizontal scroll**. Opening search
  expands the field across tier 1 and **hides the title** (§5.9) — full width, no touch target
  shrinks.
- **Desktop (`lg+`) — one line.** The wide measure fits everything on a single row: **title left ·
  scope centered · search + Filtres right**. The scope keeps its natural-width pills, centered
  between the two flanking groups rather than on their own line, and the open search field is capped
  (`lg:w-80`) so it sits by Filtres instead of stretching. Single-line only starts at `lg` because
  below it there is not enough width for all four groups once the search field is open — hence the
  two-tier fallback rather than a squeezed, wrapping scope.

The screen **title** (`Exercices`, §3) sits at the top-left at both sizes. Switching category snaps
the feed back to the top.

### 5.9 Search — collapsible, global

A secondary retrieval path for known-item lookup. A **magnifier** on the title row expands into a
field on demand (never a permanent bar) so the browse-first, gloved, in-a-hurry path is never taxed
with a typing invitation. The magnifier ⇄ field swap is **instant** (§6). Below `lg` it **hides the
`Exercices` title** and takes the actions row's full width; on `lg+` the title stays and the field
grows inline, **capped** (`lg:w-80`) beside Filtres. Focus follows the swap (§8). When non-empty it
**supersedes the category scope**, matching title + description + tags across the whole catalog (case-
and accent-insensitive). Closing (✕ / `Esc`) clears it; picking a category also exits search.

---

## 6. Motion

| Context                 | Recipe                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Colour / theme change   | `transition-colors duration-300`                                                        |
| Button feedback         | `active:scale-95`                                                                       |
| Card feedback           | `active:scale-[0.98]`                                                                   |
| Category (scope) change | `<Transition mode="out-in">` crossfade + slight `translate-y` (enter 300 / leave 200)   |
| Filter sheet            | slide-up `translate-y` + scrim fade (≈ 300 ms)                                          |
| Pagination              | `<TransitionGroup>` enter `opacity-0 translate-y-4` (500 ms), `move` 300 ms, no `leave` |
| Search open/close       | **instant swap, no animation** — see below                                              |

One transition per intent; never stack.

**No animation on the search swap.** The magnifier ⇄ field toggle (§5.9) changes the row's width,
and cross-fading a swap while the layout snaps reads as a stutter (animating to a flex/`auto` width is
fragile). A crisp instant swap is deliberately preferred over a janky one.

**Reduced motion (hard rule).** Honour the OS `prefers-reduced-motion` setting: a single global switch
in [`main.css`](src/assets/main.css) neutralises every animation/transition above, and JS smooth
scrolls check `matchMedia` too. Motion is reinforcement only — never the sole carrier of a state
change (§8).

---

## 7. Theming

- Driven by OS setting, **never** by a manually toggled `dark` class
- **Default light, high-brightness** — the recommended outdoor mode: a light surface exploits screen
  brightness.
- **Dark** follows `prefers-color-scheme` (OS) for low-light / indoor use. Category hues are shared;
  their tint opacity rises `/10 → dark:/20` to stay visible on dark backgrounds.
- Every neutral token has a `dark:` counterpart.

---

## 8. Accessibility

- **Touch targets** ≥ 44px everywhere (`min-h-11`); 48px comfortable for controls; the primary
  full-width CTA ~52px tall. **One documented exception:** applied-filter chips are a compact
  **`min-h-9` (36px) "chip" tier** — they are *read* far more than tapped (recognising what's active),
  removal is occasional, and the **whole chip** is the tap target (not a tiny ✕). Accepted below the
  44px floor for this secondary, glanceable element only; every *primary* control stays ≥ 44px.
- **Redundant encoding (hard rule):** category = icon + label + colour; level = filled-segment count
  - label. Nothing relies on hue alone. Verify with a grayscale + CVD simulation pass.
- **Contrast:** primary text/actions target AAA (§2.4); never ship below AA.
- **Announced states:** `aria-pressed` (active scope/filter), `aria-busy` + `aria-live` (skeleton),
  `aria-hidden` on decorative SVG/dividers.
- **Focus management:** the collapsible search moves focus with the swap — to the field on open, back
  to the magnifier on close — so keyboard users never land on `<body>` (§5.9).
- **Reduced motion:** `prefers-reduced-motion` is honoured globally (§6) — animation/transition and
  smooth scroll are switched off; nothing relies on motion to convey meaning.

---

## 9. Content

Cards are triage, detail is execution (§5.1 / §5.6). Keep card copy to a title + one teaser line;
full protocol, cues and safety live on the detail page. No filler — every metadata point earns its
place.

---

## 10. ⚠️ Critical constraint — Tailwind v4 JIT

The scanner only generates classes present as **complete static strings**. **Never concatenate**:

```ts
// ❌ invisible to the scanner
:class="'bg-' + category"

// ✅ map each choice to a full static string
const activeClasses: Record<CategoryId, string> = {
  physique:  'bg-physique/10 dark:bg-physique/20 text-physique ring-physique/30',
  technique: 'bg-technique/10 dark:bg-technique/20 text-technique ring-technique/30',
  mental:    'bg-mental/10 dark:bg-mental/20 text-mental ring-mental/30',
};
```

See `iconTint` in [`CategoryScope.vue`](src/components/CategoryScope.vue) and `CATEGORY_TINT`
in [`ExerciseCard.vue`](src/components/ExerciseCard.vue).

---

## 11. Where to add what

| I want to…                        | File                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add / change a token colour       | `@theme` in [`main.css`](src/assets/main.css)                                                                                                                    |
| Add a category (+ icon)           | [`domain/exercise.ts`](src/domain/exercise.ts) `CATEGORIES` + token in `@theme` + a path in [`CategoryIcon.vue`](src/components/CategoryIcon.vue) (the icon map) |
| Create a reusable class (`.card`) | `@layer components` in [`main.css`](src/assets/main.css)                                                                                                         |
| Change a card / chip / gauge      | the relevant component in [`src/components/`](src/components/)                                                                                                   |
| Pick spacing                      | the §4 scale — nearest named step, never arbitrary                                                                                                               |

> **Implementation tracking lives in [`CLAUDE.md`](CLAUDE.md) (§ Tasks), not here.** This document
> is the design source of truth; what is built vs. pending is recorded there. The exercise detail
> page (§5.6) is the main piece specified here but not yet implemented.
