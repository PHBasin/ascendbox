// src/domain/exercise.ts
// Domain: pure business entities & types (no framework/data dependency).

// Single source of truth for the piliers: { technical id (JSON) → displayed label }.
export const CATEGORIES = [
  { id: 'physique', label: 'Physique' },
  { id: 'technique', label: 'Technique' },
  { id: 'mental', label: 'Mental' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type Level = 1 | 2 | 3; // 1 = low, 2 = moderate, 3 = high

// Ordinal level scale, in order (DESIGN §2.3) - `CATEGORIES`' sibling: the other closed vocabulary a
// coach reads. Ordered because the filter sheet renders it as a scale, not a set.
export const LEVELS = [
  { value: 1, label: 'Débutant' },
  { value: 2, label: 'Intermédiaire' },
  { value: 3, label: 'Avancé' },
] as const satisfies ReadonlyArray<{ value: Level; label: string }>;

// Label lookups, *derived* from the two lists above rather than restated. The list is what the UI
// iterates (order is information); the record is what it indexes by id - same words either way, so
// renaming `Débutant` is one edit, not a hunt. Both are one place where a domain value meets the
// word a coach reads: the card's gauge and the detail spec block spend `LEVEL_LABELS`, the card and
// the detail eyebrow spend `CATEGORY_LABELS`.
export const LEVEL_LABELS: Record<Level, string> = Object.fromEntries(
  LEVELS.map((l) => [l.value, l.label])
) as Record<Level, string>;

export const CATEGORY_LABELS: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
) as Record<CategoryId, string>;

// Runtime guards for the two closed vocabularies, derived from the same lists as the labels above.
// `Exercise` is a compile-time promise about a file that is *fetched*, never imported: nothing in the
// type system reaches `exercises.json`. These are what let the data layer check that promise at the
// boundary instead of casting past it - an unknown `categoryId` used to reach `CATEGORY_TINT[bad]`
// and render an untinted icon with no error anywhere.
const CATEGORY_ID_SET: ReadonlySet<string> = new Set<string>(CATEGORIES.map((c) => c.id));
const LEVEL_SET: ReadonlySet<unknown> = new Set<unknown>(LEVELS.map((l) => l.value));

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && CATEGORY_ID_SET.has(value);
}

export function isLevel(value: unknown): value is Level {
  return LEVEL_SET.has(value);
}

/**
 * How to make the exercise harder or easier - the "Adapter" section of the detail page (§5.6).
 *
 * Grouped rather than two root fields because they are one editorial idea: a coach writes both in
 * the same breath and the page renders them as one section. Nesting also keeps the extension cheap —
 * if adaptation ever splits by audience (children are *not* simply "easier"), that is a key here,
 * not a 12th field on `Exercise`.
 */
export interface Variants {
  harder?: string[]; // added handicaps: weight, a removed foothold, eyes closed…
  easier?: string[]; // relief: elastic band, feet on the ground, a shorter hold…
}

export interface Exercise {
  id: number;
  title: string;
  /**
   * Short hook, shown on the **card only** - it exists to help *choose*, not to execute.
   *
   * Two numbers, two jobs (both measured at the binding width - a 300 px card at 15 px, DESIGN §5.1):
   * - **Aim for ≤ 70 chars** - what fits **2 lines**, which is what keeps the card title-led and its
   *   height stable. This is the editorial target.
   * - **100 chars is the hard ceiling** - `line-clamp-3` truncates past it. Writing *to* the ceiling
   *   defeats the point: a 3-line teaser outweighs the title 3.4× and the card goes back to being
   *   description-led, the very thing splitting `teaser` from `instructions` exists to fix.
   *
   * Was named `description` while it did double duty on both surfaces; the split is what lets each
   * one be short *and* complete.
   */
  teaser: string;
  categoryId: CategoryId;
  tags: string[];
  level: Level;
  duration: number; // minutes

  // --- Detail page (DESIGN §5.6). Every field is optional, by design ---
  // The catalogue is authored incrementally, and a gap is legitimate: not every exercise has a
  // rep scheme, needs kit, or carries a safety warning. The detail page renders each section
  // only when its data is present (`v-if`), so a missing field is a non-event, never a crash.
  /**
   * "Objectif" - what the exercise *develops*, in one line. Not the teaser: the teaser says what you
   * do ("Tenir 7 s sur réglette 15 mm"), the objective says what it buys you ("Force maximale des
   * doigts"). Two reads, two surfaces - the same split that separated `teaser` from `instructions`.
   *
   * No character budget, deliberately: `teaser` has one only because `line-clamp-3` truncates it.
   * Nothing clamps this, so a hard limit would be arbitrary rather than a layout guarantee.
   */
  objective?: string;
  equipment?: string[]; // "Matériel"
  /**
   * "Déroulement" - how to execute it, **one bullet per step**. Deliberately not the teaser repeated:
   * the coach already read that on the card, and a detail page must add, not echo (same rule as the
   * contextual category, §5.1).
   *
   * A list rather than prose because this is read standing at the wall, mid-session: a sequence is
   * scanned, a paragraph is not. It also carries the figures that `protocol` used to hold as tiles
   * ("5 séries de 7 s, 3 min de récup") - see the note on its removal in CLAUDE.md.
   */
  instructions?: string[];
  variants?: Variants; // "Adapter"
  safety?: string; // "Sécurité" callout
}
