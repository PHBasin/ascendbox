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
  <!-- Responsive scope (DESIGN §5.2): natural-width pills — each sized to its own label so it never
       truncates. One line while they fit (~360 px+), wrapping to a 2nd line on the narrowest phones
       rather than clipping. From sm the label grows to link with card titles (§3).
       `justify-start`: below lg the scope owns its own full-width row, so it aligns on the same left
       rail as the cards instead of floating above them — and a wrapped pill lands under the first one
       rather than orphaned mid-row. At lg+ this is a no-op (the nav is content-width): the centering
       there comes from HeaderToolbar's two `flex-1` flanks, where the scope really is the middle term
       of title · scope · actions. Left when it owns a row, centered when it *is* the middle of one. -->
  <nav class="flex flex-wrap justify-start gap-2 sm:gap-3">
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
