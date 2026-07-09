<script setup lang="ts">
import { CATEGORIES, type CategoryId } from '@/domain/exercise';
import CategoryIcon from './CategoryIcon.vue';

defineProps<{ activeCategory: CategoryId }>();
defineEmits<{ select: [categoryId: CategoryId] }>();

// Category = icon + label (DESIGN §2.1). The active state is a solid ink fill
// (DESIGN §5.2, option A) → AAA contrast, meaning never carried by hue alone.
// On inactive chips the icon is category-tinted as pure reinforcement; on the
// active chip it inherits the ink fill's foreground.
// Tailwind v4 JIT: full static strings only (DESIGN §10).
const iconTint: Record<CategoryId, string> = {
  physique: 'text-physique',
  technique: 'text-technique',
  mental: 'text-mental',
};
</script>

<template>
  <nav class="flex gap-2">
    <button
      v-for="cat in CATEGORIES"
      :key="cat.id"
      type="button"
      :aria-pressed="activeCategory === cat.id"
      class="inline-flex items-center gap-1.5 px-4 min-h-11 rounded-full font-bold ring-1 transition-all duration-300 active:scale-95"
      :class="
        activeCategory === cat.id
          ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:ring-slate-50'
          : 'bg-slate-100 text-slate-600 ring-transparent hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      "
      @click="$emit('select', cat.id)"
    >
      <CategoryIcon
        :category="cat.id"
        class="w-4 h-4"
        :class="activeCategory === cat.id ? '' : iconTint[cat.id]"
      />
      {{ cat.label }}
    </button>
  </nav>
</template>
