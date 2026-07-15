<script setup lang="ts">
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
} = useExercises();

// Category switch → scroll to top; honour reduced-motion (JS scroll ignores CSS scroll-behavior).
function onSelectCategory(id: CategoryId): void {
  setCategory(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}
</script>

<template>
  <!-- The catalogue screen. The sticky bar lives here, not in the shell: search + scope steer *this*
       feed, so the detail route must not inherit them (it carries its own back nav, DESIGN §5.6). -->
  <div>
    <!-- Sticky bar (DESIGN §5.8), opaque for sunlight contrast. -->
    <header
      class="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
    >
      <!-- CategoryScope slotted into HeaderToolbar as the centered scope. -->
      <HeaderToolbar>
        <CategoryScope
          :active-category="activeCategory"
          :searching="searchOpen"
          @select="onSelectCategory"
        />
      </HeaderToolbar>
    </header>

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
      />
    </main>
  </div>
</template>
