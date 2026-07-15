<script setup lang="ts">
import { computed } from 'vue';
import type { Level } from '@/domain/exercise';

// Level = filled-segment count + text label, never hue (DESIGN §2.3). The gauge is decorative
// (aria-hidden); the label carries the meaning, so it survives a grayscale/screen-reader test.
const props = defineProps<{ level: Level; size?: 'sm' | 'lg' }>();

const LEVEL_LABEL: Record<Level, string> = {
  1: 'Débutant',
  2: 'Intermédiaire',
  3: 'Avancé',
};

const label = computed(() => LEVEL_LABEL[props.level]);
// Full static strings for the JIT (DESIGN §10).
const bar = computed(() => (props.size === 'lg' ? 'h-2 w-6' : 'h-1.5 w-4'));
const text = computed(() => (props.size === 'lg' ? 'text-sm' : 'text-xs'));
</script>

<template>
  <div class="shrink-0 inline-flex items-center gap-1.5">
    <span class="flex items-center gap-0.5" aria-hidden="true">
      <span
        v-for="n in 3"
        :key="n"
        class="rounded-full"
        :class="[bar, n <= level ? 'bg-slate-900 dark:bg-slate-50' : 'bg-slate-200 dark:bg-slate-700']"
      ></span>
    </span>
    <span class="font-semibold text-slate-600 dark:text-slate-300" :class="text">
      <span class="sr-only">Niveau : </span>{{ label }}
    </span>
  </div>
</template>
