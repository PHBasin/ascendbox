// src/application/useExercises.ts
// The façade. The four modules beside it each own one piece of state and its transitions; this file
// owns the *composition* - the category scope, the pipeline that turns the catalogue into a page of
// cards, and the single invariant that ties them together.
//
// It is the only place that sees all four at once, which is exactly why `setCategory` lives here:
// picking an axis closes the search, sets the scope and sends the feed home - three modules, one
// gesture. State is at module scope, so every component that calls `useExercises()` shares it.
import { computed, ref, watch } from 'vue';
import type { CategoryId, Exercise } from '@/domain/exercise';
import { loadCatalogue, useCatalogue } from './useCatalogue';
import { useFilters } from './useFilters';
import { createPagination } from './usePagination';
import { fold, useSearch } from './useSearch';

const { all, byId, isLoading, error, retry } = useCatalogue();
const { searchOpen, searchQuery, searchTerm, isSearching, openSearch, closeSearch } = useSearch();
const {
  selectedBuckets,
  selectedLevels,
  selectedTags,
  activeFilterCount,
  matchesDurationAndLevel,
  matchesTags,
  toggleBucket,
  toggleLevel,
  toggleTag,
  resetFilters,
} = useFilters();

const activeCategory = ref<CategoryId>('physique');

/**
 * The search index: every exercise folded **once per catalogue load**, not once per keystroke.
 *
 * The text a search matches - title + teaser + tags - never changes, yet the old pipeline rebuilt a
 * template literal and ran `toLowerCase` + `normalize('NFD')` + a regex over all 123 exercises on
 * every typed character. Only the query is folded on input now; the comparison is a plain `includes`.
 *
 * `instructions` stays out, deliberately: matching prose the card cannot show returns results whose
 * match is invisible.
 */
interface IndexedExercise {
  exercise: Exercise;
  haystack: string;
}

const indexed = computed<IndexedExercise[]>(() =>
  all.value.map((exercise) => ({
    exercise,
    haystack: fold(`${exercise.title} ${exercise.teaser} ${exercise.tags.join(' ')}`),
  }))
);

// --- The pipeline, one stage per concern ---
//
// Four stages rather than one predicate, so a change re-runs only what it invalidates: toggling a
// duration bucket no longer replays the text pass, and typing no longer replays the attribute pass.

// Category scope first - but search mode overrides it, spanning the whole catalogue (even before a
// term is typed: an open, empty field already means "browse everything").
const scoped = computed<IndexedExercise[]>(() =>
  searchOpen.value
    ? indexed.value
    : indexed.value.filter((entry) => entry.exercise.categoryId === activeCategory.value)
);

const searched = computed<IndexedExercise[]>(() =>
  isSearching.value
    ? scoped.value.filter((entry) => entry.haystack.includes(searchTerm.value))
    : scoped.value
);

/** Everything except the tag facet - the set `availableTags` counts, so it can never offer a dead option. */
const beforeTags = computed<IndexedExercise[]>(() =>
  searched.value.filter((entry) => matchesDurationAndLevel.value(entry.exercise))
);

const filtered = computed<Exercise[]>(() =>
  beforeTags.value
    .filter((entry) => matchesTags.value(entry.exercise))
    .map((entry) => entry.exercise)
);

/**
 * Tags offered by the sheet, most-used first (DESIGN §5.5), counted over everything the *other*
 * refinements already allow. Two consequences, both deliberate:
 * - no option that can only ever return zero results (the old list spanned the whole catalogue in
 *   search mode, so the sheet advertised tags the query had already excluded);
 * - a selected tag is always present, even at count 0, so an applied filter never loses the toggle
 *   that would remove it.
 */
const availableTags = computed<string[]>(() => {
  const counts = new Map<string, number>();
  for (const { exercise } of beforeTags.value) {
    for (const tag of exercise.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  for (const tag of selectedTags.value) if (!counts.has(tag)) counts.set(tag, 0);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
});

const { items: exercises, hasMore, loadMore, resetPage } = createPagination(() => filtered.value);
const totalCount = computed(() => filtered.value.length);

/**
 * One watcher for the whole refinement surface, rather than a `resetPage()` remembered at each of the
 * six call sites that used to change it. The invariant - any change of scope, search or filter
 * restarts pagination at the top - is now stated once, and a filter added tomorrow inherits it.
 */
watch(
  [activeCategory, searchOpen, searchQuery, selectedBuckets, selectedLevels, selectedTags],
  resetPage
);

function setCategory(category: CategoryId): void {
  // Picking an axis is a deliberate exit from search mode (closes the field, clears the query).
  closeSearch();
  activeCategory.value = category;
  // Kept even with the watcher above, and load-bearing: assigning a ref its current value does not
  // trigger, so re-tapping the *already active* pill would otherwise do nothing - and that gesture
  // has to send the feed home.
  resetPage();
}

/** Clears every refinement at once (attribute filters + search mode) - used by the empty state. */
function resetAll(): void {
  closeSearch();
  resetFilters();
}

/**
 * One exercise, resolved by id against the same cached catalogue (no second request - the repository
 * caches for the app's lifetime). `id` is a getter so the view re-resolves if the route param changes
 * without remounting; it is read **once** here, not once per candidate as the old linear scan did.
 *
 * The three states are deliberately distinct, because a cold deep-link (`/#/exercice/12` opened
 * straight from a shared link) mounts the view *before* the catalogue has arrived: "not loaded yet"
 * must never be rendered as "no such exercise".
 */
export function useExercise(id: () => number) {
  loadCatalogue(); // idempotent - a deep-link may be the app's first screen
  const exercise = computed<Exercise | undefined>(() => byId.value.get(id()));
  const notFound = computed(() => !isLoading.value && !error.value && !exercise.value);
  return { exercise, notFound, isLoading, error, retry };
}

export function useExercises() {
  loadCatalogue();
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
    retry,
    // search
    searchOpen,
    searchQuery,
    isSearching,
    openSearch,
    closeSearch,
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
