// src/application/useExercises.ts
// Use case / application state. State hoisted to module scope → shared singleton.
import { shallowRef, ref, computed, watch } from 'vue';
import type { Exercise, CategoryId, Level } from '@/domain/exercise';
import { getAllExercises } from '@/data/exerciseRepository';

const PAGE_SIZE = 12;

// Attribute filters (sheet, DESIGN §5.5) — duration buckets, a value is in exactly one.
export type DurationBucketId = 'short' | 'mid' | 'long';
export const DURATION_BUCKETS: ReadonlyArray<{
  id: DurationBucketId;
  label: string;
  match: (min: number) => boolean;
}> = [
  { id: 'short', label: '< 10 min', match: (m) => m < 10 },
  { id: 'mid', label: '10–25 min', match: (m) => m >= 10 && m <= 25 },
  { id: 'long', label: '> 25 min', match: (m) => m > 25 },
];

// Ordinal level scale, in order (DESIGN §2.3).
export const LEVELS: ReadonlyArray<{ value: Level; label: string }> = [
  { value: 1, label: 'Débutant' },
  { value: 2, label: 'Intermédiaire' },
  { value: 3, label: 'Avancé' },
];

// Case- and accent-insensitive folding for search matching.
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// shallowRef: list replaced wholesale, never deep-mutated (no proxy over the 100 objects).
const all = shallowRef<Exercise[]>([]);
const activeCategory = ref<CategoryId>('physique');
const visibleCount = ref(PAGE_SIZE);
const isLoading = ref(true);
const error = ref<string | null>(null);
let started = false;

// Attribute-filter selections (multi-select, all independent of the category scope).
const selectedBuckets = ref<DurationBucketId[]>([]);
const selectedLevels = ref<Level[]>([]);
const selectedTags = ref<string[]>([]);

// Search mode (DESIGN §5.2 / §5.9): opening the field enters a whole-catalogue mode that
// supersedes the category scope — an empty query then shows *every* exercise, and typing narrows
// it (title + teaser + tags — `instructions` is deliberately out: matching prose the card cannot
// show would return results whose match is invisible). It is state, not header chrome, as it widens
// scope, so it lives here. `isSearching` = a term is actually typed (drives only the text filter).
const searchOpen = ref(false);
const searchQuery = ref('');
const searchTerm = computed(() => fold(searchQuery.value.trim()));
const isSearching = computed(() => searchTerm.value.length > 0);

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

// Category scope first — but search mode overrides it, spanning the whole catalog (even before a
// term is typed: an open, empty field already means "browse everything").
const byCategory = computed<Exercise[]>(() =>
  all.value.filter((ex) => ex.categoryId === activeCategory.value)
);
const scoped = computed<Exercise[]>(() => (searchOpen.value ? all.value : byCategory.value));

function inSelectedBucket(duration: number): boolean {
  return selectedBuckets.value.some((id) =>
    DURATION_BUCKETS.find((b) => b.id === id)!.match(duration)
  );
}

// Search text (if any) + attribute filters on top of the scope. Empty selection = no constraint.
const filtered = computed<Exercise[]>(() =>
  scoped.value.filter((ex) => {
    if (
      isSearching.value &&
      !fold(`${ex.title} ${ex.teaser} ${ex.tags.join(' ')}`).includes(searchTerm.value)
    ) {
      return false;
    }
    const okDuration = !selectedBuckets.value.length || inSelectedBucket(ex.duration);
    const okLevel = !selectedLevels.value.length || selectedLevels.value.includes(ex.level);
    const okTags =
      !selectedTags.value.length || ex.tags.some((t) => selectedTags.value.includes(t));
    return okDuration && okLevel && okTags;
  })
);

// Pagination: only the visible slice is mounted into the DOM.
const exercises = computed<Exercise[]>(() => filtered.value.slice(0, visibleCount.value));
const totalCount = computed(() => filtered.value.length);
const hasMore = computed(() => visibleCount.value < filtered.value.length);

// Tags available for the current scope, most-used first (DESIGN §5.5).
const availableTags = computed<string[]>(() => {
  const counts = new Map<string, number>();
  for (const ex of scoped.value) {
    for (const tag of ex.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
});

const activeFilterCount = computed(
  () => selectedBuckets.value.length + selectedLevels.value.length + selectedTags.value.length
);

function resetPage(): void {
  visibleCount.value = PAGE_SIZE; // any scope/filter/search change restarts pagination at the top
}

// Entering/leaving search mode or changing the query restarts pagination at the top.
watch([searchQuery, searchOpen], resetPage);

function loadMore(): void {
  if (hasMore.value) visibleCount.value += PAGE_SIZE;
}

function clearSearch(): void {
  searchQuery.value = '';
}

function openSearch(): void {
  searchOpen.value = true;
}

// Leaving search mode: close the field and drop any query, back to the category scope.
function closeSearch(): void {
  searchOpen.value = false;
  searchQuery.value = '';
}

function setCategory(category: CategoryId): void {
  // Picking an axis is a deliberate exit from search mode (closes the field, clears the query).
  closeSearch();
  if (category === activeCategory.value) {
    resetPage();
    return;
  }
  activeCategory.value = category;
  resetPage();
}

// Toggle helpers reassign the array so shallow refs re-evaluate.
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function toggleBucket(id: DurationBucketId): void {
  selectedBuckets.value = toggle(selectedBuckets.value, id);
  resetPage();
}

function toggleLevel(level: Level): void {
  selectedLevels.value = toggle(selectedLevels.value, level);
  resetPage();
}

function toggleTag(tag: string): void {
  selectedTags.value = toggle(selectedTags.value, tag);
  resetPage();
}

function resetFilters(): void {
  selectedBuckets.value = [];
  selectedLevels.value = [];
  selectedTags.value = [];
  resetPage();
}

// Clears every refinement at once (attribute filters + search mode) — used by the empty state.
function resetAll(): void {
  closeSearch();
  resetFilters();
}

// One exercise, resolved by id against the same cached catalogue (no second request — the repository
// caches for the app's lifetime). `id` is a getter so the view re-resolves if the route param
// changes without remounting.
//
// The three states are deliberately distinct, because a cold deep-link (`/#/exercice/12` opened
// straight from a shared link) mounts the view *before* the catalogue has arrived: "not loaded yet"
// must never be rendered as "no such exercise".
export function useExercise(id: () => number) {
  void load(); // idempotent — a deep-link may be the app's first screen
  const exercise = computed<Exercise | undefined>(() =>
    all.value.find((ex) => ex.id === id())
  );
  const notFound = computed(() => !isLoading.value && !error.value && !exercise.value);
  return { exercise, notFound, isLoading, error };
}

export function useExercises() {
  // Fire-and-forget on first use; `load()` handles its own errors into `error`.
  void load();
  return {
    // scope + data
    activeCategory,
    exercises,
    totalCount,
    hasMore,
    loadMore,
    setCategory,
    isLoading,
    error,
    // search
    searchOpen,
    searchQuery,
    isSearching,
    openSearch,
    closeSearch,
    clearSearch,
    // attribute filters (sheet)
    selectedBuckets,
    selectedLevels,
    selectedTags,
    availableTags,
    activeFilterCount,
    toggleBucket,
    toggleLevel,
    toggleTag,
    resetFilters,
    resetAll,
  };
}
