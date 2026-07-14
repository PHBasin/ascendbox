<script setup lang="ts">
import { CATEGORIES, type CategoryId } from '@/domain/exercise';
import CategoryIcon from './CategoryIcon.vue';

const props = defineProps<{ activeCategory: CategoryId; searching?: boolean }>();
defineEmits<{ select: [categoryId: CategoryId] }>();

// While a search runs it supersedes the scope (DESIGN §5.2), so no category is the active
// axis — every pill reads inactive but stays tappable: one tap re-selects a category and
// exits the search (setCategory clears the query). `activeCategory` is never lost, so the
// scope restores itself the moment the search clears.
const isActive = (id: CategoryId): boolean => !props.searching && props.activeCategory === id;

// Category = icon + label (DESIGN §2.1). Active = solid ink fill (§5.2, AAA); inactive
// icon is category-tinted. Full static strings for the JIT (§10).
const iconTint: Record<CategoryId, string> = {
  physique: 'text-physique',
  technique: 'text-technique',
  mental: 'text-mental',
};
</script>

<template>
  <!-- Responsive scope (DESIGN §5.2): natural-width pills, centered — each sized to its own label so
       it never truncates. They sit on one line while they fit (~360 px+) and wrap to a 2nd line on
       the narrowest phones rather than clip. From sm the label grows to link with card titles (§3). -->
  <nav class="flex flex-wrap justify-center gap-2 sm:gap-3">
    <button
      v-for="cat in CATEGORIES"
      :key="cat.id"
      type="button"
      :aria-pressed="isActive(cat.id)"
      class="flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-h-11 rounded-full font-bold text-sm sm:text-base lg:text-lg ring-1 transition-all active:scale-95"
      :class="
        isActive(cat.id)
          ? 'duration-300 bg-slate-900 text-white ring-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:ring-slate-50'
          : 'duration-150 bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
      "
      @click="$emit('select', cat.id)"
    >
      <CategoryIcon
        :category="cat.id"
        class="w-4 h-4 shrink-0"
        :class="isActive(cat.id) ? '' : iconTint[cat.id]"
      />
      {{ cat.label }}
    </button>
  </nav>
</template>
