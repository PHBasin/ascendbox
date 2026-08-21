// src/application/usePagination.ts
// Pagination, and nothing about exercises: it knows a length and a slice, so it can be reasoned
// about - and tested - without a catalogue. `PAGE_SIZE` lives here because this is the only module
// that spends it; the feed's skeleton imports it rather than restating 12 as a second literal.
import { computed, ref } from 'vue';
import type { ComputedRef } from 'vue';

export const PAGE_SIZE = 12;

export interface Pagination<T> {
  /** The mounted slice - only this reaches the DOM. */
  items: ComputedRef<T[]>;
  hasMore: ComputedRef<boolean>;
  loadMore: () => void;
  /** Back to the first page. Any change of scope, filter or search sends the feed home. */
  resetPage: () => void;
}

/**
 * `source` is a getter rather than a `Ref` so the caller can hand over any derived list without
 * committing to how it is stored. Called once at module scope by the façade, which is what keeps the
 * page position a property of the app rather than of whichever component mounted last.
 */
export function createPagination<T>(source: () => readonly T[]): Pagination<T> {
  const visibleCount = ref(PAGE_SIZE);

  const items = computed<T[]>(() => source().slice(0, visibleCount.value));
  const hasMore = computed<boolean>(() => visibleCount.value < source().length);

  function loadMore(): void {
    if (hasMore.value) visibleCount.value += PAGE_SIZE;
  }

  function resetPage(): void {
    visibleCount.value = PAGE_SIZE;
  }

  return { items, hasMore, loadMore, resetPage };
}
