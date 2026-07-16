# DESIGN.md — AscendBox Design System

AscendBox is a mobile-first PWA that lets climbing-club coaches browse training exercises.
This document is the **design source of truth** for the UI. Product context (usage environment,
audience) lives in `CLAUDE.md` — the rules here implement it.

> **Technical context** — Vue 3 + Tailwind CSS **v4** (`tailwindcss@next`), _CSS-first_ config in
> [`src/assets/main.css`](src/assets/main.css) via `@theme` (no `tailwind.config.js`). Tokens are
> CSS variables exposed as utilities (`bg-physique`, `text-mental`, …). Read §10 (Tailwind v4 JIT)
> before writing any dynamic class.

Each rule carries its **rationale** so the system can evolve deliberately: change a rule by engaging
its "because," never by overwriting it blind. Update this document in the same move as the code.

---

## 1. Principles

1. **Legibility first.** Readable at arm's length before it is anything else. Contrast and size win
   over subtlety.
2. **Thumb-first.** Single-column feed on mobile (2-/3-column grid on wider screens, §5.1), targets
   ≥ 44px (48px comfortable; the primary full-width CTA ~52px tall), reachable controls, no precision
   gestures.
3. **Never hue alone — always redundant encoding.** Every meaningful signal is carried by at least
   two channels: shape/count/icon **and** text, with colour as reinforcement only. Passes a grayscale
   test.
4. **Recognition over recall.** Active filters, current scope and selected state are always visible;
   the coach never has to remember what they set.
5. **One intent, one component.** Distinct data types get distinct controls; a control looks like what
   it does (action = filled/elevated; information = flat).
6. **Motion guides, never distracts.** Short (150–300 ms), single-purpose transitions; subtle tactile
   feedback (`active:scale`). Never stack animations.

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

> **Redundancy is mandatory.** Physique (rose) and Mental (purple) are adjacent hues that merge for
> protan/deutan users and in glare, so category is **always** rendered _icon + label_ with colour as
> reinforcement — never a bare coloured dot as the sole marker.

Usable as `bg-physique`, `text-technique`, `ring-mental`, with opacity `bg-physique/10`.

### 2.2 Neutrals (Slate scale)

| Usage                              | Light       | Dark        |
| ---------------------------------- | ----------- | ----------- |
| Page background                    | `slate-50`  | `slate-900` |
| Surface (card)                     | `white`     | `slate-800` |
| Border                             | `slate-200` | `slate-700` |
| **Primary text** (titles, headers) | `slate-900` | `slate-50`  |
| **Body text** (card description)   | `slate-700` | `slate-300` |
| **Secondary text** (meta, labels)  | `slate-600` | `slate-300` |
| **Muted** (input icon/placeholder) | `slate-500` | `slate-400` |
| On-ink foreground (active pill/CTA) | `white`    | `slate-900` |
| Inactive chip bg                   | `slate-100` | `slate-800` |

**Four text tiers only** — primary / body / secondary / muted — plus the on-ink inverse for filled
controls. A one-off like `dark:text-white` on a title or `dark:text-slate-400` on card tags is drift,
not a new tier. Error text is the one chromatic exception: `rose-600 dark:rose-400`.

### 2.3 Level scale (`Niveau`)

Each exercise carries a required **level**: `Débutant` (1) · `Intermédiaire` (2) · `Avancé` (3) — an
**ordinal** scale (an échauffement lands in _Débutant_, a max-strength drill in _Avancé_).

Encoding is a **3-segment gauge filled left-to-right, plus the text label** — read from _how many
segments are filled_ and the word, **not** from hue (the old emerald→amber→rose hue meter is dropped;
hue collapses for CVD users).

- Filled segment → `slate-900 dark:slate-50` (ink). Empty → `slate-200 dark:slate-700`.
- The label (`Débutant`/`Intermédiaire`/`Avancé`) is always present next to the gauge.
- An optional semantic accent (`--color-level-*`) may tint the **label** where it clears AAA — never
  the gauge, never as the sole cue.

### 2.4 Contrast targets

| Content                                             | Target                              |
| --------------------------------------------------- | ----------------------------------- |
| Primary text, primary actions                       | **≥ 7:1 (AAA)** wherever achievable |
| Secondary text, borders on surface                  | ≥ 4.5:1 (AA) — never below          |
| Faint tints (`/10`)                                 | decoration only, never meaning      |

