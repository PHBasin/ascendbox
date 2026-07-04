<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import type { Exercise, CategoryId } from '@/domain/exercise';
import ExerciseCard from './ExerciseCard.vue';

defineProps<{
  exercises: Exercise[];
  category: CategoryId;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{ loadMore: [] }>();

// Infinite scroll: we observe a sentinel at the bottom of the list.
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// The ref only exists while `hasMore` renders the sentinel → (re)observe on change.
watch(sentinel, (el) => {
  observer?.disconnect();
  if (!el) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) emit('loadMore');
    },
    { rootMargin: '200px' }, // preload before reaching the bottom
  );
  observer.observe(el);
});

onBeforeUnmount(() => observer?.disconnect()); // no leaking listener
</script>

<template>
  <section class="max-w-2xl mx-auto p-6">
    <!-- Loading error -->
    <p v-if="error" class="text-center text-rose-500 py-12">
      {{ error }}
    </p>

    <!-- Skeleton during the fetch: the shell stays interactive -->
    <div
      v-else-if="isLoading"
      class="grid gap-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div v-for="n in 4" :key="n" class="card animate-pulse">
        <div class="h-6 w-2/3 rounded bg-slate-200 dark:bg-slate-700"></div>
        <div class="mt-3 h-4 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
        <div class="mt-2 h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-700"></div>
        <div class="mt-4 flex gap-2">
          <div class="h-4 w-14 rounded-full bg-slate-200 dark:bg-slate-700"></div>
          <div class="h-4 w-14 rounded-full bg-slate-200 dark:bg-slate-700"></div>
        </div>
      </div>
    </div>

    <!-- No results -->
    <p v-else-if="!exercises.length" class="text-center text-slate-400 py-12">
      Aucun exercice pour ce pilier.
    </p>

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
          class="grid gap-6"
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
