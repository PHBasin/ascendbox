# DESIGN.md - AscendBox Design System

AscendBox is a mobile-first PWA that lets climbing-club coaches browse training exercises.
This document is the **design source of truth** for the UI. Product context (usage environment,
audience) lives in [`.claude/CLAUDE.md`](.claude/CLAUDE.md) - the rules here implement it.

> **Technical context** - Vue 3 + Tailwind CSS **v4** (`tailwindcss@next`), _CSS-first_ config in
> [`src/assets/main.css`](src/assets/main.css) via `@theme` (no `tailwind.config.js`). Tokens are
> CSS variables exposed as utilities (`bg-physique`, `text-mental`, …). Read §10 (Tailwind v4 JIT)
> before writing any dynamic class.

Rules carry their **rationale** wherever it still governs a future change: change such a rule by
engaging its "because," never by overwriting it blind. Rationale for a decision already applied and
settled is _not_ kept here - that history lives in git, and a spec that also narrates its own past
stops being scannable. Update this document in the same move as the code.

## Contents

| §                                                                 | What it settles                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| [1. Principles](#1-principles)                                    | the six rules every other section answers to             |
| [2. Colour](#2-foundations---colour)                              | categories, neutrals, the level scale, contrast targets  |
| [3. Typography](#3-typography)                                    | the type scale and what scales with what                 |
| [4. Spacing & layout](#4-spacing--layout)                         | the 4px grid, the five rhythm tiers, radii, separation   |
| [5. Components](#5-components)                                    | card, scope bar, gauge, tags, filter sheet, detail, bars |
| [6. Motion](#6-motion)                                            | three durations, and nothing outside them                |
| [7. Theming](#7-theming)                                          | OS-driven light/dark                                     |
| [8. Accessibility](#8-accessibility)                              | targets, redundant encoding, focus, announcements        |
| [9. Content](#9-content)                                          | what belongs on a card vs. the detail page               |
| [10. Tailwind v4 JIT](#10--critical-constraint---tailwind-v4-jit) | the two constraints that bite silently                   |
| [11. Where to add what](#11-where-to-add-what)                    | the file to open, per kind of change                     |

---

## 1. Principles

1. **Legibility first.** Readable at arm's length before it is anything else. Contrast and size win
   over subtlety.
2. **Thumb-first.** Single-column feed on mobile (2-/3-column grid on wider screens, §5.1), targets
   ≥ 44px (48px comfortable; the primary full-width CTA ~52px tall), reachable controls, no precision
   gestures.
3. **Never hue alone - always redundant encoding.** Every meaningful signal is carried by at least
   two channels: shape/count/icon **and** text, with colour as reinforcement only. Passes a grayscale
   test.
4. **Recognition over recall.** Active filters, current scope and selected state are always visible;
   the coach never has to remember what they set.
5. **One intent, one component.** Distinct data types get distinct controls; a control looks like what
   it does (action = filled/elevated; information = flat).
6. **Motion guides, never distracts.** Three durations, no more (150 / 200 / 300 ms - §6);
   single-purpose transitions; subtle tactile feedback (`active:scale`). Never stack animations.

---

## 2. Foundations - Colour

### 2.1 Categories (navigation, not a filter)

Category is the app's **primary scope** (Physique / Technique / Mental) - mutually exclusive, always
visible. Source of truth: `@theme` in [`main.css`](src/assets/main.css).

| Category      | Token               | Hex       | Base       | Mandatory icon |
| ------------- | ------------------- | --------- | ---------- | -------------- |
| **Physique**  | `--color-physique`  | `#f43f5e` | Rose 500   | dumbbell       |
| **Technique** | `--color-technique` | `#06b6d4` | Cyan 500   | target         |
| **Mental**    | `--color-mental`    | `#a855f7` | Purple 500 | spark          |

> **Redundancy is mandatory.** Physique (rose) and Mental (purple) are adjacent hues that merge for
> protan/deutan users and in glare, so category is **always** rendered _icon + label_ with colour as
> reinforcement - never a bare coloured dot as the sole marker.

Usable as `bg-physique`, `text-technique`, `ring-mental`, with opacity `bg-physique/10`.

### 2.2 Neutrals (Slate scale)

| Usage                               | Light       | Dark        |
| ----------------------------------- | ----------- | ----------- |
| Page background                     | `slate-50`  | `slate-900` |
| Surface (card)                      | `white`     | `slate-800` |
| Border                              | `slate-200` | `slate-700` |
| **Primary text** (titles, headers)  | `slate-900` | `slate-50`  |
| **Body text** (card description)    | `slate-700` | `slate-300` |
| **Secondary text** (meta, labels)   | `slate-600` | `slate-300` |
| **Muted** (input icon/placeholder)  | `slate-500` | `slate-400` |
| On-ink foreground (active pill/CTA) | `white`     | `slate-900` |
| Inactive chip bg                    | `slate-100` | `slate-800` |

**Four text tiers only** - primary / body / secondary / muted - plus the on-ink inverse for filled
controls. A one-off like `dark:text-white` on a title or `dark:text-slate-400` on card tags is drift,
not a new tier. Error text is the one chromatic exception: `rose-600 dark:rose-400`.

### 2.3 Level scale (`Niveau`)

Each exercise carries a required **level**: `Débutant` (1) · `Intermédiaire` (2) · `Avancé` (3) - an
**ordinal** scale (an échauffement lands in _Débutant_, a max-strength drill in _Avancé_).

Encoding is a **3-bar gauge rising left-to-right, plus the text label** - read from _how many bars are
lit_ and the word, **not** from hue (the old emerald→amber→rose hue meter is dropped; hue collapses
for CVD users). Bar **height** ascends with the level, so magnitude is carried by shape as well as by
count - a second non-chromatic channel, free.

- Lit bar → `currentColor`, i.e. it inherits the meta text tier it sits in (`slate-600
dark:slate-300`, §2.2) rather than full ink: the gauge is icon-sized and rides in a meta row, so it
  should read as a sibling of the duration's clock, not as a heavier foreign widget. Dimmed →
  `slate-300 dark:slate-600`.
- **The word is the carrier; the gauge is the accelerator.** `Débutant`/`Intermédiaire`/`Avancé` is
  never omitted. The bars are `aria-hidden` and add nothing a screen reader or a grayscale print
  needs - what they buy is speed when levels are **compared**, since a filled count reads across a
  grid faster than three different words do.
- **So the gauge appears only where levels are scanned side by side** - the card's strip (§5.1). In
  the detail page's spec block (§5.6) there is exactly one level on screen, nothing to compare it
  against, and an icon on one value out of three breaks the block's typographic alignment: there the
  word stands alone. Dropping it costs nothing against §1.3, which polices hue, not glyphs.
- **The scale is achromatic, full stop.** There is no `--color-level-*` token and none is to be
  added: [`main.css`](src/assets/main.css) says so at the point where one would go. Count and word
  carry the level; hue carries nothing.

### 2.4 Contrast targets

| Content                            | Target                              |
| ---------------------------------- | ----------------------------------- |
| Primary text, primary actions      | **≥ 7:1 (AAA)** wherever achievable |
| Secondary text, borders on surface | ≥ 4.5:1 (AA) - never below          |
| Faint tints (`/10`)                | decoration only, never meaning      |

---

## 3. Typography

**Family**: `--font-sans: "Inter Variable", "Inter", system-ui, -apple-system, sans-serif` -
**self-hosted** via `@fontsource-variable/inter` (weight axis), imported in
[`main.ts`](src/main.ts). No third-party request; `.woff2` ship from our origin, precached for
offline (latin + latin-ext).

| Role                                           | Classes (base → `lg`)                             |
| ---------------------------------------------- | ------------------------------------------------- |
| Screen / hero title                            | `text-2xl lg:text-3xl font-bold tracking-tight`   |
| **Title band** - card titles + scope/Filtres   | `text-base lg:text-lg font-bold` (`sm+`)          |
| **Lead / subtitle** - the detail's `objective` | `text-base lg:text-lg leading-relaxed`            |
| Body / description                             | `text-[15px] lg:text-base leading-relaxed`        |
| **Spec value** - the detail's `dd`             | `text-base font-bold` (fixed)                     |
| Meta (category, duration, tags, level)         | `text-xs font-semibold`                           |
| Section eyebrow                                | `text-[11px] font-bold tracking-widest uppercase` |
| Sheet option / chip                            | `text-sm font-medium`                             |
| **Primary action** - the sheet's apply bar     | `text-base lg:text-lg font-bold`                  |
| **Inline action** - `.btn-ink`                 | `text-sm font-semibold`                           |

Weight and size carry hierarchy; do not use colour boxes to rank information.

**An action scales like the title band.** A primary action must never end up smaller than the control
that opened it, so it scales on the same step - otherwise `Filtres` reaches 18px at `lg` while the
`Voir N exercices` confirming it sits at 16px, and the hierarchy inverts. `.btn-ink` stays fixed at
`text-sm` on purpose: it is an inline pill (empty state, back to catalogue), not the primary act of
a surface.

**One title size links the page.** Card titles and the header's scope pills + `Filtres` share the
title size (`text-base → lg:text-lg`), so the scope reads as the same family as the cards it filters.
On the **phone** the scope drops to `text-sm` (Filtres follows) to keep all three axes on one line
(§5.2), re-expressing to the full size from `sm` up. Content roles (hero, title, **lead**, body) scale
one step at `lg`; meta/eyebrow stay fixed - deliberately small. The base _is_ the mobile size; never
scale below it.

**One size _and_ one weight.** The band is `font-bold` in all four of its members - card titles, scope
pills, `Filtres`, the detail's back link. They are the same tier, so they must not differ by weight
either; a stray `font-semibold` draws a hierarchy that is not there.

**The lead sits one step above body, not one below the title.** The detail's `objective` is the line a
coach reads at arm's length before committing to a page (§5.6), so it earns its own row rather than
borrowing the body's.

**The spec value is the one content-ish role that stays fixed, and that is the point.** Scaled to
18px it equals the lead, and the lead is what the coach must read first. `Durée · Niveau · Matériel`
are figures to check, not prose to read - they sit one step under the objective at every width.

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

**Unified rhythm - 4 nested tiers**, read top-down (24 > 20 > 12 > 8) so the interface has rhythm
instead of scattered ad-hoc gaps:

| Tier          | Value                       | Sole role                                                                             |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| **Page**      | **24** (`-6`, → `lg:-8`=32) | gutter (header **=** feed), gap header↔cards, grid gap                                |
| **Component** | **20** (`p-5`)              | card / panel padding - one notch under the page, so it reads as a _contained_ surface |
| **Long-form** | **16** (`-4`)               | structural markers in continuous prose - detail only (§5.6)                           |
| **Group**     | **12** (`-3`)               | title↔copy, meta rows, pill rows, section labels                                      |
| **Atom**      | **8** (`-2`)                | icon↔text, tight pairs inside a control                                               |

Below the atom, only typographic micro-gaps: title↔teaser `gap-1` (4), gauge segments `gap-0.5` (2).

> **The long-form tier is `ExerciseView`'s, and only its** - the category rule beside the identity
> block, the spec grid, and the numbered `instructions` spine (step badge↔text, and step↔step at the
> Component 20). The other four tiers were calibrated on the catalogue, which is a **list**; the
> detail is a **reading surface**, and a numbered badge is neither an icon inside a control (Atom, 8)
> nor a meta glyph (6) - it is a structural marker in continuous prose, and it needs more air than
> either. Conforming it to the other tiers was rendered and rejected: 12 crowds the number against
> its line, 24 stretches the spine until five steps stop reading as one sequence, and the page ends
> up **39px taller**. Do not spend 16 as a gap anywhere else.

**icon↔text - two values, by role.** Inside a **control** (scope pills, `Filtres`, sheet reset,
empty-state action) the icon sits at the atom `gap-2` (8). Inside **meta** (`text-xs` - card
category, duration, gauge label) it tightens to `gap-1.5` (6) so the glyph hugs the small
text. Never mix the two within a role.

**Responsive bumps (mobile-first)** - generous on desktop without crowding the phone. Header and feed
share the same horizontal gutter at every breakpoint so their edges stay aligned (§5.8).

| Role                              | Mobile  | up         |
| --------------------------------- | ------- | ---------- |
| Page gutter (header = feed, `px`) | `px-6`  | `lg:px-8`  |
| Feed vertical padding (`py`)      | `py-6`  | `lg:py-8`  |
| Scope pill padding (`px`)         | `px-2`  | `sm:px-4`  |
| Between-control gap               | `gap-2` | `sm:gap-3` |

The grid gap stays a flat `gap-6` (the page unit) at every size; the filter sheet keeps `p-6`.

**Radii - two, and only two.**

| Radius         | Role                                              |
| -------------- | ------------------------------------------------- |
| `rounded-3xl`  | **surfaces** - cards, the filter sheet            |
| `rounded-full` | **every control** - buttons, pills, chips, fields |

A third step (`rounded-2xl`) is **not** in the system: every control is `rounded-full` and the
codebase contains no `rounded-2xl` at all. Shape therefore never distinguishes one control from
another - size, width and fill do (§5.5).

**Separation by border + surface contrast, not shadow - everywhere, the filter sheet included.** An
overlay earns its edge the same way a card does: its own surface token plus a border. The sheet
carries a soft top shadow on top of that, but as reinforcement only; nothing may rest on it.

> **A surface may never wear the page's own background token.** Painted `bg-slate-50
dark:bg-slate-900`, the sheet measured **1.00:1** against the page behind it in dark mode - the
> same colour, with only its corners to say an overlay was there, and a shadow the colour of its own
> background. On the `.card` surface (`bg-white dark:bg-slate-800`) the gap is **1.22:1**, the delta
> cards already hold. This is why §5.5 spends `.card` on the sheet rather than a page tone.

---

## 5. Components

### 5.1 `.card` - exercise summary (triage, not execution)

The list is an **index**: it helps _choose_, the detail page helps _execute_ (§5.6). A card shows
identity + key metadata and is **entirely tappable** → opens detail. **No per-card play button** - it
competes with the tap target and implies the wrong model.

```
bg-white dark:bg-slate-800
border border-slate-200 dark:border-slate-700
rounded-3xl p-5            /* component tier - §4 */
active:scale-[0.98] transition duration-150 ease-out   /* bare `transition`, never `-all` - §6 */
```

Anatomy - **title-led**, two zones split by a rule:

```
[ category ]              ← search only
Title                     ← leads, owns the row; the stretched link (§3)
teaser                    ← the hook; ≤ 70 chars (below)
                          ┐
#tag #tag                 │ metadata block - flat text, 1 line max (§5.4)
────────────────────────  │ border-t
🕐 20 min · ▬▬▬ Avancé  › ┘ status strip: qualify, then go
```

**The status strip groups the two triage facts** - how long · how hard - so one question is answered
in one place and the title owns the full top row. It is identical in both browse and search modes, so
nothing shifts between them.

**The metadata block is pinned as one unit** (`mt-auto` - tags + rule + strip together), so it lands
at the same height across a grid row however long each teaser runs. Pinning only the strip is wrong:
it splits the tags from their rule. The card's slack belongs on the content↔metadata boundary, not
inside either zone.

**The teaser is clamped to 3 lines** (`line-clamp-3`) - a guarantee, not a cut. It truncates nothing
in the catalogue today while still bounding what a hand-authored entry can become in production; a
clamp that never fires is free. Do not tighten it to `-2` to enforce brevity: that is an editorial
rule wearing a layout guarantee's clothes, and Mental exercises - whose prose _is_ the exercise -
are the ones it cuts.

**Teaser length - think in lines, not characters.** The teaser box is `viewport − 105px`, and real
French prose at 15px Inter measures ~7.1px per character (7.4 worst case in this catalogue). That
gives one usable rule:

> **One line ≈ 35 characters** on a phone. Aim for **two lines**. Never exceed **three**.

|             | Chars    | Job                                                                                                            |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| **Target**  | **≤ 70** | fits **2 lines** → the title keeps the lead, card height stays stable                                          |
| **Ceiling** | **100**  | past it `line-clamp-3` truncates; a 3-line teaser outweighs the title ~3.4× and the card reads description-led |

**The ceiling is the 390px budget** (box 285px ≈ 38 chars/line). **A character count only means
something next to the width it was measured at** - a ceiling stated unconditionally is one that has
not been measured at the narrowest width it has to hold.

**360px is covered, measured rather than assumed.** Rendered at 360 (the common Android width),
**every teaser lands on 2 or 3 lines - none reaches a 4th** (140 at two lines, 9 at
three; at 390 it is 148 and 1). The longest teaser is **84 chars**, with only 4 above the 70 target
and none above 90, so the ceiling of 100 sits well clear of the data at both widths - and it held
through a 26-exercise batch, which is the interesting part: the margin absorbed new content without
re-measuring the ceiling. _Measured 2026-08-22, headless Chromium, whole catalogue._

Note that no character ceiling can _prove_ the clamp holds: wrapping breaks on words, so a 92-char
teaser with long words spills to 4 lines where a 100-char one with short words does not. The number
is a cheap heuristic; the clamp is the guarantee. So do **not** turn 70 into a validated hard limit -
it is an aim, and the clamp already covers the failure. `validate:data` enforces the ceiling as an
error and the target as a warning only, exactly on that reasoning.

**Contextual category - no redundancy.** The scope is always exactly one category (§5.2), so a badge
on every card would just repeat it. The card omits it while browsing (title leads) and shows it only
under global search (§5.9), where results span categories and it disambiguates (a `showCategory` prop
driven by `isSearching`).

**The chevron is the tap affordance - and it is not optional.** Touch has no hover, so without a
resting mark the card looks static and the detail page goes undiscovered. A chevron says "this leads
somewhere" without posing as a control - the hit area stays the whole card (§1.2, gloves) and no
button nests inside the stretched link. A real per-card **button** is rejected for that reason: it
would collapse the target to ~44px, and a `<button>` inside a stretched link is invalid anyway.

**All card metadata is _flat_** - icon + text, no fill/border. A card is pure information, so nothing
on it wears the elevated/filled _pill_ form reserved for **controls** (§1.5); those appear only on
interactive surfaces (scope bar, sheet options, chips, buttons). This keeps "data vs. action"
readable at a glance.

**Feed layout.** A responsive grid - `max-w-7xl mx-auto px-6 lg:px-8 py-6 lg:py-8`, `grid gap-6`,
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`: one column on the phone (thumb-first, §1.2), two from
`sm`, three on desktop. The header (§5.8) shares the `max-w-7xl` measure, so its edges line up with
the grid's outer columns.

### 5.2 Category scope bar - `CategoryScope`

Persistent, sticky, single-select navigation across the **3 categories** (defaults to Physique), kept
**out of the filter sheet** as the primary _scope_ rather than an attribute - only 3 values, cheap to
keep visible, and the coach's most frequent entry point. No `Tous` option today; scope is always
exactly one category.

**Phone = pills proportional to their label that fill the row; `sm+` = natural-width pills.** On the
phone (`< sm`) each pill is `flex-auto`: its base width is its own label, then the three share the
leftover space to **fill the row edge to edge**. Proportional, **not** equal thirds - `Technique`
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
  `flex-1` flanks - a real triptych, now genuinely flanked. (`justify-start` on the nav is a no-op
  there: it is content-width.)

> A fixed left anchor is found without searching - what a gloved, in-a-hurry glance needs. Center is
> for elements that have two flanks; anchor the ones that don't.

**Sizing recap.** Phone (`< sm`): `text-sm`, 14px icon, `px-2`, `flex-auto`. From `sm`: `flex-none`,
16px icon, `px-4`, label at the `text-base → lg:text-lg` title size (§3, linking scope to card
titles).

**States.**

- **Active** - **solid ink fill**, `bg-slate-900 text-white` (inverted `dark:bg-slate-50
dark:text-slate-900`). Ink over a category tint so the active state clears AAA and never leans on hue
  (§2.4); the label already names the category.
- **Inactive** - `bg-slate-100 dark:bg-slate-700 text-slate-600` with a **visible border**
  `ring-slate-200 dark:ring-slate-600`, `hover:bg-slate-200`, and the icon (from `sm+`)
  category-tinted. The border is shared with search/`Filtres` so the header reads as one family; the
  contrasting fill still marks it as an unselected toggle rather than a standalone action.

> **Why the dark fill is `slate-700` and not `slate-800`.** `.toggle-off` is spent on two different
> grounds - the header (`slate-900`) and the filter sheet (`slate-800`, §5.5). `slate-800` sat at
> **1.00:1** on the sheet: the fill disappeared entirely, the same failure §4 documents for the sheet
> itself. `slate-700` holds on both (1.41 on the sheet, 1.72 on the header) with a single token. A
> shared skin has to clear the _worst_ surface it lands on, not the one it was designed against.

- Always `ring-1`, so there is no layout jump between states.
- **Asymmetric transition (§6).** _Selecting_ fills over **300ms** - the tapped target, confirmed
  where the eye is. _Deselecting_ recedes over **150ms** - a by-product of another action, so it must
  **not** pull the eye. Implemented via the arrival state's `duration-*` - `TOGGLE_ON` / `TOGGLE_OFF`
  in [`toggleStyles.ts`](src/components/toggleStyles.ts), which the filter sheet's options import
  too: the asymmetry is the toggle's, not the scope bar's.
- The icon's category tint carries the **same** arrival duration as the pill it sits in. The tint is
  set on the icon, so it needs its own `transition-colors` - without it the hue snapped while the
  fill behind it crossfaded.
- **Search mode** (field open, §5.9) - search **supersedes the scope**, so every pill reads inactive
  (`aria-pressed=false`), matching a feed that now spans the whole catalogue. Pills stay tappable: one
  tap re-selects that category and exits search (`setCategory` → `closeSearch`). `activeCategory` is
  never cleared, so nothing is lost. Driven by the `searching` prop (the mode), **not** by whether a
  term is typed.

> **Judgement call, not a law.** Keep category persistent _if_ coaches start by picking one, then
> browse. If they instead combine it with the other criteria as equal, movable filters, move it into
> the sheet as a multi-select section - but don't split the difference (never show it in both).

### 5.3 Level gauge

An **icon-sized SVG glyph** (`w-3.5 h-3.5`) of 3 ascending bars with round caps, lit where
`bar ≤ level`; lit = `currentColor` (the meta tier it inherits), dimmed = `slate-300 dark:slate-600`.
Drawn as a glyph rather than as laid-out segments so it sits in the card's meta row as a sibling of
the duration's clock. Always paired with the text label, and `aria-hidden` (§2.3).

### 5.4 Tags - flat metadata, category-independent

On a **card** a tag is plain text: `text-xs font-semibold text-slate-600 dark:text-slate-400`,
prefixed `#`, **no fill, no border**. Tags are information, not controls - they must not wear the
elevated pill form reserved for interactive elements (§1.5, §5.1). A bordered pill reads as tappable
and invites a tap that does nothing; the sheet's tag _pills_ **are** tappable (same shape, opposite
meaning), so the card must not mimic them.

**On a card, tags never exceed one line** - and the guarantee is **CSS, not a count**: `flex-wrap` +
`max-h-[1lh]` + `overflow-hidden` clips an overflowing tag on a whole second row (`flex-nowrap` would
clip mid-word, "#lect"). A cap on the _number_ of tags cannot promise a line - three short tags fit
where two long ones do not - so the `slice` in `ExerciseCard` is a DOM backstop, never the promise.

> **Tie the backstop to the layout, not to the catalogue.** It was `slice(0, 3)`, justified as "the
> widest entry today", and the catalogue outgrew it within one release. The number is now **6**,
> deliberately **above** any plausible entry rather than on the current maximum, which is the whole
> point: a backstop pinned to today's data goes stale silently. It has already survived two moves it
> would not have before - a batch that pushed entries to 5 tags, then a rationalisation back down to
> **16 distinct tags and a maximum of 4** (3 exercises). Re-measured 2026-08-22 on the whole catalogue:
> rendering every tag, exactly **one** card clips at 360px (id 121, 4 tags) and none at 390 - which is
> precisely the case `max-h-[1lh]` exists to absorb.

> **`lh` gotcha:** the unit resolves against the element's **own** line-height, so the list must carry
> `text-xs` itself. Inheriting the parent's 24px let half a second row through and clipped tags in two
>
> - invisible in the current catalogue, which is why a long-tag stress test caught it, not the eye.

### 5.5 Filter sheet - secondary refinement

A bottom sheet (thumb zone) opened from a **Filtres** button with an active-count badge. Holds the
_attribute_ filters, each a labelled section with the same tap interaction:

- **Durée** - buckets (`< 10 min` · `10–25 min` · `> 25 min`), multi-select.
- **Niveau** - `Débutant` · `Intermédiaire` · `Avancé`, multi-select.
- **Tags** - most-used first, **ties alphabetical**, all of them, always shown. The tie-break is a
  rule, not a detail: sorting on the count alone left equal counts in first-appearance order within
  the _current_ result set, so toggling a duration bucket reshuffled the options under the thumb, and
  a row that reshuffles under the thumb is harder to re-find than one that holds still.
  **No in-sheet search field**, and the reason
  is the interaction, not the count: a text field to filter chips a coach can already see, on the
  surface this § calls _secondary_ refinement, in a sheet read with gloves on. Typing to reach what
  is one tap away is exactly the tax §5.9 keeps the whole search path collapsed to avoid. The old
  "reintroduce it past ~10 tags" threshold is **withdrawn** - it measured the wrong thing (see the
  height budget below, which a search field would worsen rather than fix).

> **The CTA is reachable by construction, not by the tag count staying small.** The panel is three
> regions - pinned header, scrolling body, pinned footer - so `Voir N exercices` never leaves the
> thumb zone this sheet exists for (§4), whatever the vocabulary does. Measured at 360x780, 390x844,
> 360x480 and 320x568 on the Technique scope (the widest, 15 chips): the CTA sits fully in view at
> every one, with no prior scrolling, while the body absorbs 81 to 469px of overflow.
>
> **This replaced a real defect, and the history is the point.** The panel used to be the scroll
> container itself, so the apply bar scrolled away with the options. At 25 tags it ran 62-218px past
> `max-h-[85vh]` on three scopes of four, putting the primary action below the fold. That was
> answered editorially - the vocabulary was rationalised from 25 to 16 tags, and the overflow went
> with it - which worked, but left the layout depending on a number nobody guarded: six more tags
> would have brought it back. The structural fix retires that dependency.
>
> What the tag count still buys is **scrolling**, not reach: a larger vocabulary means more travel in
> the body, never an unreachable button. A nuisance, no longer a dead end - and one more reason the
> filter-the-filters field (above) stays refused, since it would spend height to solve a problem the
> body already absorbs.

Options wear the same skin as the scope pills (§5.2) - literally: both spend `.toggle-on` /
`.toggle-off` (§11), **and the same timing**, via `TOGGLE_ON` / `TOGGLE_OFF` (§6). The asymmetry
belongs to the toggle, not to the bar it sits in. All three sections carry **one weight**, the
`text-sm font-medium` of §3 - they are the same control three times. The skin classes hold colour
only; weight lives at the call site, so that is where it has to be kept honest.

**Width and vertical anchoring are two rules, on two breakpoints.** Each moves one variable, like the
rest of the responsive - folding both into `lg` once made a single pixel change five things at once.

|          | Below `sm`      | `sm` → `lg`                        | From `lg`       |
| -------- | --------------- | ---------------------------------- | --------------- |
| Width    | full-bleed      | **capped at `max-w-2xl`, centred** | capped, centred |
| Vertical | bottom-anchored | bottom-anchored                    | **centred**     |

So: a full-bleed bottom sheet on a phone, the same 672px card resting on the bottom edge on a
tablet - thumb zone kept - and that card centred on a desktop. The `lg` step is then a vertical
move and nothing else.

**Why 672px, and why from `sm`.** Measured, the content never exceeds **666px at any viewport**, so
past that the panel does not fill space, it manufactures void: 333px of it at 1023px - five times the
63–78px it holds everywhere else - and 1254px at 1920px, under a 1872px-wide apply bar. The cap is
inert below ~672px of viewport, so it costs the low end nothing; it simply starts working the moment
there is more room than the content wants. The panel gains `border-x` once it has side edges, and
keeps square bottom corners until `lg`, since meeting the bottom edge is what reads as a sheet.

Centring uses `inset-0 + m-auto + h-fit`, not `-translate-1/2`, so `transform` stays free for the
enter/leave classes; those carry `lg:` variants of their own, since a full-height slide reads as a
sheet and at `lg` this no longer is one. Being centred rather than full-bleed also leaves the feed
visible around it, which is worth something when filters apply live.

**The ✕ is the one control here with neither fill nor ring, deliberately.** A close is conventionally
edgeless, and having no edge is what separates it from every control that acts on the filters - it
acts only on the panel. (It also rules out `.pill-action`, whose white fill would vanish on a white
sheet.) That edgeless look is `.btn-ghost` (§11), shared with the search field's ✕ (§5.9): the two
closes are one skin, and each keeps its own box.

**Surface.** The sheet takes the `.card` surface (`bg-white dark:bg-slate-800`) plus a top border -
the §4 rule, not an exception to it. It must never wear the page's background token: that is what
left it invisible against the page in dark mode. The white ground also earns back the recessed fill
`.toggle-off` promises (§5.2) - `bg-slate-100` reads at 1.10:1 there against 1.05:1 on `slate-50`,
which is the difference between a subtle recess and none at all.

**The ✕ owns the top-right; the reset does not.** On a sheet, the top-right is the slot convention
reserves for dismissal - and on a phone it is the worst thumb reach on the panel. Putting a
state-destroying `Réinitialiser` there meant a thumb reaching to leave could wipe every filter
instead. So the ✕ lives there permanently (ghost circle, `w-11 h-11`; **not** `.pill-action`, whose
white fill would vanish on a white sheet), and the reset moved down.

**Bottom cluster - stacked on phones, side by side from `sm`.** Secondary left, primary right; the
reset is secondary by weight (ring, no fill) either way, so it never competes with the CTA.

**Primary right, and wider.** Right is the terminal position - where the eye finishes - so it belongs
to the act being confirmed, not to the one that erases. (Put the CTA left and the last thing read,
nearest the ✕'s own corner, becomes the destructive action.) And the row is **not** split evenly: an
even split claims two equal choices, which these are not. The reset takes its natural width, the CTA
takes the rest - **190 / 420px at 1280**, so the widths state the hierarchy the roles already have.

The two also stay **one type step apart at every breakpoint** (14/16, then 16/18): a secondary that
holds still while the primary scales is the same fault as a CTA that holds still while its trigger
scales (§3), one level down - it had already opened the gap to 4px at `lg`.

Stacked, `Effacer les filtres` sits _above_ the apply bar: the sheet is anchored to the bottom edge,
so anything above the CTA leaves it at a constant distance from that edge, while anything below would
shift the primary target every time the reset appears.

> **Where the row starts, and why it is `sm`.** The reset is conditional, so pairing them halves the
> CTA the moment a filter is applied; the breakpoint is where that half still reads as the primary
> action beside the 124px option pills. At 390px it is 165px - **1.3×**, too thin, and the target
> under the thumb shrank because a _different_ button appeared. At 640px it is 290px (**2.3×**),
> already roomier than the 2.5× the `lg` modal itself ships, so the objection has expired. Waiting
> for `lg` would leave tablets a 720–975px apply bar - the slab `max-w-2xl` exists to remove. Set a
> breakpoint where the reason expires, not where the next named device begins.

> **Named for what it clears.** `Effacer les filtres` (sheet) drops the attribute filters;
> `Tout réinitialiser` (the feed's empty state) also drops search mode. The two scopes differ, so the
> two labels must - leaning on the single word "Tout" to carry that distinction gave a coach nothing
> to decode.

Live feedback: the apply button reads **"Voir N exercices"** and is **full-width**, which is
load-bearing rather than decorative - a selected option (`.toggle-on`) wears this exact ink, so once
the radius is shared (§4) width is the only thing left keeping the primary action from reading as one
more filter chip.

> **No applied-filter chips, and that is deliberate.** A row of removable chips under the scope bar
> was built, shipped, and then removed. It rendered a second time state the sheet already owns -
> every selection is `aria-pressed` there - and it did so **inside the sticky bar**, so it was paid
> for on every screen of every scroll. **Measured at 360px** (headless Chromium, 2026-08-22,
> Technique scope): 133px with no filter, **181px** from the first chip, **225px from the third - 29%
> of a 780px viewport** - and 269px at seven. The wrap lands on the third filter because 312px of
> usable gutter hold `Intermédiaire` and one `#tag` and no more, and a level plus two tags is an
> ordinary refinement, not a corner case. A surface this § calls _secondary_ refinement had taken a
> permanent, primary-sized footprint in the one bar that has to stay reachable while scrolling
> (§5.8).
>
> Without the row the bar is **133px flat, at every filter count** - measured at 0, 1, 3 and 7.
>
> **What carries the state instead.** The **count badge on `Filtres`** is sticky and answers the
> question a coach actually has mid-scroll - _am I looking at a filtered catalogue?_ The **sheet**,
> one tap away, answers _which ones_, and that tap lands exactly where they can be changed. The
> feed's own empty state already names filters as the cause and offers `Tout réinitialiser`.
>
> **The cost, accepted:** removing a single filter goes from one tap to two or three. Do not
> reintroduce the row to buy that tap back without re-measuring the bar first - that is the trade
> that created it.

> Category is kept out of the sheet by default (§5.2) - single-select scope vs. multi-select
> attributes. If usage shows it is combined freely with the rest, add it here as a section.

### 5.6 Exercise detail page

Master-detail: full how-to, big text, execution focus. Route `/exercice/:id` (**hash** history -
GitHub Pages is static, so `#` keeps deep links working on a cold hit with no server rewrite).

**The page is a topo, not an article.** A coach at the wall does what a climber does with a guidebook
entry: identify the route, read the spec block, follow the sequence of moves. The page is ordered that
way and each zone is given the form that job needs - an identity block, a spec sheet, a sequence.

Anatomy: back nav · **identity block** (category rule + icon/label · title · objectif) · **spec block**
(Durée · Niveau · Matériel) · **Déroulement** as a numbered spine · **Sécurité** callout (distinct
surface) · **Adapter** (Plus dur / Plus facile) · tags.

Sections are separated on the §4 **Section tier** (`gap-8`); 24px is the container tier and let the
whole page read as one undifferentiated column.

**The category is a rule down the identity block**, not a mark beside a word - it spans eyebrow,
title and objective, so the pillar identifies the block rather than decorating it, and stays legible
at arm's length in sunlight where a 16px icon does not. It is a **third** channel on top of the icon
and the label (§2.1), pure reinforcement: grayscale loses nothing.

> **Exactly one rule closes the record, and it is the spec block's.** Tags carry no rule of their own.
> One there looks right on a full page and breaks an empty one: with no detail data the tags follow
> the spec block directly, and the two borders frame `gap-8` of nothing - a visible empty band, which
> is the shell a missing section must never produce. Caught only by rendering an exercise that has no
> detail data; the seeded ones all looked fine.

**The spec block is a labelled `<dl>` grid**, not a row of icon+value pairs. Labels are the §3 eyebrow
and **visible**, so nothing rides on `sr-only` and no glyph has to be decoded (a dumbbell meaning
"level" is a rebus, not a label). Every value takes the same type - `text-base font-bold`, ink - which
is what makes it read as a spec sheet rather than three unrelated facts; that rule is why the level
drops its gauge here (§2.3). The grid also **retires the middot problem outright**: cells never need
separators, so the block wraps freely at any width. `Matériel` spans the full row below `sm` - it is
the only variable-length fact, and a third of a 360px row leaves it ~4 characters.

**The detail opens on `objective`, never the card's `teaser`.** The coach already read the teaser and
tapped because of it, so echoing it here spends the page's most valuable line on something known (same
rule as the contextual category, §5.1). The two answer different questions - the teaser says _what you
do_ ("Tenir 7 s sur réglette 15 mm"), the objective says _what it buys you_ ("Force maximale des
doigts") - which is what makes the objective the right subtitle. It carries **no character budget**:
`teaser` has one only because `line-clamp-3` truncates it, and nothing clamps this.

It renders as a plain lead paragraph, **without an eyebrow label**: the block already opens with the
category eyebrow, and a second label above one short line reads as noise. A subtitle under a title is
self-evidently the objective.

**Every section below the title is optional and self-hiding.** The detail fields (`objective`,
`equipment`, `instructions`, `variants`, `safety` - see `Exercise`) are all optional; the catalogue
fills in incrementally and a gap is legitimate. A section renders only when its data exists - a missing
field must be a **non-event**, never an empty shell and never a crash. An exercise with no detail data
still renders a valid page (nav · identity block · spec block · tags).

> **v1 is read-only - no sticky footer.** `Démarrer` and "save to session" are out of scope until the
> behaviour behind them exists; a button that does nothing is worse than no button (§1.5). Re-introduce
> a footer only once the action it triggers actually exists.

**Measure: `max-w-3xl`, not the feed's `max-w-7xl`** - this page is _read_, not scanned as a grid, and
a 1280px line length is unreadable. The sticky back nav shares the measure so edges line up (§5.8) and
lets the coach bail out from any scroll position; same opaque treatment as the feed bar, never frosted
(§5.8).

**The `Déroulement` is a list, never a paragraph.** The coach opens this at the wall, in a hurry, for
_what to execute_: a sequence is scanned, prose has to be re-read. One item = one step
(`instructions: string[]`), and the figures live **inside the steps** - "Récupérer 3 minutes complètes
entre les séries", "Alterner : 5 secondes par bras".

**It is the page's signature: a numbered spine.** Ink nodes (`w-8`, `slate-900 dark:slate-50`) joined
by a `w-0.5` rule. The numbering is earned, not decorative - a déroulement _is_ a sequence, so order
is information, and the numbers give a coach a spoken anchor mid-session ("j'en suis à la 3") that a
bullet cannot. The rule binds the steps into one object, which is what someone glancing back down at a
phone re-finds their place in. Nodes are **pure ink**: maximum contrast in sun, no hue to lose to
grayscale or a colour-vision difference (§1.3). The rule is drawn per-step and **hidden on the last** -
one trailing past the final step reads as an unfinished list.

> **Numbered here, bulleted in `Adapter`** - and the difference is the point. Variants are a menu you
> pick from, not a sequence you execute, so numbering them would assert an order that is not there.
> The marker encodes what the content _is_.

> **There is no `protocol` field, and none is to be added.** The numeric `Déroulé` tiles it fed
> (`reps`/`sets`/`restSec`/`holdSec`) broke on real content: `restSec` meant rest between _sets_
> where some exercises need it between _reps_, and nothing could express "5 s **par bras**". A fixed
> vocabulary of four figures cannot describe ~150 hand-authored exercises; a sentence can. Figures
> live in `instructions` prose - the exceptions are the rule here.

**Markers are drawn, not `list-disc`/`list-decimal`.** A native marker inherits the line-height and
drifts off the first line as the item wraps. `Adapter`'s bullets are a `w-1.5` span pinned at `mt-2.5`
to the first line's optical centre; the spine's nodes are pinned the same way, with `pt-1` on the step
text so it centres against the 32px node instead of riding high above it.

> **A separator only belongs in a row that cannot wrap** - general rule, learned the hard way. In a
> wrapping row a middot always orphans (it trails or leads a line and no CSS reaches it). The detail's
> spec block sidesteps this permanently by being a **grid**: cells are bounded by the layout, so no
> separator is needed at any width and there is no wrap left to negotiate with. The card's strip
> (§5.1) earns its middots the other way: 2 short items, guaranteed single-line.

**Durations are written in the unit a coach says out loud** - "3 min", "1 min 30", "7 s", never "180
s". With the figures now living in `instructions` prose, this is an **editorial** rule rather than a
formatting layer: there is no stored unit left to translate at render time.

**The `Sécurité` callout must be unmissable - but never by hue alone (§1.3).** The warning icon **and**
the `Sécurité` heading carry the meaning; the rose surface only reinforces, so it survives grayscale.
Body text stays slate: rose is reserved for error text (§2.2), and a long warning must read
comfortably.

**`Adapter` comes _after_ `Sécurité`, deliberately.** The "Plus dur" column is where a coach adds load
and removes footholds; it must be read once the warning has been, never before it. Two neutral `.card`
blocks, side by side from `sm` and stacked below (two lists across 390px leaves ~4 words per line).

**Direction is carried by the heading _and_ the arrow - never by hue (§1.3).** "Plus dur" (↑) and
"Plus facile" (↓) are plain slate surfaces, so the section survives grayscale and colour-vision
differences with nothing lost. Tinting them green/red would be the obvious move and the wrong one: it
would make the only difference between the two blocks a hue, which §1.3 forbids outright.

**One-sided adaptation is the norm, and renders as one block** - plenty of exercises can be made
easier but not usefully harder. `variants.harder` and `variants.easier` are independently optional and
each block self-hides (§5.6); a lone block keeps its half-width column rather than stretching.

### 5.7 Loading skeleton

`animate-pulse` on `slate-200 dark:slate-700` blocks in the card's shape; the shell stays interactive
during `fetch` (`aria-busy` + `aria-live="polite"`).

It hands over to the feed through the **same** keyed crossfade as every other feed state (§6) - the
most-watched moment in the app, so no branch of the state chain may pop.

**The failure state is not a dead end.** When the load fails, the feed and the detail page both show
`.state-error` copy inside a `.state-block` with a **`Réessayer`** `.btn-ink` - the same shape the
empty state has always had. The shape is the point: the bare message was a terminus, and the failure
it reports is usually a lost signal at the crag, which clears by itself. The copy is French and
chosen from an error `kind`, never a raw `SyntaxError` or an HTTP code (see `useCatalogue`).

### 5.8 Sticky filter bar

`sticky top-0 z-30`, reachable while scrolling. **Opaque** ground (`bg-slate-50 dark:bg-slate-900` + a
solid bottom border), **not** translucent/blurred - a frosted-glass effect erodes contrast in direct
sunlight, the primary use context (§1, §2.4). Switching category snaps the feed to the top.

**Layout - same width as the body.** The background is full-bleed, but the controls share the feed
grid's `max-w-7xl mx-auto px-6` measure, so the header's edges line up with the outer card columns.
Within that measure the arrangement follows the feed's breakpoints:

- **Mobile & tablet (`< lg`) - two tiers.** Tier 1 is `[ title · search · Filtres ]`; tier 2 is the
  scope on its own full-width line - on the phone pills proportional to their label that fill the row,
  from `sm` natural-width pills **left-aligned on the card rail** (§5.2), always one line with **no
  horizontal scroll**. Opening search expands the field across tier 1 and **hides the title** (§5.9).
- **Desktop (`lg+`) - one line.** The wide measure fits everything: **title left · scope centered ·
  search + Filtres right**. The scope keeps its natural-width pills, centered between the flanks, and
  the open search field is capped (`sm:w-56`, §5.9) so it sits by Filtres. Single-line only starts at
  `lg` because below it there is not enough width for all four groups once search is open - hence the
  two-tier fallback rather than a squeezed, wrapping scope.

The screen **title** (`Exercices`, §3) sits top-left at both sizes.

### 5.9 Search - collapsible, global

A secondary retrieval path for known-item lookup. A **magnifier** on the title row expands into a
field on demand (never a permanent bar), so the browse-first, gloved, in-a-hurry path is never taxed
with a typing invitation. The magnifier ⇄ field swap is **instant** (§6). The full-width takeover -
hide the `Exercices` title, fill the actions row - is reserved for **phones (`< sm`)** where space is
genuinely tight; from `sm` up the title **stays** and the field is **capped** (`sm:w-56`) inline
beside Filtres, so a tablet never gets a half-empty ~600px field. Focus follows the swap (§8).

**Opening the field is itself a mode switch** - it **supersedes the category scope** and shows the
**whole catalogue** (empty query = all ~150 exercises); a typed term narrows it, matching
title + teaser + tags (case- and accent-insensitive). The scope pills deselect accordingly
(§5.2). Closing (✕ / `Esc`) drops the mode; picking a category also exits search (`setCategory` →
`closeSearch`).

---

## 6. Motion

**Three crans, and every transition in the app is one of them.** The cran is chosen by _what moves_,
not by which component it is - that is what makes the app feel like one surface.

| Cran               | Means                   | Where                                                                            |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------- |
| **150 `ease-out`** | it changes **in place** | hover, `active:scale-*`, chevron nudge, deselect, category icon tint, theme flip |
| **200 `ease-in`**  | it **leaves**           | every `leave-active-class`: scrim, sheet panel, feed crossfade                   |
| **300 `ease-out`** | a surface **moves in**  | sheet slide-up, card enter, `move-class`, select (fill)                          |

Enter decelerates (`ease-out`), leave accelerates (`ease-in`), and **leave ≤ enter** - an exit should
never outlast the entrance it undoes. No transition ships without an explicit `ease-*`; falling
through to Tailwind's default `ease-in-out` is how four curves accumulated here.

**Two exceptions, and only these two.** The skeleton's `animate-pulse` (2s, §5.7) - it is a
heartbeat, not a transition. And the toggle asymmetry: **select 300ms** (the tapped target, confirmed
where the eye already is) vs **deselect 150ms** (it recedes as a by-product of another action, §5.2),
carried by the arrival state's `duration-*` in `TOGGLE_ON`/`TOGGLE_OFF`
([`toggleStyles.ts`](src/components/toggleStyles.ts)) - shared by the scope bar and the filter
sheet's options, since §5.5 asks them to be the same interaction.

That asymmetry also settles press feedback for free: the duration comes from the state being
_arrived at_, so the only press that means anything - on an **inactive** pill - runs at 150ms.

**`transition`, never `transition-all`.** Bare `transition` covers colour, `transform`, `opacity` and
shadow - the whole vocabulary above - without asking the browser to test every animatable property on
~24 grid cards, and without the layout properties `all` quietly drags in. The corollary matters more
than the rule: **never pair `active:scale-*` with `transition-colors` or `transition-transform`.**
Those lists exclude the very property the other half of the pair animates, so the feedback silently
does nothing - the defect that had spread to seven controls.

**Each surface animates once.** The feed's four states (error · skeleton · empty · list) all cross
through one keyed `<Transition mode="out-in">`; the inner `<TransitionGroup>` has **no `leave`**, so a
category switch is carried by the crossfade alone and the two never stack. Pagination enters on the
same 300ms as its own `move-class`, so an append and the reflow it causes read as one motion.

**Two scroll idioms, deliberately.** A route change jumps (`scrollBehavior` → `{ top: 0 }`): animating
a scroll while the page swaps under it is disorienting. A category switch, same page and feed
replaced, glides (`window.scrollTo({ behavior: 'smooth' })`, reduced-motion-guarded). Different
intents, different idioms - not an inconsistency to unify.

**No animation on the search swap.** The magnifier ⇄ field toggle (§5.9) changes the row's width, and
cross-fading while the layout snaps reads as a stutter (animating to a flex/`auto` width is fragile).
A crisp instant swap is deliberately preferred over a janky one.

**Reduced motion (hard rule).** Honour the OS `prefers-reduced-motion`: a single global switch in
[`main.css`](src/assets/main.css) neutralises every animation/transition above, and JS smooth scrolls
check `matchMedia`. Motion is reinforcement only - never the sole carrier of a state change (§8).

---

## 7. Theming

- Driven by the OS setting, **never** by a manually toggled `dark` class.
- **Default light, high-brightness** - the recommended outdoor mode: a light surface exploits screen
  brightness.
- **Dark** follows `prefers-color-scheme` for low-light / indoor use. Category hues are shared; their
  tint opacity rises `/10 → dark:/20` to stay visible on dark backgrounds.
- Every neutral token has a `dark:` counterpart.

---

## 8. Accessibility

- **Touch targets** ≥ 44px everywhere (`min-h-11`); 48px comfortable; the primary full-width CTA
  ~52px. Every _primary_ control stays ≥ 44px. **A control drawn smaller carries a 44px hit area
  rather than shrinking the target with it:** the search field's ✕ is a 32px circle, because a 44px
  one would crowd a 44px field, so it takes `after:absolute after:-inset-1.5` and the target is 44px
  even where the ink is not. Draw small, tap big - never the reverse.
- **Redundant encoding (hard rule):** category = icon + label + colour; level = filled-segment count +
  label. Nothing relies on hue alone. Verify with a grayscale + CVD pass.
- **Contrast:** primary text/actions target AAA (§2.4); never ship below AA.
- **Announced states:** `aria-pressed` (active scope/filter), `aria-busy` + `aria-live` (skeleton),
  `aria-hidden` on decorative SVG/dividers.
- **The result count is announced, from outside the feed.** `HomeView` holds one
  `role="status" aria-live="polite"` region reporting "N exercices" (or the empty message). It sits
  **outside** the feed's keyed `<Transition>` on purpose: the skeleton's own `aria-live` is destroyed
  by that transition the instant results arrive, so it could only ever announce the wait and never
  the outcome - which left the whole filtering path silent.
- **Focus management:** the collapsible search moves focus with the swap - to the field on open, back
  to the magnifier on close - so keyboard users never land on `<body>` (§5.9). It is driven by a
  watcher on `searchOpen`, not by wrappers around the two buttons, because search also closes by a
  third route: picking a category. The restore fires only when the focused element is the one being
  destroyed, so a mouse tap never yanks focus.
- **A modal traps focus, or it is not modal.** The filter sheet declares `aria-modal="true"`, so it
  owes three things: focus moves into the panel on open, `Tab` stays contained (`useFocusTrap`), and
  focus returns to the invoking control on close. The app root also takes `inert` while it is up -
  without that, `aria-modal` is a label rather than a behaviour and the feed underneath stays
  reachable.
- **A screen title always exists.** Below `sm` the open search field takes the row, but the `h1` goes
  `sr-only`, never `hidden`: a phone is where this app is used, and it was the one viewport left with
  no `h1` in the document at all.
- **Reduced motion:** `prefers-reduced-motion` is honoured globally (§6); nothing relies on motion to
  convey meaning.

---

## 9. Content

Cards are triage, detail is execution (§5.1 / §5.6). Keep card copy to a title + one teaser line; the
objective, the step-by-step, the variants and the safety warning live on the detail page. No filler -
every metadata point earns its place.

---

## 10. ⚠️ Critical constraint - Tailwind v4 JIT

The scanner only generates classes present as **complete static strings**. **Never concatenate** - map
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

See `CATEGORY_TINT` and `CATEGORY_RULE` in
[`categoryStyles.ts`](src/components/categoryStyles.ts) - the one place the category palette is
spelled out. A shared `.ts` is scanned like any other source, so moving the maps out of the three
components that used to each hold a copy costs the scanner nothing.

### 10.1 The other constraint - cascade layers

Tailwind emits `theme` → `base` → `components` → `utilities`, and **a later layer wins outright:
specificity only breaks ties _within_ one layer**. So a shared class in `@layer components` can never
out-rank a utility written at the call site, however specific it is - `!important` is the only lever
that flips it, and it is not one we use.

The consequence has teeth for **state** styles. A `@layer components` class that owns a
`focus:ring-*` is silently defeated by a bare `ring-1` at its own call site: the utility rewrites
`--tw-ring-shadow` in _every_ state, focus included, while the class's `focus:outline-none` keeps
applying - a control with no focus indicator at all. That shipped once, on the toolbar search, and
**no gate caught it**: `type-check`, `lint` and Lighthouse all passed green with the focus ring dead.

So: **a shared class must not own a property its call sites also set through utilities.** Where a
control needs both a resting and a focus treatment of the same property, keep the pair together -
both in the class, or both at the call site - never split across the two layers. Verify a focus
style in a browser by comparing the computed `box-shadow` at rest and on focus; reading the source
cannot tell you which layer won.

---

## 11. Where to add what

| I want to…                        | File                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add / change a token colour       | `@theme` in [`main.css`](src/assets/main.css)                                                                                                                      |
| Add a category (+ icon)           | [`domain/exercise.ts`](src/domain/exercise.ts) `CATEGORIES` + token in `@theme` + a path in [`CategoryIcon.vue`](src/components/CategoryIcon.vue) (the icon map)   |
| Change a category tint / rule     | [`categoryStyles.ts`](src/components/categoryStyles.ts) - never a copy in a component (§10)                                                                        |
| Change the select/deselect timing | [`toggleStyles.ts`](src/components/toggleStyles.ts) - `TOGGLE_ON` / `TOGGLE_OFF`, read by the scope bar **and** the sheet (§6)                                     |
| Rename a level / category label   | [`domain/exercise.ts`](src/domain/exercise.ts) - `LEVELS` / `CATEGORIES`; the label records derive from them                                                       |
| Create a reusable class (`.card`) | `@layer components` in [`main.css`](src/assets/main.css)                                                                                                           |
| Change a card / chip / gauge      | the relevant component in [`src/components/`](src/components/)                                                                                                     |
| Add an icon used in **2+** places | a component in [`src/components/icons/`](src/components/icons/); a single-use glyph stays inline                                                                   |
| Trap focus in a modal surface     | [`useFocusTrap.ts`](src/components/useFocusTrap.ts) - focus in, `Tab` contained, focus restored on close (§8); the caller keeps `inert`, the scroll lock and `Esc` |
| Pick spacing                      | the §4 scale - nearest named step, never arbitrary                                                                                                                 |

**Shared classes** live in `@layer components` in [`main.css`](src/assets/main.css), and are earned
by **repetition**: a look worn in 2+ places becomes a class, a single use stays at its call site -
the same threshold as the icons row above. When the second consumer goes away, the class goes with
it. (A class must also not own a property its call sites set through utilities - §10.1.)

Most of them carry a **skin, never a box** - colour, ring, hover and motion; size, padding and any
deliberate timing stay at the call site. That is the line that keeps two controls sharing a look
without fusing two different controls:

| Class                        | What it is                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `.card`                      | the exercise summary surface (§5.1)                                          |
| `.pill-action`               | a standalone action on a white surface (§5.2) - search, `Filtres`, back      |
| `.toggle-on` / `.toggle-off` | a selected / unselected toggle - scope pills (§5.2) and sheet options (§5.5) |
| `.eyebrow`                   | the small uppercase section label (§5.5, §5.6)                               |
| `.btn-ink`                   | the solid-ink pill CTA - the feed's and detail's reset / back-to-catalogue   |
| `.btn-ghost`                 | the edgeless circular close - the sheet's ✕ (§5.5), the search's ✕ (§5.9)    |
| `.app-bar`                   | the opaque sticky bar chrome - feed header and detail back nav (§5.8)        |
| `.meta-chip`                 | the small inline icon+value label - category badge, duration, gauge (§5.4)   |
| `.state-error`               | the load-failure message - feed and detail (§2.2 keeps rose for error text)  |

**A second, narrower category: repeated layout.** Two classes carry no colour at all and exist
because the _arrangement_ repeats, not the look. They are the stated exception to "never a box", not
a drift from it - and they stay rare on purpose, since a layout class fuses structure, which is
harder to unpick later than a shared colour:

| Class          | What it is                                                                      |
| -------------- | ------------------------------------------------------------------------------- |
| `.page-gutter` | centred measure + the §4 side padding; the `max-w-*` cap stays at the call site |
| `.state-block` | the centred empty / not-found column - message, then an optional action         |

> **Implementation tracking lives in [`CLAUDE.md`](.claude/CLAUDE.md) (§ Tasks), not here.** This
> document is the design source of truth; what is built vs. pending is recorded there. Every surface
> specified above is built. What remains is **content**: as of 2026-08-22, `objective` and
> `instructions` are on **every** exercise, while `equipment` (about a third), `variants` (a quarter)
> and `safety` (a handful) are still partial - so §5.6's self-hiding sections are load-bearing today,
> not a future concern. The current counts live with the tracking, in `CLAUDE.md`, not here.