---

## 3. Typography

**Family**: `--font-sans: "Inter Variable", "Inter", system-ui, -apple-system, sans-serif` —
**self-hosted** via `@fontsource-variable/inter` (weight axis), imported in
[`main.ts`](src/main.ts). No third-party request; `.woff2` ship from our origin, precached for
offline (latin + latin-ext).

| Role                                          | Classes (base → `lg`)                             |
| --------------------------------------------- | ------------------------------------------------- |
| Screen / hero title                           | `text-2xl lg:text-3xl font-bold tracking-tight`   |
| **Title band** — card titles + scope/Filtres  | `text-base lg:text-lg font-bold` (`sm+`)          |
| Body / description                            | `text-[15px] lg:text-base leading-relaxed`        |
| Meta (category, duration, tags, level)        | `text-xs font-semibold`                           |
| Section eyebrow                               | `text-[11px] font-bold tracking-widest uppercase` |
| Sheet option / chip                           | `text-sm font-medium`                             |

Weight and size carry hierarchy; do not use colour boxes to rank information.

**One title size links the page.** Card titles and the header's scope pills + `Filtres` share the
title size (`text-base → lg:text-lg`), so the scope reads as the same family as the cards it filters.
On the **phone** the scope drops to `text-sm` (Filtres follows) to keep all three axes on one line
(§5.2), re-expressing to the full size from `sm` up. Content roles (hero, title, body) scale one step
at `lg`; meta/eyebrow stay fixed — deliberately small. The base *is* the mobile size; never scale
below it.

---

## 4. Spacing & layout

**4px grid.** Use Tailwind's native scale, one role per named step.

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

Stay on the steps (no `px-5`, `p-[13px]`); same role → same step. The 44px touch target (`min-h-11`)
is an accessibility constraint, **not** a rhythm step (§8).

**Unified rhythm — 4 nested tiers**, read top-down (24 > 20 > 12 > 8) so the interface has rhythm
instead of scattered ad-hoc gaps:

| Tier          | Value            | Sole role                                                        |
| ------------- | ---------------- | ---------------------------------------------------------------- |
| **Page**      | **24** (`-6`, → `lg:-8`=32) | gutter (header **=** feed), gap header↔cards, grid gap |
| **Component** | **20** (`p-5`)   | card / panel padding — one notch under the page, so it reads as a *contained* surface |
| **Group**     | **12** (`-3`)    | title↔copy, meta rows, pill rows, section labels                 |
| **Atom**      | **8** (`-2`)     | icon↔text, tight pairs inside a control                          |

Below the atom, only typographic micro-gaps: title↔teaser `gap-1` (4), gauge segments `gap-0.5` (2).

**icon↔text — two values, by role.** Inside a **control** (scope pills, `Filtres`, sheet reset,
empty-state action) the icon sits at the atom `gap-2` (8). Inside **meta** (`text-xs` — card
category, duration, gauge label, chips) it tightens to `gap-1.5` (6) so the glyph hugs the small
text. Never mix the two within a role.

**Compact "chip" tier.** Applied-filter chips are deliberately small: `min-h-9` (36px), `text-xs`,
`pl-3 pr-2` — read-mostly, tapped occasionally (§8 covers the a11y carve-out). Every *primary* control
stays on the `min-h-11` / `text-sm`+ system.

**Responsive bumps (mobile-first)** — generous on desktop without crowding the phone. Header and feed
share the same horizontal gutter at every breakpoint so their edges stay aligned (§5.8).

| Role                              | Mobile  | up            |
| --------------------------------- | ------- | ------------- |
| Page gutter (header = feed, `px`) | `px-6`  | `lg:px-8`     |
| Feed vertical padding (`py`)      | `py-6`  | `lg:py-8`     |
| Scope pill padding (`px`)         | `px-2`  | `sm:px-4`     |
| Between-control gap               | `gap-2` | `sm:gap-3`    |

The grid gap stays a flat `gap-6` (the page unit) at every size; the filter sheet keeps `p-6`.

