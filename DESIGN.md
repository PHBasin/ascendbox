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
6. **Motion guides, never distracts.** Short (150–300 ms), single-purpose transitions; subtle
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

> **Four text tiers only** — primary / body / secondary / muted — plus the on-ink inverse for
> filled controls. Nothing else: a one-off like `dark:text-white` on a title or `dark:text-slate-400`
> on card tags is drift, not a new tier. Primary/secondary darkened one step vs. the previous spec
> (`slate-800`→`slate-900`, `slate-500`→`slate-600`) to hold contrast (§2.4). Error text is the one
> chromatic exception: `rose-600 dark:rose-400`.

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

Anatomy — **title-led**, in two zones split by a rule:

```
[ category ]              ← search only
Title                     ← leads, owns the row; the stretched link (§3)
teaser                    ← the hook; ≤ 71 chars (below)
                          ┐
#tag #tag                 │ metadata block — flat text, 1 line max (§5.4)
────────────────────────  │ border-t
🕐 20 min · ▬▬▬ Avancé  › ┘ status strip: qualify, then go
```

**The status strip groups the two facts you triage on** — how long · how hard. They were split before
(duration top-right, level bottom-right); grouping them puts one question in one place and lets the
title own the full top row. The strip is **identical in both modes**, so nothing shifts between
browsing and search.

**The middot separates; space does not.** A meta row's gap is the Group tier (12, §4) and stays there
— but 12 against the 6 that binds each icon to its text is only 2×, too weak once the gauge's solid
bars grab the adjacent word. The separator does the work a bigger gap would have done off-scale. This
strip holds 2 items and **never wraps**, which is precisely what makes a middot legal here — see the
rule under §5.6.

**The metadata block is pinned as one unit** — tags + rule + strip together (`mt-auto`; the card
stretches to its grid-row height), so the block lands at the same height across a row however long
each teaser runs. Pinning **only** the strip was tried and is wrong: it put the card's slack *inside*
the block, splitting the tags from the rule they belong with. The slack belongs on the
**content↔metadata boundary**, not within either zone.

**The teaser is clamped to 3 lines** (`line-clamp-3`) — a guarantee, not a cut. Measured across the
catalogue, **no entry exceeds 3 lines** at either breakpoint, so today it truncates **nothing**: the
reader pays zero and the card is still bounded. Without it, one long entry — the JSON is hand-authored
and validated nowhere — would silently grow its card and ragged the grid, in production, months later.
**A clamp that never fires is free.** `-2` was tried and cut **68 %** of the catalogue on a phone (29 of
them Mental, whose prose *is* the exercise and has nothing to extract) — the mistake was treating a
layout guarantee as an editorial rule.

**Two numbers for the teaser, two jobs** (measured at the binding width — a 300 px card at 15 px):

| | Chars | Job |
| --- | --- | --- |
| **Target** | **≤ 71** | fits **2 lines** → the title keeps the lead and card height stays stable |
| **Ceiling** | **108** | past it `line-clamp-3` truncates. Writing *to* the ceiling defeats the split: a 3-line teaser outweighs the title **3.4×** and the card is description-led again |

Word wrapping follows **words, not characters** (a 72-char teaser can take 2 lines where an 88-char one
does too), so the target is deliberately conservative and the clamp stays as the guarantee. Do **not**
turn 71 into a validated hard limit: it is an aim, and the clamp already covers the failure.

**Contextual category — no redundancy.** The scope is always exactly one category (§5.2), so a
category badge on every card would merely repeat the active scope. The card therefore **omits it
while browsing** — the title leads. It reappears **only under global search** (§5.9), where results
span categories and the badge disambiguates them (a `showCategory` prop driven by `isSearching`).

**The chevron is the tap affordance — and it is not optional.** The card carries no hover on touch,
the primary device: without a resting mark it looks exactly as static as it did before it became a
link, and the detail page goes undiscovered. A chevron says "this leads somewhere" **without posing as
a control**: the hit area stays the whole card (§1.2, gloves) and no button is nested inside the link.
A per-card **button** is rejected for that reason — making it real would collapse the target from the
whole card to ~44 px, and a `<button>` inside the stretched link is invalid anyway.

