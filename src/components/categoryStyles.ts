// src/components/categoryStyles.ts
// Presentation layer: the category palette as Tailwind classes. Kept out of `domain/exercise.ts` on
// purpose - the domain names the piliers, it must not know how they are painted.
//
// **Full static strings, one per category (DESIGN §10).** The v4 JIT scanner only generates class
// names it can read whole in a source file, so these records exist precisely so nothing ever builds
// `'text-' + categoryId`. A shared `.ts` is scanned like any other source, so moving them here costs
// the scanner nothing.
//
// Every channel below is **reinforcement only** (DESIGN §2.1): the icon and the label carry the
// meaning, so each surface survives grayscale and colour-vision differences with nothing lost.
import type { CategoryId } from '@/domain/exercise';

// Icon tint - the card, the scope pills and the detail eyebrow.
export const CATEGORY_TINT: Record<CategoryId, string> = {
  physique: 'text-physique',
  technique: 'text-technique',
  mental: 'text-mental',
};

// The detail page's identity rule (§5.6): a third channel spanning eyebrow + title + objective, so
// the pillar reads as the identity of the whole block rather than a mark next to a word.
export const CATEGORY_RULE: Record<CategoryId, string> = {
  physique: 'bg-physique',
  technique: 'bg-technique',
  mental: 'bg-mental',
};