**Radii & elevation:** `rounded-3xl` (cards, sheets), `rounded-2xl` (buttons/tiles), `rounded-full`
(chips). **Separation by border + surface contrast, not shadow** — the filter sheet is the one
exception (a soft top shadow to read as an overlay).

---

## 5. Components

### 5.1 `.card` — exercise summary (triage, not execution)

The list is an **index**: it helps _choose_, the detail page helps _execute_ (§5.6). A card shows
identity + key metadata and is **entirely tappable** → opens detail. **No per-card play button** — it
competes with the tap target and implies the wrong model.

```
bg-white dark:bg-slate-800
border border-slate-200 dark:border-slate-700
rounded-3xl p-5            /* component tier — §4 */
active:scale-[0.98] transition-all duration-300
```

Anatomy — **title-led**, two zones split by a rule:

```
[ category ]              ← search only
Title                     ← leads, owns the row; the stretched link (§3)
teaser                    ← the hook; ≤ 71 chars (below)
                          ┐
#tag #tag                 │ metadata block — flat text, 1 line max (§5.4)
────────────────────────  │ border-t
🕐 20 min · ▬▬▬ Avancé  › ┘ status strip: qualify, then go
```

**The status strip groups the two triage facts** — how long · how hard — so one question is answered
in one place and the title owns the full top row. It is identical in both browse and search modes, so
nothing shifts between them.

**The metadata block is pinned as one unit** (`mt-auto` — tags + rule + strip together), so it lands
at the same height across a grid row however long each teaser runs. Pinning only the strip is wrong:
it splits the tags from their rule. The card's slack belongs on the content↔metadata boundary, not
inside either zone.

**The teaser is clamped to 3 lines** (`line-clamp-3`) — a guarantee, not a cut. Measured across the
catalogue nothing exceeds 3 lines, so today it truncates **nothing** while still bounding what a
hand-authored entry can become in production. A clamp that never fires is free. (`-2` was tried and
cut **68%** of the catalogue — many of them Mental, whose prose _is_ the exercise; the mistake was
treating a layout guarantee as an editorial rule.)

**Teaser length — two numbers, two jobs** (measured on a 300px card at 15px):

| | Chars | Job |
| --- | --- | --- |
| **Target** | **≤ 71** | fits **2 lines** → the title keeps the lead, card height stays stable |
| **Ceiling** | **108** | past it `line-clamp-3` truncates; a 3-line teaser outweighs the title ~3.4× and the card reads description-led |

Wrapping follows words, not characters, so the target is deliberately conservative and the clamp is
the real backstop. Do **not** turn 71 into a validated hard limit — it is an aim, and the clamp
already covers the failure.

**Contextual category — no redundancy.** The scope is always exactly one category (§5.2), so a badge
on every card would just repeat it. The card omits it while browsing (title leads) and shows it only
under global search (§5.9), where results span categories and it disambiguates (a `showCategory` prop
driven by `isSearching`).

**The chevron is the tap affordance — and it is not optional.** Touch has no hover, so without a
resting mark the card looks static and the detail page goes undiscovered. A chevron says "this leads
somewhere" without posing as a control — the hit area stays the whole card (§1.2, gloves) and no
button nests inside the stretched link. A real per-card **button** is rejected for that reason: it
would collapse the target to ~44px, and a `<button>` inside a stretched link is invalid anyway.

**All card metadata is _flat_** — icon + text, no fill/border. A card is pure information, so nothing
on it wears the elevated/filled _pill_ form reserved for **controls** (§1.5); those appear only on
interactive surfaces (scope bar, sheet options, chips, buttons). This keeps "data vs. action"
readable at a glance.

