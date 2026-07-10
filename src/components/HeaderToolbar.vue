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

// Collapsible search (DESIGN §5.9): a magnifier that expands into a field on demand.
// The magnifier⇄field swap is instant (no transition): fading a swap while the row's
// width snaps reads as a stutter, and animating to a flex/auto width is fragile — a crisp
// swap is the honest call. On mobile/tablet the field takes over the actions row (space is
// scarce); on lg+ the title stays and the field grows inline, capped in width.
const searchOpen = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);
const searchButton = ref<HTMLButtonElement | null>(null);

// Focus follows the swap so keyboard users never land on <body> (a11y): to the field on
// open, back to the magnifier on close, once the DOM has swapped.
async function openSearch(): Promise<void> {
  searchOpen.value = true;
  await nextTick();
  searchInput.value?.focus();
}

async function closeSearch(): Promise<void> {
  clearSearch();
  searchOpen.value = false;
  await nextTick();
  searchButton.value?.focus();
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
  <!-- Header aligned to the body (DESIGN §5.8): same max-w-7xl mx-auto px-6 measure as the feed
       grid, so its edges line up with the outer card columns.
       • Mobile & tablet (< lg): two tiers — [ title · search · Filtres ] over the full-width scope.
         Two tiers give the open search field its own room, so nothing squeezes the scope.
       • Desktop (lg+): one line — title left · scope centered · search + Filtres right. Only at lg
         is there room for all four on one line even with the search field open. -->
  <div class="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3 lg:flex-nowrap">
      <!-- Screen title (DESIGN §3). Hidden while search is open below lg (the field takes the
           actions row); kept on lg+ where the field grows inline, capped in width. -->
      <h1
        class="mr-auto lg:mr-0 lg:flex-1 text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
        :class="searchOpen ? 'hidden sm:block' : 'block'"
      >
        Exercices
      </h1>

      <!-- Category scope — own full-width line below lg; back in flow + centered on lg+.
           The DOM order (title · scope · actions) already is the desktop order, so only the
           sub-lg `order-last` needs resetting; the flanking flex-1 groups then center the scope. -->
      <div class="order-last w-full lg:order-none lg:w-auto">
        <slot />
      </div>

      <!-- Right cluster: search + Filtres. Full-width takeover only on phones (< sm); from sm the
           field is capped and sits at the right, so tablets don't get a 600 px half-empty field. -->
      <div
        class="flex items-center gap-2 sm:gap-3 lg:flex-1 lg:justify-end"
        :class="searchOpen ? 'flex-1 sm:flex-none' : ''"
      >
        <!-- Search: magnifier ⇄ field. Fills the actions row only on phones; from sm it is capped
             (sm:w-80) and sits next to Filtres, and the title stays visible (there is room). -->
        <div class="flex" :class="searchOpen ? 'flex-1 sm:flex-none' : ''">
          <button
            v-if="!searchOpen"
            ref="searchButton"
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

          <div v-else class="relative w-full sm:w-80">
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
          class="shrink-0 inline-flex items-center gap-2 px-4 min-h-11 rounded-full font-semibold text-sm sm:text-base lg:text-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-300 active:scale-95"
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
          class="inline-flex items-center gap-1.5 pl-3 pr-2 min-h-9 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-300"
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
