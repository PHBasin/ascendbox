<script setup lang="ts">
// Import the core composable for logic
import { useExercises } from '@/application/useExercises';

// Import UI components
import CategoryFilter from '@/components/CategoryFilter.vue';
import ExerciseFeed from '@/components/ExerciseFeed.vue';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt.vue';

// Destructure the state and methods from the composable
const { exercises, activeCategory, hasMore, loadMore, setCategory, isLoading, error } =
  useExercises();
</script>

<template>
  <div class="min-h-screen font-sans">
    <main class="py-8">
      <CategoryFilter :active-category="activeCategory" @select="setCategory" />

      <ExerciseFeed
        :exercises="exercises"
        :category="activeCategory"
        :has-more="hasMore"
        :is-loading="isLoading"
        :error="error"
        @load-more="loadMore"
      />
    </main>

    <PwaUpdatePrompt />
  </div>
</template>