**Feed layout.** A responsive grid — `max-w-7xl mx-auto px-6 lg:px-8 py-6 lg:py-8`, `grid gap-6`,
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`: one column on the phone (thumb-first, §1.2), two from
`sm`, three on desktop. The header (§5.8) shares the `max-w-7xl` measure, so its edges line up with
the grid's outer columns.

### 5.2 Category scope bar — `CategoryScope`

Persistent, sticky, single-select navigation across the **3 categories** (defaults to Physique), kept
**out of the filter sheet** as the primary _scope_ rather than an attribute — only 3 values, cheap to
keep visible, and the coach's most frequent entry point. No `Tous` option today; scope is always
exactly one category.

**Phone = pills proportional to their label that fill the row; `sm+` = natural-width pills.** On the
phone (`< sm`) each pill is `flex-auto`: its base width is its own label, then the three share the
leftover space to **fill the row edge to edge**. Proportional, **not** equal thirds — `Technique`
stays wider than `Mental`, so the widest label is never crushed into an equal column. Because the
basis is the content width, nothing truncates until the natural widths genuinely overflow: full labels
**and** icons hold one line down to the **360px target** (`px-2`, 14px icon); a `truncate` guard clips
only **below ~340px**. From `sm` the pills settle to `flex-none` (natural width) and the icon grows to
16px.

> Proportional-fill earns the single line without the equal-column tax: equal thirds force `Technique`
> into the same box as `Mental` and clip it at the target. A clipped `Techniq…` would fail redundant
> encoding (§2.1), so the layout is tuned not to reach it above the phone target.

**Left when the scope owns a row; centered when it _is_ the middle of one.**

- **Below `lg`** the scope has its **own full-width row**. The phone fills it (above), so alignment is
  moot; from `sm` the natural-width pills sit **left-aligned** (`justify-start`) on the same rail as
  the cards and titles (x=24). A lone row has **no flanks** to center against, and the gap to its right
  is the same breathing room the cards leave, counterweighted by the top-right actions.
- **At `lg`+** it is the middle term of `title · scope · actions`, centered by HeaderToolbar's two
  `flex-1` flanks — a real triptych, now genuinely flanked. (`justify-start` on the nav is a no-op
  there: it is content-width.)

> A fixed left anchor is found without searching — what a gloved, in-a-hurry glance needs. Center is
> for elements that have two flanks; anchor the ones that don't.

**Sizing recap.** Phone (`< sm`): `text-sm`, 14px icon, `px-2`, `flex-auto`. From `sm`: `flex-none`,
16px icon, `px-4`, label at the `text-base → lg:text-lg` title size (§3, linking scope to card
titles).

**States.**

- **Active** — **solid ink fill**, `bg-slate-900 text-white` (inverted `dark:bg-slate-50
  dark:text-slate-900`). Ink over a category tint so the active state clears AAA and never leans on hue
  (§2.4); the label already names the category.
- **Inactive** — `bg-slate-100 text-slate-600` with a **visible border** `ring-slate-200
  dark:ring-slate-700`, `hover:bg-slate-200`, and the icon (from `sm+`) category-tinted. The border is
  shared with search/`Filtres` so the header reads as one family; the recessed fill still marks it as
  an unselected toggle rather than a standalone action.
- Always `ring-1`, so there is no layout jump between states.
- **Asymmetric transition (§6).** *Selecting* fills over **300ms** — the tapped target, confirmed
  where the eye is. *Deselecting* recedes over **150ms** — a by-product of another action, so it must
  **not** pull the eye. Implemented via the arrival state's `duration-*`: `duration-300` on active,
  `duration-150` on inactive.
- **Search mode** (field open, §5.9) — search **supersedes the scope**, so every pill reads inactive
  (`aria-pressed=false`), matching a feed that now spans the whole catalogue. Pills stay tappable: one
  tap re-selects that category and exits search (`setCategory` → `closeSearch`). `activeCategory` is
  never cleared, so nothing is lost. Driven by the `searching` prop (the mode), **not** by whether a
  term is typed.

> **Judgement call, not a law.** Keep category persistent _if_ coaches start by picking one, then
> browse. If they instead combine it with the other criteria as equal, movable filters, move it into
> the sheet as a multi-select section — but don't split the difference (never show it in both).

### 5.3 Level gauge

3 segments, `rounded-full`, filled left-to-right where `segment ≤ level`; filled = ink, empty =
`slate-200 dark:slate-700`. Always paired with the text label. (Replaces the old ascending-bar meter.)

### 5.4 Tags — flat metadata, category-independent

On a **card** a tag is plain text: `text-xs font-semibold text-slate-600 dark:text-slate-400`,
prefixed `#`, **no fill, no border**. Tags are information, not controls — they must not wear the
elevated pill form reserved for interactive elements (§1.5, §5.1). A bordered pill reads as tappable
and invites a tap that does nothing; the sheet's tag _pills_ **are** tappable (same shape, opposite
meaning), so the card must not mimic them.

