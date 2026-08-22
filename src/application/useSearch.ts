// src/application/useSearch.ts
// Search mode (DESIGN §5.2 / §5.9). State hoisted to module scope → shared singleton.
//
// Opening the field is itself a mode switch: it *supersedes* the category scope and spans the whole
// catalogue (an empty field already means "browse everything"); a typed term then narrows it. That is
// why this is application state and not header chrome - it widens what the feed is about.
import { computed, ref } from 'vue';

// Hoisted: `fold` runs once per keystroke *and* once per exercise per catalogue load (the search
// index), so the literal was being recompiled on the one path this file calls expensive.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Case- and accent-insensitive folding. `normalize('NFD')` is the expensive step, which is exactly
 * why the catalogue side of the comparison is folded **once per load** into an index rather than once
 * per keystroke per exercise (see `useExercises.ts`); only the query passes through here on input.
 */
export function fold(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
}

const searchOpen = ref(false);
const searchQuery = ref('');

/** The folded query. `isSearching` = a term is actually typed (drives only the text filter). */
const searchTerm = computed(() => fold(searchQuery.value.trim()));
const isSearching = computed(() => searchTerm.value.length > 0);

function openSearch(): void {
  searchOpen.value = true;
}

/** Leaving search mode: close the field and drop any query, back to the category scope. */
function closeSearch(): void {
  searchOpen.value = false;
  searchQuery.value = '';
}

export function useSearch() {
  return { searchOpen, searchQuery, searchTerm, isSearching, openSearch, closeSearch };
}
