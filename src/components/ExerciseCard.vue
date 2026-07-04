<script setup lang="ts">
import { computed } from 'vue';
import { CATEGORIES, type Exercise, type Intensity, type CategoryId } from '@/domain/exercise';

const props = defineProps<{ exercise: Exercise }>();

// Intensity (1|2|3) → visual meter: the level IS the number of filled bars.
// Label + color. Static classes (Tailwind v4).
const INTENSITY: Record<Intensity, { label: string; bar: string; text: string }> = {
  1: { label: 'Faible', bar: 'bg-intensity-low', text: 'text-intensity-low' },
  2: { label: 'Modérée', bar: 'bg-intensity-mid', text: 'text-intensity-mid' },
  3: { label: 'Élevée', bar: 'bg-intensity-high', text: 'text-intensity-high' },
};

// Style only, per the Tailwind v4 JIT gotcha (labels come from the domain CATEGORIES).
const CATEGORY_STYLE: Record<CategoryId, { dot: string; tag: string }> = {
  force: { dot: 'bg-force', tag: 'bg-force/10 text-force' },
  technique: { dot: 'bg-technique', tag: 'bg-technique/10 text-technique' },
  mental: { dot: 'bg-mental', tag: 'bg-mental/10 text-mental' },
};

const cat = computed(() => {
  const id = props.exercise.categoryId;
  const label = CATEGORIES.find((c) => c.id === id)!.label;
  return { label, ...CATEGORY_STYLE[id] };
});
const int = computed(() => INTENSITY[props.exercise.intensity]);
</script>

<template>
  <article class="card active:scale-[0.98] flex flex-col gap-3">
    <!-- Header: pilier + duration -->
    <div class="flex items-center justify-between gap-3">
      <span
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"
      >
        <span class="w-2 h-2 rounded-full" :class="cat.dot"></span>
        {{ cat.label }}
      </span>

      <span
        class="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path stroke-linecap="round" d="M12 7v5l3 2" />
        </svg>
        {{ exercise.duration }} min
      </span>
    </div>

    <!-- Title + description -->
    <div>
      <h3 class="text-lg font-bold leading-tight text-slate-900 dark:text-white">
        {{ exercise.title }}
      </h3>
      <p class="mt-1 text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
        {{ exercise.description }}
      </p>
    </div>

    <!-- Footer: tinted tags + intensity meter -->
    <div class="mt-1 flex items-center justify-between gap-3">
      <ul v-if="exercise.tags.length" class="flex flex-wrap gap-1.5">
        <li
          v-for="tag in exercise.tags"
          :key="tag"
          class="text-xs font-semibold px-2.5 py-1 rounded-full"
          :class="cat.tag"
        >
          {{ tag }}
        </li>
      </ul>

      <div
        class="shrink-0 inline-flex items-center gap-1.5"
        :title="`Intensité : ${int.label}`"
      >
        <span class="flex items-end gap-0.5" aria-hidden="true">
          <span
            v-for="n in 3"
            :key="n"
            class="w-1 rounded-full"
            :class="[
              n <= exercise.intensity ? int.bar : 'bg-slate-200 dark:bg-slate-600',
              n === 1 ? 'h-2' : n === 2 ? 'h-3' : 'h-4',
            ]"
          ></span>
        </span>
        <span class="text-xs font-bold" :class="int.text">{{ int.label }}</span>
      </div>
    </div>
  </article>
</template>
