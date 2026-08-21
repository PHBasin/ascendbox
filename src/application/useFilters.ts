// src/application/useFilters.ts
// The sheet's attribute filters (DESIGN §5.5) - duration, level, tags. Multi-select, all independent
// of the category scope. State hoisted to module scope → shared singleton.
import { computed, ref } from 'vue';
import type { Exercise, Level } from '@/domain/exercise';

// Duration buckets: a value is in exactly one. The predicate travels with its id, so there is no
// id → bucket lookup to make (and no non-null assertion to promise it always resolves).
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

const selectedBuckets = ref<DurationBucketId[]>([]);
const selectedLevels = ref<Level[]>([]);
const selectedTags = ref<string[]>([]);

const activeFilterCount = computed(
  () => selectedBuckets.value.length + selectedLevels.value.length + selectedTags.value.length
);

/**
 * The selections, compiled into predicates **once per change** rather than re-read per exercise.
 *
 * They come in two pieces on purpose. The tag facet has to be applied last and separately, because
 * the list of tags the sheet offers is derived from everything *except* itself - that is what stops
 * it proposing options that can only ever return zero results.
 */
const matchesDurationAndLevel = computed<(exercise: Exercise) => boolean>(() => {
  const buckets = DURATION_BUCKETS.filter((bucket) => selectedBuckets.value.includes(bucket.id));
  const levels = new Set<Level>(selectedLevels.value);

  return (exercise) =>
    (buckets.length === 0 || buckets.some((bucket) => bucket.match(exercise.duration))) &&
    (levels.size === 0 || levels.has(exercise.level));
});

const matchesTags = computed<(exercise: Exercise) => boolean>(() => {
  const tags = new Set(selectedTags.value);
  if (tags.size === 0) return () => true;
  return (exercise) => exercise.tags.some((tag) => tags.has(tag));
});

// Reassign rather than mutate, so shallow refs re-evaluate.
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function toggleBucket(id: DurationBucketId): void {
  selectedBuckets.value = toggle(selectedBuckets.value, id);
}

function toggleLevel(level: Level): void {
  selectedLevels.value = toggle(selectedLevels.value, level);
}

function toggleTag(tag: string): void {
  selectedTags.value = toggle(selectedTags.value, tag);
}

// No `resetPage()` here, unlike before: sending the feed home is the façade's single watcher on the
// whole refinement surface. A fourth filter added tomorrow inherits that invariant instead of having
// to remember it.
function resetFilters(): void {
  selectedBuckets.value = [];
  selectedLevels.value = [];
  selectedTags.value = [];
}

export function useFilters() {
  return {
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
  };
}
