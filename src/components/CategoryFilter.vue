<script setup lang="ts">
import { CATEGORIES, type CategoryId } from '@/domain/exercise';

defineProps<{ activeCategory: CategoryId }>();
defineEmits<{ select: [categoryId: CategoryId] }>();

// ⚠️ Tailwind v4: class concatenation (`'bg-' + id`) is invisible to
// the JIT scanner. So we map to full, static strings.
// Active state: soft tint + colored text + ring (no saturated fill or halo → calmer).
const activeClasses: Record<CategoryId, string> = {
  physique: 'bg-physique/10 dark:bg-physique/20 text-physique ring-physique/30',
  technique: 'bg-technique/10 dark:bg-technique/20 text-technique ring-technique/30',
  mental: 'bg-mental/10 dark:bg-mental/20 text-mental ring-mental/30',
};
</script>

<template>
  <nav
    class="flex justify-center gap-2 p-4 sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md"
  >
    <button
      v-for="cat in CATEGORIES"
      :key="cat.id"
      type="button"
      :aria-pressed="activeCategory === cat.id"
      class="px-4 min-h-11 rounded-full capitalize font-bold ring-1 transition-all duration-300 active:scale-95"
      :class="
        activeCategory === cat.id
          ? activeClasses[cat.id]
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
      "
      @click="$emit('select', cat.id)"
    >
      {{ cat.label }}
    </button>
  </nav>
</template>
