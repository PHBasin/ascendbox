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
  <!-- Responsive scope (DESIGN §5.2):
       • Phone (< sm): a segmented control — equal-width `flex-1` pills in `text-sm` share the row, so
         all 3 axes stay on ONE line down to ~340 px, no scroll, nothing hidden.
       • sm+ : natural-width pills at `text-base` (→ `lg:text-lg`) — the size that visually links the
         scope to the card titles (§3) — centered on their row.
       Icon never shrinks; the label may `truncate` as a last-resort safety on very narrow phones. -->
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
      <!-- Icon kept at every size (§2.1 reinforcement). On the phone segmented control it shrinks
           to 14 px with a tight gap so icon + a 9-letter label still fit one third of the row on one
           line down to ~360 px; full 16 px from sm where the pills are natural width. -->
      <CategoryIcon
        :category="cat.id"
        class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
        :class="activeCategory === cat.id ? '' : iconTint[cat.id]"
      />
      <span class="truncate">{{ cat.label }}</span>
    </button>
  </nav>
</template>
