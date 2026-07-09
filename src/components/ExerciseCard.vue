<script setup lang="ts">
import { computed } from 'vue';
import { CATEGORIES, type Exercise, type Level, type CategoryId } from '@/domain/exercise';
import CategoryIcon from './CategoryIcon.vue';

const props = defineProps<{ exercise: Exercise }>();

// Level → text label. The gauge below encodes the value by *filled-segment count*
// (neutral ink), never by hue (DESIGN §2.3 / §5.3). Label is always present.
const LEVEL_LABEL: Record<Level, string> = {
  1: 'Débutant',
  2: 'Intermédiaire',
  3: 'Avancé',
};

// Category icon tint = pure reinforcement (DESIGN §2.1). Full static strings (§10).
const CATEGORY_TINT: Record<CategoryId, string> = {
  physique: 'text-physique',
  technique: 'text-technique',
  mental: 'text-mental',
};

const categoryLabel = computed(
  () => CATEGORIES.find((c) => c.id === props.exercise.categoryId)!.label
);
const categoryTint = computed(() => CATEGORY_TINT[props.exercise.categoryId]);
const levelLabel = computed(() => LEVEL_LABEL[props.exercise.level]);
// A card is triage, not execution: show at most 2 tags (DESIGN §5.1).
const visibleTags = computed(() => props.exercise.tags.slice(0, 2));
</script>

<template>
  <article class="card active:scale-[0.98] flex flex-col gap-3">
    <!-- Header: category (icon + label) · duration -->
    <div class="flex items-center justify-between gap-3">
      <span
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
      >
        <CategoryIcon :category="exercise.categoryId" class="w-4 h-4" :class="categoryTint" />
        {{ categoryLabel }}
      </span>

      <span
        class="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
      >
        <svg
          class="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path stroke-linecap="round" d="M12 7v5l3 2" />
        </svg>
        {{ exercise.duration }} min
      </span>
    </div>

    <!-- Title + teaser -->
    <div>
      <h3 class="text-lg font-bold leading-tight text-slate-900 dark:text-white">
        {{ exercise.title }}
      </h3>
      <p class="mt-1 text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
        {{ exercise.description }}
      </p>
    </div>

    <!-- Footer: neutral tags · neutral level gauge -->
    <div class="mt-1 flex items-center justify-between gap-3">
      <ul v-if="visibleTags.length" class="flex flex-wrap gap-1.5">
        <li
          v-for="tag in visibleTags"
          :key="tag"
          class="text-xs font-medium px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
        >
          #{{ tag }}
        </li>
      </ul>

      <div class="shrink-0 inline-flex items-center gap-1.5">
        <span class="flex items-center gap-0.5" aria-hidden="true">
          <span
            v-for="n in 3"
            :key="n"
            class="h-1.5 w-4 rounded-full"
            :class="n <= exercise.level ? 'bg-slate-900 dark:bg-slate-50' : 'bg-slate-200 dark:bg-slate-700'"
          ></span>
        </span>
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span class="sr-only">Niveau : </span>{{ levelLabel }}
        </span>
      </div>
    </div>
  </article>
</template>