**On a card, tags never exceed one line** — and the guarantee is **CSS, not a count**: `flex-wrap` +
`max-h-[1lh]` + `overflow-hidden` clips an overflowing tag on a whole second row (`flex-nowrap` would
clip mid-word, "#lect"). A cap on the *number* of tags cannot promise a line — three short tags fit
where two long ones do not — so `slice(0, 3)` in `ExerciseCard` is only a sane default (3 = the widest
entry today), never the promise.

> **`lh` gotcha:** the unit resolves against the element's **own** line-height, so the list must carry
> `text-xs` itself. Inheriting the parent's 24px let half a second row through and clipped tags in two
> — invisible in the current catalogue, which is why a long-tag stress test caught it, not the eye.

### 5.5 Filter sheet — secondary refinement

A bottom sheet (thumb zone) opened from a **Filtres** button with an active-count badge. Holds the
_attribute_ filters, each a labelled section with the same tap interaction:

- **Durée** — buckets (`< 10 min` · `10–25 min` · `> 25 min`), multi-select.
- **Niveau** — `Débutant` · `Intermédiaire` · `Avancé`, multi-select.
- **Tags** — most-used first; add an in-sheet search once the list exceeds ~10.

Live feedback: the apply button reads **"Voir N exercices"**. Applied filters also show as **removable
chips** under the scope bar; `Réinitialiser` clears all.

> Category is kept out of the sheet by default (§5.2) — single-select scope vs. multi-select
> attributes. If usage shows it is combined freely with the rest, add it here as a section.

### 5.6 Exercise detail page

Master-detail: full protocol, big text, execution focus. Route `/exercice/:id` (**hash** history —
GitHub Pages is static, so `#` keeps deep links working on a cold hit with no server rewrite).

Anatomy: back nav · category (icon+label) · title · **instructions** · **stat strip** (Durée · Niveau
gauge · Matériel) · **Déroulé** as numeric tiles (reps / sets / rest / hold) · **Sécurité** callout
(distinct surface) · tags.

**The detail shows `instructions`, never the card's `teaser`.** The coach already read the teaser and
tapped because of it, so echoing it here spends the page's most valuable line on something known (same
rule as the contextual category, §5.1). The split lets each be right: the teaser stays a short hook
(≤ 71 chars, §5.1) while `instructions` has room for the real how-to. It also rescues **Mental**
exercises, whose instruction _is_ irreducible prose (median 95 chars, nothing extractable into
`protocol`).

**Every section below the title is optional and self-hiding.** The detail fields (`protocol`,
`equipment`, `instructions`, `safety` — see `Exercise`) are all optional; the catalogue fills in
incrementally and a gap is legitimate. A section renders only when its data exists — a missing field
must be a **non-event**, never an empty shell and never a crash. An exercise with no detail data still
renders a valid page (nav · category · title · teaser · stat strip · tags).

> **v1 is read-only — no sticky footer.** `Démarrer` and "save to session" are out of scope until the
> behaviour behind them exists; a button that does nothing is worse than no button (§1.5). Re-introduce
> a footer only once the action it triggers actually exists.

**Measure: `max-w-3xl`, not the feed's `max-w-7xl`** — this page is *read*, not scanned as a grid, and
a 1280px line length is unreadable. The sticky back nav shares the measure so edges line up (§5.8) and
lets the coach bail out from any scroll position; same opaque treatment as the feed bar, never frosted
(§5.8).

**The `Déroulé` is the hero, not the prose.** The coach opens this at the wall, in a hurry, for *what
to execute*. Figures are `text-3xl lg:text-4xl` over an eyebrow label (§3). Tiles grow to fill the row
but are capped (`sm:flex-1 sm:max-w-64`): 3–4 divide it evenly, 1–2 keep a sane size and pack left
rather than stretching one figure across half the page. A fixed 4-column grid is rejected — it leaves
a hole whenever a figure is absent, and absent is the norm. Phones keep 2 columns (4 across 390px kills
the glance).

