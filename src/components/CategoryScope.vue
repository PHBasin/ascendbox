<script setup lang="ts">
import { CATEGORIES, type CategoryId } from '@/domain/exercise';
import { CATEGORY_TINT } from './categoryStyles';
import CategoryIcon from './CategoryIcon.vue';

const props = defineProps<{ activeCategory: CategoryId; searching?: boolean }>();
defineEmits<{ select: [categoryId: CategoryId] }>();

// Search supersedes the scope: no category reads active while searching, but the pills stay tappable
// and `activeCategory` is kept, so one tap restores it (DESIGN §5.2).
const isActive = (id: CategoryId): boolean => !props.searching && props.activeCategory === id;

// Full static class strings for the JIT (§10).

// Phone: `flex-auto` sizes each pill to its own label, then grows them to fill the row —
// proportional, not equal thirds, so the widest label is never crushed. Full labels + icons hold
// one line from the 360px target up; `truncate` only fires below ~340px (§5.2). `sm+`: natural width.
const PILL =
  'flex-auto sm:flex-none min-w-0 inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 min-h-11 rounded-full font-bold text-sm sm:text-base lg:text-lg ring-1 transition-all active:scale-95';

// Skin from `.toggle-on`/`.toggle-off` (main.css), shared with the filter sheet. Only the duration
// is local: deselect (150ms) is quicker than select (300ms) — it recedes as a by-product of another
// action, so it must not pull the eye (§6).
const ON = 'duration-300 toggle-on';
const OFF = 'duration-150 toggle-off';
</script>

<template>
  <!-- Below lg the scope owns its row: phone pills fill it, `sm+` pills sit left on the card rail
       (`justify-start`) — a lone row has no flanks to center against. At lg+ the flanked triptych is
       centered by HeaderToolbar (`justify-start` is a no-op there — the nav is content-width). §5.2 -->
  <nav class="flex justify-start gap-2 sm:gap-3">
    <button
      v-for="cat in CATEGORIES"
      :key="cat.id"
      type="button"
      :aria-pressed="isActive(cat.id)"
      :class="[PILL, isActive(cat.id) ? ON : OFF]"
      @click="$emit('select', cat.id)"
    >
      <!-- Icon = reinforcement only (§2.1); 14 px on the phone, 16 px from sm. -->
      <CategoryIcon
        :category="cat.id"
        class="inline-flex w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
        :class="isActive(cat.id) ? '' : CATEGORY_TINT[cat.id]"
      />
      <span class="truncate">{{ cat.label }}</span>
    </button>
  </nav>
</template>
