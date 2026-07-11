<script setup lang="ts">
import { CATEGORIES, type CategoryId } from '@/domain/exercise';
import CategoryIcon from './CategoryIcon.vue';

defineProps<{ activeCategory: CategoryId }>();
defineEmits<{ select: [categoryId: CategoryId] }>();

// Category = icon + label (DESIGN §2.1). Active = solid ink fill (§5.2, AAA); inactive
// icon is category-tinted. Full static strings for the JIT (§10).
const iconTint: Record<CategoryId, string> = {
  physique: 'text-physique',
  technique: 'text-technique',
  mental: 'text-mental',
};
</script>

<template>
  <!-- Responsive scope (DESIGN §5.2): phone (< sm) = segmented control, equal flex-1 pills on one
       line to ~340px; sm+ = natural-width pills centered, sized to link with the card titles (§3). -->
  <nav class="flex justify-center gap-2 sm:gap-3">
    <button
      v-for="cat in CATEGORIES"
      :key="cat.id"
      type="button"
      :aria-pressed="activeCategory === cat.id"
      class="flex-1 sm:flex-none min-w-0 inline-flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 min-h-11 rounded-full font-bold text-sm sm:text-base lg:text-lg ring-1 transition-all duration-300 active:scale-95"
      :class="
        activeCategory === cat.id
          ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:ring-slate-50'
          : 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
      "
      @click="$emit('select', cat.id)"
    >
      <!-- Icon shrinks to 14px on the phone segmented control (icon + label fit one line), 16px from sm. -->
      <CategoryIcon
        :category="cat.id"
        class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
        :class="activeCategory === cat.id ? '' : iconTint[cat.id]"
      />
      <span class="truncate">{{ cat.label }}</span>
    </button>
  </nav>
</template>