**All card metadata is _flat_** — icon + text, **no fill/border** (duration, tags). A card is pure
information, so nothing on it may wear the elevated/filled _pill_ form the system reserves for
**controls** (§1.5). Filled/bordered pills appear only on interactive surfaces (scope bar, filter
sheet options, applied-filter chips, buttons). This keeps "data vs. action" readable at a glance.

**Feed layout.** The cards sit in a **responsive grid** — `max-w-7xl mx-auto px-6 lg:px-8 py-6
lg:py-8`, `grid gap-6`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`: **one column on the phone**
(thumb-first, §1.2), two from `sm` (kills the tablet dead zone), three on desktop. The header (§5.8) shares the same `max-w-7xl` measure, so its edges line up
with the grid's outer columns.

### 5.2 Category scope bar — `CategoryScope`

Persistent, sticky, single-select navigation across the **3 categories** (defaults to Physique),
kept **out of the filter sheet** as the primary _scope_ rather than an attribute. Only 3 values →
cheap to keep visible, and it is the coach's most frequent entry point. No `Tous` / all-categories
option today — scope is always exactly one category.

**Natural-width pills — never a scroll, never a clipped label.** Each pill is sized to its own label
(`flex-none`), so the longest word (`Technique`) is **always shown in full** — no `truncate` anywhere.
A **label is meaning, not decoration**: a clipped `Techniq…` fails the redundant-encoding rule (§2.1),
so equal-width columns (which force the widest label to truncate) are rejected here.

**Left when the scope owns a row; centered when it _is_ the middle of one.**

- **Below `lg`** the scope has its **own full-width row**, so it aligns `justify-start` — on the exact
  same left rail as the cards below it (measured: both at x=24). Centering it there made it *float*:
  the only element in the app off the rail that the title, the cards and their titles all share, with
  no counterweight to justify the position. A wrapped pill (≤ 360 px) then also lands **under the
  first one** instead of orphaned mid-row.
- **At `lg`+** it is the middle term of `title · scope · actions`, centered by HeaderToolbar's two
  `flex-1` flanks — a real triptych, not a floating element. (`justify-*` on the nav is a no-op there:
  it is content-width.)

> Alignment is the cheapest layout principle there is: a fixed left anchor is found without searching,
> which is what a gloved, in-a-hurry glance needs. Centering is for elements that have two flanks.

- **Phone (`< sm`):** `text-sm`, 16 px icon, `px-3`. The three fit **one line at ~390 px** (the
  target) and **wrap to a second line (`flex-wrap`) on narrower phones** — full labels on two lines
  beat a cut label on one.
- **`sm+`:** the label grows to the `text-base → lg:text-lg` title size (§3, the size that links the
  scope to the card titles), `px-4`. There is room for one line.

- **Active**: **solid ink fill** — `bg-slate-900 text-white` (inverted `dark:bg-slate-50
dark:text-slate-900`). Chosen over a category tint so the active state clears AAA and never relies
  on hue (§2.4); the label already identifies the category.
- **Inactive**: `bg-slate-100 text-slate-600` with a **visible border** `ring-slate-200
  dark:ring-slate-700`, `hover:bg-slate-200`, the icon (from `sm+`) category-tinted as reinforcement.
  The border is shared with the search/`Filtres` buttons so the whole header reads as one family of
  pills; the recessed `slate-100` fill (vs the actions' white surface) still marks it as an
  *unselected toggle* rather than a standalone action.
- Always `ring-1` to avoid a layout jump between states.
- **Asymmetric transition (§6).** *Selecting* fills over **300 ms** — the pill is the tapped target,
  so the fill confirms the action where the eye already is. *Deselecting* recedes over **150 ms** — it
  is a by-product of another action (opening search, or picking another axis), so it must **not pull
  the eye** from where the user is now looking (the field, the new pill). Implemented with the
  **arrival state's** `duration-*` (CSS uses the destination style's timing): `duration-300` on the
  active class, `duration-150` on the inactive one.
- **In search mode** (the field is open — see §5.9): search **supersedes the scope**, so no category
  is the active axis — **every pill reads inactive** (`aria-pressed=false`). This matches the feed,
  which spans the **whole catalogue** in search mode (empty query = all exercises, typing narrows), so
  a highlighted pill would misrepresent it. The pills **stay tappable**: one tap re-selects that
  category and exits search mode (`setCategory` → `closeSearch`), so the scope is a **one-tap return
  to per-category browsing**. `activeCategory` is never cleared, so nothing is lost. Driven by the
  `searching` prop bound to `searchOpen` (the mode), **not** by whether a term is typed — opening the
  field is itself the switch to whole-catalogue browsing.

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

**On a card, tags never exceed one line** — and the guarantee is **CSS, not a count**: `flex-wrap` +
`max-h-[1lh]` + `overflow-hidden`. A tag that does not fit moves to a second row that is clipped
*whole*; `flex-nowrap` would clip mid-word instead ("#lect"). A cap on the *number* of tags cannot
promise a line — three short tags fit where two long ones would not — so the `slice(0, 3)` in
`ExerciseCard` is only a sane default (3 = the widest entry in the catalogue, so it truncates nothing
today), never the promise.

> **`lh` gotcha:** the unit resolves against the element's **own** line-height, so the list must carry
> `text-xs` itself. Inheriting the parent's 24 px let half a second row through and clipped tags in
> two — invisible in the current catalogue (no entry wraps), which is exactly why it was caught by a
> stress test with long tags rather than by looking.

> **A previous `slice(0, 2)` cited "DESIGN §5.1" for a rule §5.1 never contained** — it hid a tag on
> one exercise (`Visualisation au Sol`) for no stated reason. If a limit is worth having, it is worth
> writing down here; a comment citing a phantom rule is how a system rots.

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

Master-detail: full protocol, big text, execution focus. Route `/exercice/:id` (**hash** history —
GitHub Pages is a static host, so `#` keeps deep links working on a cold hit with no server rewrite).

