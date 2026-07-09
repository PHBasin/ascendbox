<script setup lang="ts">
// Import the core composable for logic
import { useExercises } from '@/application/useExercises';
import type { CategoryId } from '@/domain/exercise';

// Import UI components
import CategoryFilter from '@/components/CategoryFilter.vue';
import FilterControls from '@/components/FilterControls.vue';
import ExerciseFeed from '@/components/ExerciseFeed.vue';

// Destructure the state and methods from the composable
const {
  exercises,
  activeCategory,
  hasMore,
  loadMore,
  setCategory,
  isLoading,
  error,
  isSearching,
  activeFilterCount,
  resetAll,
} = useExercises();

// Switching the training axis is a fresh start → snap the feed back to the top.
function onSelectCategory(id: CategoryId): void {
  setCategory(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <div class="min-h-screen font-sans">
    <!-- Sticky filter bar (DESIGN §5.8). Opaque (not translucent) so contrast holds in
         direct sunlight — the primary use context. -->
    <header
      class="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
    >
      <CategoryFilter :active-category="activeCategory" @select="onSelectCategory" />
      <FilterControls />
    </header>

    <!-- No vertical padding here: the feed section (p-6) owns the 24px gutter,
         so the vertical rhythm stays a single 24px step (DESIGN §4). -->
    <main>
      <ExerciseFeed
        :exercises="exercises"
        :category="activeCategory"
        :has-more="hasMore"
        :is-loading="isLoading"
        :error="error"
        :is-searching="isSearching"
        :has-filters="activeFilterCount > 0"
        @load-more="loadMore"
        @reset="resetAll"
      />
    </main>
  </div>
</template>
