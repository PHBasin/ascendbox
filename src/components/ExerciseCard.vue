<script setup lang="ts">
import { computed } from 'vue';
import { CATEGORIES, type Exercise, type Level, type CategoryId } from '@/domain/exercise';
import CategoryIcon from './CategoryIcon.vue';

// `showCategory` is true only when the feed spans categories (global search); under a
// single-category scope the badge would just repeat the active scope, so the feed leaves it off.
const props = defineProps<{ exercise: Exercise; showCategory?: boolean }>();

// Level label; the gauge encodes value by filled-segment count, never hue (DESIGN §2.3).
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
    <!-- Category — shown only when results span categories (search). Under a single-category scope
         it just repeats the scope, so it's hidden while browsing and the title leads (DESIGN §5.1). -->
    <span
      v-if="showCategory"
      class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
    >
      <CategoryIcon :category="exercise.categoryId" class="w-4 h-4 shrink-0" :class="categoryTint" />
      {{ categoryLabel }}
    </span>

    <!-- Title + teaser, with duration pinned top-right -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1 min-w-0">
        <h3 class="text-base lg:text-lg font-bold leading-tight text-slate-900 dark:text-slate-50">
          {{ exercise.title }}
        </h3>
        <p class="text-[15px] lg:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {{ exercise.description }}
        </p>
      </div>

      <span
        class="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
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

    <!-- Footer: neutral tags · neutral level gauge -->
    <div class="flex items-center justify-between gap-3">
      <!-- Tags = metadata, not controls → flat text; elevated pills are for controls only (DESIGN §5.4/§1.5). -->
      <ul v-if="visibleTags.length" class="flex flex-wrap gap-x-3 gap-y-1">
        <li
          v-for="tag in visibleTags"
          :key="tag"
          class="text-xs font-semibold text-slate-600 dark:text-slate-300"
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
            :class="
              n <= exercise.level
                ? 'bg-slate-900 dark:bg-slate-50'
                : 'bg-slate-200 dark:bg-slate-700'
            "
          ></span>
        </span>
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span class="sr-only">Niveau : </span>{{ levelLabel }}
        </span>
      </div>
    </div>
  </article>
</template>
