// src/application/plural.ts
// French agreement for counted nouns. Small, but it belongs in one place: the rule was written out
// three times and the three did not agree. Two spelled the plural properly; the `Filtres` badge
// shipped `${n} filtre(s) actif(s)` - and that one is an `aria-label`, so a coach on VoiceOver hears
// the parentheses read out.
//
// Lives in `application/` because that is already the layer that knows the app speaks French:
// `useCatalogue` is where an error `kind` becomes a French sentence.
//
// **French agrees from 2, not from 1** - `0 exercice` and `1 exercice` are both singular, unlike
// English. Hence `count > 1`, never `count !== 1`.

/** The agreement mark for a noun or adjective: `''` below 2, `'s'` from 2. */
export function plural(count: number): string {
  return count > 1 ? 's' : '';
}

/** A counted noun, agreed: `countOf(0, 'exercice')` → `0 exercice`; `countOf(3, …)` → `3 exercices`. */
export function countOf(count: number, noun: string): string {
  return `${String(count)} ${noun}${plural(count)}`;
}
