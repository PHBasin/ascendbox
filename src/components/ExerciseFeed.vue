<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import type { Exercise, CategoryId } from '@/domain/exercise';
import ExerciseCard from './ExerciseCard.vue';
import ResetIcon from './icons/ResetIcon.vue';

const props = defineProps<{
  exercises: Exercise[];
  category: CategoryId;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  // Search mode = field open (feed spans the whole catalogue). Drives the per-card category badge.
  searchMode: boolean;
  // A term is actually typed. Names the empty state ("no result for the search").
  isSearching: boolean;
  hasFilters: boolean;
}>();

const emit = defineEmits<{ loadMore: []; reset: [] }>();

// Name why the feed is empty (search vs filters vs both).
const hasRefinement = computed(() => props.isSearching || props.hasFilters);
const emptyMessage = computed(() => {
  if (props.isSearching && props.hasFilters)
    return 'Aucun exercice ne correspond à la recherche et aux filtres.';
  if (props.isSearching) return 'Aucun exercice ne correspond à la recherche.';
  if (props.hasFilters) return 'Aucun exercice ne correspond aux filtres.';
  return 'Aucun exercice dans cette catégorie.';
});

// One key for every state the feed can be in, so all four cross-fade through the *same* recipe
// (§6). Before, only the category switch animated and the other three cut - including skeleton →
// feed, which is the most-watched moment in the app.
const feedKey = computed(() => {
  if (props.error) return 'error';
  if (props.isLoading) return 'loading';
  if (!props.exercises.length) return 'empty';
  return `list-${props.category}-${props.searchMode}`;
});

// Infinite scroll: we observe a sentinel at the bottom of the list.
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// The ref only exists while `hasMore` renders the sentinel → (re)observe on change.
watch(sentinel, (el) => {
  observer?.disconnect();
  if (!el) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) emit('loadMore');
    },
    { rootMargin: '200px' } // preload before reaching the bottom
  );
  observer.observe(el);
});

onBeforeUnmount(() => observer?.disconnect()); // no leaking listener
</script>

<template>
  <section class="page-gutter max-w-7xl py-6 lg:py-8">
    <!-- One `<Transition>` for every state of the feed - error, skeleton, empty, list - keyed by
         `feedKey`. `mode="out-in"` so the two never overlap while the page height changes under
         them. The inner TransitionGroup animates paginated appends; it has no `leave`, so a
         category switch is carried by this crossfade alone and the two never stack (§6). -->
    <Transition
      mode="out-in"
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div :key="feedKey">
        <!-- Loading error (rose-600/400 clears AA on both themes) -->
        <p v-if="error" class="state-error">
          {{ error }}
        </p>

        <!-- Skeleton: same grid as the feed, shell stays interactive during fetch. -->
        <div
          v-else-if="isLoading"
          class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-live="polite"
        >
          <div v-for="n in 6" :key="n" class="card animate-pulse flex flex-col gap-3">
            <div class="h-6 w-2/3 rounded bg-slate-200 dark:bg-slate-700"></div>
            <div class="flex flex-col gap-2">
              <div class="h-4 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
              <div class="h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <div class="flex gap-2">
              <div class="h-4 w-14 rounded-full bg-slate-200 dark:bg-slate-700"></div>
              <div class="h-4 w-14 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </div>

        <!-- No results -->
        <div v-else-if="!exercises.length" class="state-block">
          <p class="text-slate-600 dark:text-slate-300">
            {{ emptyMessage }}
          </p>
          <button v-if="hasRefinement" type="button" class="btn-ink gap-2" @click="emit('reset')">
            <ResetIcon class="w-4 h-4" />
            Tout réinitialiser
          </button>
        </div>

        <!-- The list. `enter` matches its own `move` (300ms): an append and the reflow it causes
             are one motion, not two that drift apart. No `leave` - removals are instant, so a
             category switch never overlaps the crossfade above (§6). -->
        <template v-else>
          <TransitionGroup
            tag="div"
            class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            move-class="transition-transform duration-300 ease-out"
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-4"
          >
            <ExerciseCard
              v-for="ex in exercises"
              :key="ex.id"
              :exercise="ex"
              :show-category="searchMode"
            />
          </TransitionGroup>

          <!-- Sentinel: triggers loading of the next page -->
          <div v-if="hasMore" ref="sentinel" class="h-8" aria-hidden="true"></div>
        </template>
      </div>
    </Transition>
  </section>
</template>