> **A separator only belongs in a row that cannot wrap** — general rule, learned the hard way. In a
> wrapping row a middot always orphans (it trails or leads a line and no CSS reaches it). So the stat
> strip **stacks below `sm`** (one fact per line, no separator needed) and becomes **a single row with
> middots from `sm`**, where all three fit (verified at 640px). Never negotiate with the wrap — remove
> it. The card's strip (§5.1) earns its middots the same way: 2 items, never wraps.

**Durations render in the unit a coach says out loud**, not the unit stored: `restSec: 180` → "3 min",
`90` → "1 min 30", `< 60` → "7 s". Storage stays unambiguous (`restSec`/`holdSec`); the display is
translated.

**The `Sécurité` callout must be unmissable — but never by hue alone (§1.3).** The warning icon **and**
the `Sécurité` heading carry the meaning; the rose surface only reinforces, so it survives grayscale.
Body text stays slate: rose is reserved for error text (§2.2), and a long warning must read
comfortably.

### 5.7 Loading skeleton

`animate-pulse` on `slate-200 dark:slate-700` blocks in the card's shape; the shell stays interactive
during `fetch` (`aria-busy` + `aria-live="polite"`).

### 5.8 Sticky filter bar

`sticky top-0 z-30`, reachable while scrolling. **Opaque** ground (`bg-slate-50 dark:bg-slate-900` + a
solid bottom border), **not** translucent/blurred — a frosted-glass effect erodes contrast in direct
sunlight, the primary use context (§1, §2.4). Switching category snaps the feed to the top.

**Layout — same width as the body.** The background is full-bleed, but the controls share the feed
grid's `max-w-7xl mx-auto px-6` measure, so the header's edges line up with the outer card columns.
Within that measure the arrangement follows the feed's breakpoints:

- **Mobile & tablet (`< lg`) — two tiers.** Tier 1 is `[ title · search · Filtres ]`; tier 2 is the
  scope on its own full-width line — on the phone pills proportional to their label that fill the row,
  from `sm` natural-width pills **left-aligned on the card rail** (§5.2), always one line with **no
  horizontal scroll**. Opening search expands the field across tier 1 and **hides the title** (§5.9).
- **Desktop (`lg+`) — one line.** The wide measure fits everything: **title left · scope centered ·
  search + Filtres right**. The scope keeps its natural-width pills, centered between the flanks, and
  the open search field is capped (`sm:w-80`, §5.9) so it sits by Filtres. Single-line only starts at
  `lg` because below it there is not enough width for all four groups once search is open — hence the
  two-tier fallback rather than a squeezed, wrapping scope.

The screen **title** (`Exercices`, §3) sits top-left at both sizes.

### 5.9 Search — collapsible, global

A secondary retrieval path for known-item lookup. A **magnifier** on the title row expands into a
field on demand (never a permanent bar), so the browse-first, gloved, in-a-hurry path is never taxed
with a typing invitation. The magnifier ⇄ field swap is **instant** (§6). The full-width takeover —
hide the `Exercices` title, fill the actions row — is reserved for **phones (`< sm`)** where space is
genuinely tight; from `sm` up the title **stays** and the field is **capped** (`sm:w-80`) inline
beside Filtres, so a tablet never gets a half-empty ~600px field. Focus follows the swap (§8).

**Opening the field is itself a mode switch** — it **supersedes the category scope** and shows the
**whole catalogue** (empty query = every exercise, ~100 of them); a typed term narrows it, matching
title + description + tags (case- and accent-insensitive). The scope pills deselect accordingly
(§5.2). Closing (✕ / `Esc`) drops the mode; picking a category also exits search (`setCategory` →
`closeSearch`).

---

## 6. Motion

| Context                 | Recipe                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Colour / theme change   | `transition-colors duration-300`                                                        |
| Button feedback         | `active:scale-95`                                                                       |
| Scope pill select ⇄ deselect | **select 300ms** (direct target) · **deselect 150ms** (recedes — §5.2), via arrival-state `duration-*` |
| Card feedback           | `active:scale-[0.98]`                                                                   |
| Category (scope) change | `<Transition mode="out-in">` crossfade + slight `translate-y` (150ms `ease-out` each way) |
| Filter sheet            | slide-up `translate-y` + scrim fade (≈ 300ms)                                           |
| Pagination              | `<TransitionGroup>` enter `opacity-0 translate-y-4` (500ms), `move` 300ms, no `leave`   |
| Search open/close       | **instant swap, no animation** (below)                                                   |