Anatomy: back nav · category (icon+label) · title · **instructions** · **stat strip** (Durée · Niveau
gauge · Matériel) · **Déroulé** as numeric tiles (reps / sets / rest / hold) · **Sécurité** callout
(distinct surface) · tags.

**The detail shows `instructions`, never the card's `teaser`.** The coach read the teaser on the card
and tapped *because of it* — echoing it here would spend the page's most valuable line saying
something already known (the same rule as the contextual category, §5.1). The split is what lets each
be right: the teaser stays a short hook (≤ 71 chars, §5.1) while `instructions` has room for the real
how-to. It also rescues **Mental** exercises, whose instruction *is* irreducible prose (median 95
chars, nothing extractable into `protocol`) — they were the ones a short-teaser rule would have
mutilated.

**Every section below the title is optional and self-hiding.** The detail fields (`protocol`,
`equipment`, `instructions`, `safety` — see `Exercise`) are all optional: the catalogue is filled in
incrementally
and a gap is legitimate (not every exercise has a rep scheme or a safety warning). A section renders
only when its data exists; a missing field must be a **non-event**, never an empty shell and never a
crash. An exercise with no detail data at all still renders a valid page (nav · category · title ·
teaser · stat strip · tags).

> **No `coach cues` section.** Dropped from the spec: the coaching intent already lives in the
> exercise `description`, and a per-exercise cue list would be 100 pieces of prose to author for
> marginal gain over it. Reinstate only if the description proves insufficient in the field.

> **v1 is read-only — no sticky footer.** The `Démarrer` primary action and the "save to session"
> secondary are **out of scope**: neither has any defined behaviour anywhere in the product, and a
> button that does nothing is worse than no button (§1.5 — a control must look like what it does).
> Re-introduce a footer only once the action it triggers actually exists.

**Measure: `max-w-3xl`, not the feed's `max-w-7xl`.** This page is *read*, not scanned as a grid; a
1280 px line length is unreadable. The sticky back nav shares the same measure so the edges line up
(§5.8). The nav **is sticky** — the page runs long and the coach must be able to bail out from any
scroll position without hunting; same opaque treatment as the feed bar, never frosted (§5.8).

