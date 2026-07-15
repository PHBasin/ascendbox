<script setup lang="ts">
import { computed } from 'vue';
import type { Level } from '@/domain/exercise';

// Level = filled-bar count + text label, never hue (DESIGN §2.3). Drawn as an icon-sized glyph of 3
// ascending bars so it reads as a sibling of the duration's clock rather than a foreign widget — the
// count survives, which is what the rule protects; only the form changed. The bars are decorative
// (aria-hidden); the label carries the meaning, so it passes a grayscale and a screen-reader test.
const props = defineProps<{ level: Level; size?: 'sm' | 'lg' }>();

const LEVEL_LABEL: Record<Level, string> = {
  1: 'Débutant',
  2: 'Intermédiaire',
  3: 'Avancé',
};

const label = computed(() => LEVEL_LABEL[props.level]);
// Match the sibling meta icon at each size (card 3.5, detail 4). Full static strings for the JIT (§10).
const icon = computed(() => (props.size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'));
const text = computed(() => (props.size === 'lg' ? 'text-sm' : 'text-xs'));
// Bars above the level: dimmed, never absent — an empty slot is what makes the count readable.
const MUTED = 'stroke-slate-300 dark:stroke-slate-600';
</script>

<template>
  <span
    class="shrink-0 inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300"
    :class="text"
  >
    <svg
      class="shrink-0"
      :class="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M5 20v-4" :class="level >= 1 ? '' : MUTED" />
      <path d="M12 20v-8" :class="level >= 2 ? '' : MUTED" />
      <path d="M19 20v-12" :class="level >= 3 ? '' : MUTED" />
    </svg>
    <span><span class="sr-only">Niveau : </span>{{ label }}</span>
  </span>
</template>
