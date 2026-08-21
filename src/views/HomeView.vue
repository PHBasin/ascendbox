<script setup lang="ts">
import { computed } from 'vue';
import { useExercises } from '@/application/useExercises';
import type { CategoryId } from '@/domain/exercise';
import CategoryScope from '@/components/CategoryScope.vue';
import HeaderToolbar from '@/components/HeaderToolbar.vue';
import ExerciseFeed from '@/components/ExerciseFeed.vue';

const {
  exercises,
  activeCategory,
  hasMore,
  loadMore,
  setCategory,
  isLoading,
  error,
  searchOpen,
  isSearching,
  activeFilterCount,
  resetAll,
  retry,
  totalCount,
} = useExercises();

// Queried once rather than on every tap, and kept live: `matchMedia` returns a MediaQueryList that
// tracks the OS setting, so re-querying it per gesture bought nothing.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Category switch → scroll to top; honour reduced-motion (JS scroll ignores CSS scroll-behavior).
function onSelectCategory(id: CategoryId): void {
  setCategory(id);
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

// What the feed shows, said out loud (DESIGN §8). The feed's own `aria-live` sits on the skeleton,
// which the keyed <Transition> *destroys* the moment results arrive - so it announces the wait and
// never the outcome, and filtering has been silent to assistive tech. This region lives outside that
// transition, so it survives every state swap and is the one thing that can report the count.
const resultAnnouncement = computed(() => {
  if (isLoading.value || error.value) return '';
  if (totalCount.value === 0) return 'Aucun exercice';
  return `${totalCount.value} exercice${totalCount.value > 1 ? 's' : ''}`;
});
</script>

<template>
  <!-- The catalogue screen. The sticky bar lives here, not in the shell: search + scope steer *this*
       feed, so the detail route must not inherit them (it carries its own back nav, DESIGN §5.6). -->
  <div>
    <!-- Sticky bar (DESIGN §5.8), opaque for sunlight contrast. -->
    <header class="app-bar">
      <!-- CategoryScope slotted into HeaderToolbar as the centered scope. -->
      <HeaderToolbar>
        <CategoryScope
          :active-category="activeCategory"
          :searching="searchOpen"
          @select="onSelectCategory"
        />
      </HeaderToolbar>
    </header>

    <!-- Persistent live region: never inside the feed's keyed <Transition>, or it would be torn out
         with the state it is meant to report on. -->
    <p class="sr-only" role="status" aria-live="polite">{{ resultAnnouncement }}</p>

    <!-- No padding here: the feed section owns the gutter (DESIGN §4). -->
    <main>
      <ExerciseFeed
        :exercises="exercises"
        :category="activeCategory"
        :has-more="hasMore"
        :is-loading="isLoading"
        :error="error"
        :search-mode="searchOpen"
        :is-searching="isSearching"
        :has-filters="activeFilterCount > 0"
        @load-more="loadMore"
        @reset="resetAll"
        @retry="retry"
      />
    </main>
  </div>
</template>
