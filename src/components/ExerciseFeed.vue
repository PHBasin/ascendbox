<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import type { Exercise, CategoryId } from '@/domain/exercise';
import ExerciseCard from './ExerciseCard.vue';

const props = defineProps<{
  exercises: Exercise[];
  category: CategoryId;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  isSearching: boolean;
  hasFilters: boolean;
}>();

const emit = defineEmits<{ loadMore: []; reset: [] }>();

// The feed is empty for a reason — name it precisely (search vs filters vs both).
const hasRefinement = computed(() => props.isSearching || props.hasFilters);
const emptyMessage = computed(() => {
  if (props.isSearching && props.hasFilters)
    return 'Aucun exercice ne correspond à la recherche et aux filtres.';
  if (props.isSearching) return 'Aucun exercice ne correspond à la recherche.';
  if (props.hasFilters) return 'Aucun exercice ne correspond aux filtres.';
  return 'Aucun exercice dans cette catégorie.';
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
  <section class="max-w-7xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
    <!-- Loading error (rose-600 clears AA on the light shell, rose-400 on the dark one) -->
    <p v-if="error" class="text-center text-rose-600 dark:text-rose-400 py-12">
      {{ error }}
    </p>

    <!-- Skeleton during the fetch: the shell stays interactive. Same responsive grid
         as the feed so the loading state matches the final layout. -->
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
    <div v-else-if="!exercises.length" class="text-center py-12 flex flex-col items-center gap-3">
      <p class="text-slate-600 dark:text-slate-300">
        {{ emptyMessage }}
      </p>
      <button
        v-if="hasRefinement"
        type="button"
        class="inline-flex items-center gap-2 px-4 min-h-11 rounded-full font-semibold text-sm bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 transition-transform duration-300 active:scale-95"
        @click="emit('reset')"
      >
        <svg
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Tout réinitialiser
      </button>
    </div>

    <!-- Paginated list. Transition (keyed on the pilier) = clean crossfade on
         category change; TransitionGroup inside = animation of the cards
         added by pagination (no `leave` → no overlap). -->
    <Transition
      v-else
      mode="out-in"
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div :key="category">
        <TransitionGroup
          tag="div"
          class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          move-class="transition-transform duration-300"
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 translate-y-4"
        >
          <ExerciseCard v-for="ex in exercises" :key="ex.id" :exercise="ex" />
        </TransitionGroup>

        <!-- Sentinel: triggers loading of the next page -->
        <div v-if="hasMore" ref="sentinel" class="h-8" aria-hidden="true"></div>
      </div>
    </Transition>
  </section>
</template>
