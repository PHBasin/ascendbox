// src/application/useExercises.ts
// Use case / application state. State hoisted to module scope → shared singleton.
import { shallowRef, ref, computed } from 'vue';
import type { Exercise, CategoryId } from '@/domain/exercise';
import { getAllExercises } from '@/data/exerciseRepository';

const PAGE_SIZE = 12;

// shallowRef: the list is replaced wholesale, never deep-mutated.
// No recursive proxy over the 100 objects → less memory, no useless reactivity.
const all = shallowRef<Exercise[]>([]);
const activeCategory = ref<CategoryId>('physique');
const visibleCount = ref(PAGE_SIZE);
const isLoading = ref(true);
const error = ref<string | null>(null);
let started = false;

async function load(): Promise<void> {
  if (started) return; // idempotent: a single request for the whole app
  started = true;
  try {
    all.value = await getAllExercises();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    isLoading.value = false;
  }
}

const filtered = computed<Exercise[]>(() =>
  all.value.filter((ex) => ex.categoryId === activeCategory.value)
);

// Pagination: only the visible slice is mounted into the DOM.
const exercises = computed<Exercise[]>(() => filtered.value.slice(0, visibleCount.value));
const totalCount = computed(() => filtered.value.length);
const hasMore = computed(() => visibleCount.value < filtered.value.length);

function loadMore(): void {
  if (hasMore.value) visibleCount.value += PAGE_SIZE;
}

function setCategory(category: CategoryId): void {
  if (category === activeCategory.value) return;
  activeCategory.value = category;
  visibleCount.value = PAGE_SIZE; // reset to the top on every category change
}

export function useExercises() {
  load();
  return {
    activeCategory,
    exercises,
    totalCount,
    hasMore,
    loadMore,
    setCategory,
    isLoading,
    error,
  };
}