**The `Déroulé` is the hero, not the prose.** The coach opens this standing at the wall, in a hurry:
what they came for is *what to execute*. Figures are `text-3xl lg:text-4xl` — readable at arm's
length — over an eyebrow label (§3). Tiles **grow to fill the row but are capped** (`sm:flex-1
sm:max-w-64`): 3–4 divide it evenly, 1–2 keep a sane size and pack left rather than stretching a lone
figure across half the page. A fixed 4-column grid was rejected — it leaves a hole whenever a figure
is absent, and absent is the norm. Phones keep 2 columns (4 across 390 px kills the glance).

**A separator only belongs in a row that cannot wrap.** — *general rule, learned the hard way.* In a
wrapping row a middot always orphans: it trails the last line or leads the next, and no CSS reaches
it. So the **stat strip stacks below `sm`** (one fact per line — a spec sheet reads well that way, and
a stacked list needs no separator) and becomes **a single row with middots from `sm`**, where all
three items fit (verified at 640 px, the narrowest `sm`, with the worst case of 3 items). Never
negotiate with the wrap — remove it. The card's strip (§5.1) earns its middots the same way: 2 items,
never wraps.

**Durations are rendered in the unit a coach says out loud**, not the unit they are stored in:
`restSec: 180` → **"3 min"**, `90` → **"1 min 30"**, `< 60` → **"7 s"**. Storage stays unambiguous
(`restSec`/`holdSec` — see `Protocol`); the display is translated.

**The `Sécurité` callout must be unmissable — but never by hue alone (§1.3).** The warning icon **and**
the explicit `Sécurité` heading carry the meaning; the rose surface only reinforces, so it survives a
grayscale test. The body text stays slate rather than rose: rose is reserved for error text (§2.2) and
a long warning must stay comfortably readable.

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
  category scope on its own full-width line — natural-width pills, **left-aligned on the card rail**
  (§5.2), that wrap rather than
  clip on the narrowest phones (§5.2) — always fully visible with **no horizontal scroll**. Opening search
  expands the field across tier 1 and **hides the title** (§5.9) — full width, no touch target
  shrinks.
- **Desktop (`lg+`) — one line.** The wide measure fits everything on a single row: **title left ·
  scope centered · search + Filtres right**. The scope keeps its natural-width pills, centered
  between the two flanking groups rather than on their own line, and the open search field is capped
  (`sm:w-80`, §5.9) so it sits by Filtres instead of stretching. Single-line only starts at `lg` because
  below it there is not enough width for all four groups once the search field is open — hence the
  two-tier fallback rather than a squeezed, wrapping scope.

The screen **title** (`Exercices`, §3) sits at the top-left at both sizes. Switching category snaps
the feed back to the top.

### 5.9 Search — collapsible, global

A secondary retrieval path for known-item lookup. A **magnifier** on the title row expands into a
field on demand (never a permanent bar) so the browse-first, gloved, in-a-hurry path is never taxed
with a typing invitation. The magnifier ⇄ field swap is **instant** (§6). The full-width takeover —
**hide the `Exercices` title** and fill the actions row — is reserved for **phones (`< sm`)**, where
space is genuinely tight. From `sm` up (tablet **and** desktop) the title **stays** and the field is
**capped** (`sm:w-80`) inline beside Filtres, so a tablet never gets a ~600 px half-empty field.
Focus follows the swap (§8). **Opening the field is itself a mode switch** — it **supersedes the
category scope** and shows the **whole catalogue** (empty query = every exercise, so the field opens
onto all ~100, not a filtered subset); a typed term then narrows it, matching title + description +
tags (case- and accent-insensitive). The scope pills deselect accordingly (§5.2). Closing (✕ / `Esc`)
drops the mode; picking a category also exits search (`setCategory` → `closeSearch`).

---

## 6. Motion

| Context                 | Recipe                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Colour / theme change   | `transition-colors duration-300`                                                        |
| Button feedback         | `active:scale-95`                                                                       |
| Scope pill select ⇄ deselect | **select 300 ms** (direct target) · **deselect 150 ms** (recedes — §5.2), via arrival-state `duration-*` |
| Card feedback           | `active:scale-[0.98]`                                                                   |
| Category (scope) change | `<Transition mode="out-in">` crossfade + slight `translate-y` (150 ms `ease-out` each way) |
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
