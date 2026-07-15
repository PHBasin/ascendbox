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

// Prescribed protocol — the "Déroulé" tiles of the detail page (DESIGN §5.6).
// Units are spelled out in the field names on purpose: the JSON is hand-authored and `duration`
// is already in minutes, so a bare `rest` would be a unit trap for whoever fills the catalogue.
export interface Protocol {
  reps?: number; // repetitions per set
  sets?: number; // number of sets
  restSec?: number; // rest between sets, in seconds
  holdSec?: number; // hold/contraction time, in seconds
}

export interface Exercise {
  id: number;
  title: string;
  /**
   * Short hook, shown on the **card only** — it exists to help *choose*, not to execute.
   *
   * Two numbers, two jobs (both measured at the binding width — a 300 px card at 15 px, DESIGN §5.1):
   * - **Aim for ≤ 71 chars** — what fits **2 lines**, which is what keeps the card title-led and its
   *   height stable. This is the editorial target.
   * - **108 chars is the hard ceiling** — `line-clamp-3` truncates past it. Writing *to* the ceiling
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
  protocol?: Protocol;
  equipment?: string[]; // "Matériel"
  /**
   * How to actually execute it — the detail page's prose. Deliberately **not** the teaser repeated:
   * the coach already read that on the card, and a detail page must add, not echo (same rule as the
   * contextual category, §5.1). No length budget: this is the surface that has room, which is what
   * frees Mental exercises whose instruction *is* irreducible prose.
   */
  instructions?: string;
  safety?: string; // "Sécurité" callout
}
