<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import {
  useExercises,
  DURATION_BUCKETS,
  LEVELS,
  type DurationBucketId,
} from '@/application/useExercises';
import type { Level } from '@/domain/exercise';
import FilterSheet from './FilterSheet.vue';

const {
  searchQuery,
  clearSearch,
  selectedBuckets,
  selectedLevels,
  selectedTags,
  activeFilterCount,
  toggleBucket,
  toggleLevel,
  toggleTag,
} = useExercises();

const sheetOpen = ref(false);

// Collapsible search (DESIGN §5.9): a magnifier that expands on demand and, while
// open, takes over the title row — the field hides the "Exercices" title so it gets
// the full width for typing, on a 390 px screen without shrinking the touch targets.
const searchOpen = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);

async function openSearch(): Promise<void> {
  searchOpen.value = true;
  await nextTick();
  searchInput.value?.focus();
}

function closeSearch(): void {
  clearSearch();
  searchOpen.value = false;
}

// Applied attribute filters as removable chips (DESIGN §5.5): recognition over recall.
type Chip = { key: string; label: string; remove: () => void };
const chips = computed<Chip[]>(() => [
  ...selectedBuckets.value.map((id: DurationBucketId) => ({
    key: `d:${id}`,
    label: DURATION_BUCKETS.find((b) => b.id === id)!.label,
    remove: () => toggleBucket(id),
  })),
  ...selectedLevels.value.map((v: Level) => ({
    key: `l:${v}`,
    label: LEVELS.find((x) => x.value === v)!.label,
    remove: () => toggleLevel(v),
  })),
  ...selectedTags.value.map((t: string) => ({
    key: `t:${t}`,
    label: `#${t}`,
    remove: () => toggleTag(t),
  })),
]);
</script>

<template>
  <!-- Responsive header (DESIGN §5.8), aligned to the content column.
       • Mobile: two tiers — [title · search · Filtres] over the full-width category scope,
         bounded to the feed's measure (max-w-2xl) so the controls sit above the cards.
       • md+ (tablet/PC): one line — the bar widens (max-w-4xl) and the scope centers between
         the title (left) and search + Filtres (right). Wider than the feed by design. -->
  <div class="max-w-2xl md:max-w-4xl mx-auto px-6 py-4 flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4">
      <!-- Screen title (DESIGN §3). Hidden while search is open so the field owns the row. -->
      <h1
        v-if="!searchOpen"
        class="mr-auto md:mr-0 md:flex-1 md:order-1 min-h-11 flex items-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
      >
        Exercices
      </h1>

      <!-- Category scope — tier 2 on mobile (own full-width line), centered on desktop. -->
      <div class="order-last w-full md:order-2 md:w-auto">
        <slot />
      </div>

      <!-- Right cluster: search + Filtres. Grows to fill the row while search is open. -->
      <div
        class="flex items-center gap-3 md:order-3 md:flex-1 md:justify-end"
        :class="searchOpen ? 'flex-1' : ''"
      >
        <!-- Search: magnifier ⇄ full field. When open it flex-grows over the title. -->
        <div class="flex" :class="searchOpen ? 'flex-1' : ''">
          <button
            v-if="!searchOpen"
            type="button"
            aria-label="Rechercher un exercice"
            class="inline-flex items-center justify-center w-11 h-11 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-300 active:scale-95"
            @click="openSearch"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>

          <div v-else class="relative w-full">
            <svg
              class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="search"
              placeholder="Rechercher un exercice…"
              aria-label="Rechercher un exercice"
              class="w-full pl-10 pr-11 min-h-11 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-50"
              @keydown.escape="closeSearch"
            />
            <button
              type="button"
              aria-label="Fermer la recherche"
              class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-300"
              @click="closeSearch"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Filtres -->
        <button
          type="button"
          aria-haspopup="dialog"
          :aria-expanded="sheetOpen"
          class="shrink-0 inline-flex items-center gap-2 px-4 min-h-11 rounded-full font-semibold text-sm ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-300 active:scale-95"
          @click="sheetOpen = true"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filtres
          <span
            v-if="activeFilterCount"
            class="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 text-xs font-bold"
            :aria-label="`${activeFilterCount} filtre(s) actif(s)`"
          >
            {{ activeFilterCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Removable applied-filter chips -->
    <ul v-if="chips.length" class="flex flex-wrap gap-2">
      <li v-for="chip in chips" :key="chip.key">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 pl-3 pr-2 min-h-9 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-300"
          :aria-label="`Retirer le filtre ${chip.label}`"
          @click="chip.remove"
        >
          {{ chip.label }}
          <svg
            class="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </li>
    </ul>

    <FilterSheet :open="sheetOpen" @close="sheetOpen = false" />
  </div>
</template>
