<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import type { Exercise, CategoryId } from '@/domain/exercise';
import { PAGE_SIZE } from '@/application/usePagination';
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

const emit = defineEmits<{ loadMore: []; reset: []; retry: [] }>();

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

// Infinite scroll: we observe a sentinel at the bottom of the list. Without the API there is no
// path to page 2 at all, so the sentinel gives way to a plain button rather than to nothing.
// Feature detection only. The `typeof window !== 'undefined'` half that used to lead this line was
// an SSR guard in an app that mounts to the DOM in `main.ts` and reads `window.matchMedia` unguarded
// in `HomeView` - it protected nothing and implied a rendering mode this app does not have.
const supportsObserver = 'IntersectionObserver' in window;

const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// The ref only exists while `hasMore` renders the sentinel → (re)observe on change.
watch(sentinel, (el) => {
  observer?.disconnect();
  observer = null; // the old instance is spent; keeping the reference only hid that
  if (!el) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) emit('loadMore');
    },
    { rootMargin: '200px' } // preload before reaching the bottom
  );
  observer.observe(el);
});

// An append does not move the sentinel *element*, so the watcher above does not re-run - and an
// IntersectionObserver only reports **transitions**. On a tall viewport the freshly appended page can
// leave the sentinel still inside the 200px margin: no crossing, no callback, and pagination stalls
// until the coach scrolls by hand. Re-observing re-delivers the current state, so the feed keeps
// filling until the sentinel is genuinely off-screen (or `hasMore` unmounts it). `post` so the DOM
// already holds the new cards when we ask.
watch(
  () => props.exercises.length,
  () => {
    const el = sentinel.value;
    if (!observer || !el) return;
    observer.unobserve(el);
    observer.observe(el);
  },
  { flush: 'post' }
);

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
        <!-- Loading error (rose-600/400 clears AA on both themes). A retry, not a dead end: the
             failure this shows is usually a lost signal at the crag, and it clears by itself. Same
             shape as the empty state below, which has always offered its way out. -->
        <div v-if="error" class="state-block">
          <p class="state-error py-0">{{ error }}</p>
          <button type="button" class="btn-ink gap-2" @click="emit('retry')">
            <ResetIcon class="w-4 h-4" />
            Réessayer
          </button>
        </div>

        <!-- Skeleton: same grid as the feed, shell stays interactive during fetch. -->
        <div
          v-else-if="isLoading"
          class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-live="polite"
        >
          <div v-for="n in PAGE_SIZE" :key="n" class="card animate-pulse flex flex-col gap-3">
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
          <div
            v-if="hasMore && supportsObserver"
            ref="sentinel"
            class="h-8"
            aria-hidden="true"
          ></div>
          <!-- No IntersectionObserver (disabled, or an old browser): the only remaining way forward. -->
          <div v-else-if="hasMore" class="pt-8 flex justify-center">
            <button type="button" class="btn-ink" @click="emit('loadMore')">Charger plus</button>
          </div>
        </template>
      </div>
    </Transition>
  </section>
</template>