One transition per intent; never stack.

**No animation on the search swap.** The magnifier ⇄ field toggle (§5.9) changes the row's width, and
cross-fading while the layout snaps reads as a stutter (animating to a flex/`auto` width is fragile).
A crisp instant swap is deliberately preferred over a janky one.

**Reduced motion (hard rule).** Honour the OS `prefers-reduced-motion`: a single global switch in
[`main.css`](src/assets/main.css) neutralises every animation/transition above, and JS smooth scrolls
check `matchMedia`. Motion is reinforcement only — never the sole carrier of a state change (§8).

---

## 7. Theming

- Driven by the OS setting, **never** by a manually toggled `dark` class.
- **Default light, high-brightness** — the recommended outdoor mode: a light surface exploits screen
  brightness.
- **Dark** follows `prefers-color-scheme` for low-light / indoor use. Category hues are shared; their
  tint opacity rises `/10 → dark:/20` to stay visible on dark backgrounds.
- Every neutral token has a `dark:` counterpart.

---

## 8. Accessibility

- **Touch targets** ≥ 44px everywhere (`min-h-11`); 48px comfortable; the primary full-width CTA
  ~52px. **One documented exception:** applied-filter chips are a compact `min-h-9` (36px) "chip"
  tier — read far more than tapped, removal is occasional, and the **whole chip** is the tap target
  (not a tiny ✕). Every *primary* control stays ≥ 44px.
- **Redundant encoding (hard rule):** category = icon + label + colour; level = filled-segment count +
  label. Nothing relies on hue alone. Verify with a grayscale + CVD pass.
- **Contrast:** primary text/actions target AAA (§2.4); never ship below AA.
- **Announced states:** `aria-pressed` (active scope/filter), `aria-busy` + `aria-live` (skeleton),
  `aria-hidden` on decorative SVG/dividers.
- **Focus management:** the collapsible search moves focus with the swap — to the field on open, back
  to the magnifier on close — so keyboard users never land on `<body>` (§5.9).
- **Reduced motion:** `prefers-reduced-motion` is honoured globally (§6); nothing relies on motion to
  convey meaning.

---

## 9. Content

Cards are triage, detail is execution (§5.1 / §5.6). Keep card copy to a title + one teaser line; full
protocol, cues and safety live on the detail page. No filler — every metadata point earns its place.

---

## 10. ⚠️ Critical constraint — Tailwind v4 JIT

The scanner only generates classes present as **complete static strings**. **Never concatenate** — map
each choice to a full static string instead:

```ts
// ❌ invisible to the scanner
:class="'bg-' + category"

// ✅ full static strings
const activeClasses: Record<CategoryId, string> = {
  physique:  'bg-physique/10 dark:bg-physique/20 text-physique ring-physique/30',
  technique: 'bg-technique/10 dark:bg-technique/20 text-technique ring-technique/30',
  mental:    'bg-mental/10 dark:bg-mental/20 text-mental ring-mental/30',
};
```

See `TINT` in [`CategoryScope.vue`](src/components/CategoryScope.vue) and `CATEGORY_TINT` in
[`ExerciseCard.vue`](src/components/ExerciseCard.vue).

---

## 11. Where to add what

| I want to…                        | File                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add / change a token colour       | `@theme` in [`main.css`](src/assets/main.css)                                                                                                                    |
| Add a category (+ icon)           | [`domain/exercise.ts`](src/domain/exercise.ts) `CATEGORIES` + token in `@theme` + a path in [`CategoryIcon.vue`](src/components/CategoryIcon.vue) (the icon map) |
| Create a reusable class (`.card`) | `@layer components` in [`main.css`](src/assets/main.css)                                                                                                         |
| Change a card / chip / gauge      | the relevant component in [`src/components/`](src/components/)                                                                                                   |
| Pick spacing                      | the §4 scale — nearest named step, never arbitrary                                                                                                               |

> **Implementation tracking lives in [`CLAUDE.md`](CLAUDE.md) (§ Tasks), not here.** This document is
> the design source of truth; what is built vs. pending is recorded there. The exercise detail page
> (§5.6) is the main piece specified here but not yet fully filled in.
