<script setup lang="ts">
import { CATEGORIES, type CategoryId } from '@/domain/exercise';
import CategoryIcon from './CategoryIcon.vue';

const props = defineProps<{ activeCategory: CategoryId; searching?: boolean }>();
defineEmits<{ select: [categoryId: CategoryId] }>();

// Search supersedes the scope (DESIGN §5.2): no category reads active, but the pills stay tappable —
// one tap re-selects and exits the search. `activeCategory` is never cleared, so it restores itself.
const isActive = (id: CategoryId): boolean => !props.searching && props.activeCategory === id;

// Every class string below is complete on purpose: the JIT never sees one that was built (§10).

// `flex-none` sizes each pill to its own label, so no label is ever truncated (§5.2).
const PILL =
  'flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-h-11 rounded-full font-bold text-sm sm:text-base lg:text-lg ring-1 transition-all active:scale-95';

// Active = solid ink, never hue (§2.4). Deselect is quicker than select: it is a by-product of
// another action, so it must not pull the eye (§6).
const ON =
  'duration-300 bg-slate-900 text-white ring-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:ring-slate-50';
const OFF =
  'duration-150 bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700';

// Icon tint = reinforcement only; the label carries the meaning (§2.1).
const TINT: Record<CategoryId, string> = {
  physique: 'text-physique',
  technique: 'text-technique',
  mental: 'text-mental',
};
</script>

<template>
  <!-- Own full-width row below lg → aligned on the card rail, and a wrapped pill lands under the
       first one. At lg+ it is the middle term of title · scope · actions, centered there by
       HeaderToolbar's two flex-1 flanks (DESIGN §5.2 / §5.8). -->
  <nav class="flex flex-wrap justify-start gap-2 sm:gap-3">
    <button
      v-for="cat in CATEGORIES"
      :key="cat.id"
      type="button"
      :aria-pressed="isActive(cat.id)"
      :class="[PILL, isActive(cat.id) ? ON : OFF]"
      @click="$emit('select', cat.id)"
    >
      <CategoryIcon
        :category="cat.id"
        class="w-4 h-4 shrink-0"
        :class="isActive(cat.id) ? '' : TINT[cat.id]"
      />
      {{ cat.label }}
    </button>
  </nav>
</template>
