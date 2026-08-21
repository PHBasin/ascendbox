<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue';
import { useExercises } from '@/application/useExercises';
import { DURATION_BUCKETS } from '@/application/useFilters';
import { LEVELS } from '@/domain/exercise';
import FilterSheet from './FilterSheet.vue';
import SearchIcon from './icons/SearchIcon.vue';
import CloseIcon from './icons/CloseIcon.vue';

const {
  searchOpen,
  searchQuery,
  openSearch,
  closeSearch,
  selectedBuckets,
  selectedLevels,
  selectedTags,
  activeFilterCount,
  toggleBucket,
  toggleLevel,
  toggleTag,
} = useExercises();

const sheetOpen = ref(false);

// Collapsible search (DESIGN §5.9): magnifier ⇄ field, instant swap (no transition). Below lg the
// field takes the actions row; on lg+ it grows inline, capped in width. `searchOpen` is store state
// (it widens the feed to the whole catalogue); all this component owes it is that focus follows the
// swap (a11y, §8).
const searchInput = ref<HTMLInputElement | null>(null);
const searchButton = ref<HTMLButtonElement | null>(null);

// A watcher on the *state*, not wrappers around the two actions - because search closes by a third
// route the wrappers never saw: `setCategory` calls the store's `closeSearch` directly. Tapping a
// category pill with the field focused therefore destroyed the focused element and dropped focus to
// <body>. This fires whichever way the mode is left, and the wrappers it replaces were also two
// module-scope names shadowing the two store functions they called.
watch(searchOpen, (open) => {
  // Read before the DOM updates (`flush: 'pre'`): the element about to be removed still holds focus.
  const leavingFocus = searchInput.value !== null && document.activeElement === searchInput.value;
  void nextTick(() => {
    if (open) searchInput.value?.focus();
    // Only when the coach's focus is the thing being destroyed. Tapping a pill with the mouse must
    // not yank focus to the magnifier.
    else if (leavingFocus) searchButton.value?.focus();
  });
});

// Applied attribute filters as removable chips (DESIGN §5.5): recognition over recall.
//
// Buckets and levels are filtered *from their source list* rather than mapped from the selection:
// the label travels with the option, so no id → label lookup is needed. It also fixes their order —
// a chip keeps its place in the scale instead of moving to wherever it was tapped.
//
// Tags are mapped from the selection instead, and deliberately: `availableTags` narrows with the
// scope, so walking it could drop a chip for a filter that is still applied. Their label is the tag.
type Chip = { key: string; label: string; remove: () => void };
const chips = computed<Chip[]>(() => [
  ...DURATION_BUCKETS.filter((b) => selectedBuckets.value.includes(b.id)).map((b) => ({
    key: `d:${b.id}`,
    label: b.label,
    remove: () => toggleBucket(b.id),
  })),
  ...LEVELS.filter((l) => selectedLevels.value.includes(l.value)).map((l) => ({
    key: `l:${l.value}`,
    label: l.label,
    remove: () => toggleLevel(l.value),
  })),
  ...selectedTags.value.map((t: string) => ({
    key: `t:${t}`,
    label: `#${t}`,
    remove: () => toggleTag(t),
  })),
]);
</script>

<template>
  <!-- Header aligned to the feed grid (DESIGN §5.8): same max-w-7xl measure.
       < lg: two tiers - [title · search · Filtres] over the full-width scope.
       lg+: one line - title · centered scope · search + Filtres. -->
  <div class="page-gutter max-w-7xl py-4 flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3 lg:flex-nowrap">
      <!-- Screen title (DESIGN §3). Below sm the open field takes the row, so the title gives up its
           pixels - but `sr-only`, never `hidden`: `hidden` left the document with no h1 at all on a
           phone, which is the one place this app is actually used. -->
      <h1
        class="mr-auto lg:mr-0 lg:flex-1 text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
        :class="searchOpen ? 'sr-only sm:not-sr-only sm:block' : 'block'"
      >
        Exercices
      </h1>

      <!-- Category scope - full-width line below lg (order-last), inline + centered on lg+. -->
      <div class="order-last w-full lg:order-none lg:w-auto">
        <slot />
      </div>

      <!-- Right cluster: search + Filtres. Field takes the row on phones; capped from sm. -->
      <div
        class="flex items-center gap-2 sm:gap-3 lg:flex-1 lg:justify-end"
        :class="searchOpen ? 'flex-1 sm:flex-none' : ''"
      >
        <!-- Search: magnifier ⇄ field (capped sm:w-56 from sm). -->
        <div class="flex" :class="searchOpen ? 'flex-1 sm:flex-none' : ''">
          <button
            v-if="!searchOpen"
            ref="searchButton"
            type="button"
            aria-label="Rechercher un exercice"
            class="pill-action inline-flex items-center justify-center w-11 h-11"
            @click="openSearch"
          >
            <SearchIcon class="w-5 h-5" />
          </button>

          <div v-else class="relative w-full sm:w-56">
            <SearchIcon
              class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400"
            />
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="search"
              placeholder="Rechercher …"
              aria-label="Rechercher un exercice"
              class="w-full pl-10 pr-11 min-h-11 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-50"
              @keydown.escape="closeSearch"
            />
            <button
              type="button"
              aria-label="Fermer la recherche"
              class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150 ease-out"
              @click="closeSearch"
            >
              <CloseIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Filtres -->
        <button
          type="button"
          aria-haspopup="dialog"
          :aria-expanded="sheetOpen"
          class="pill-action shrink-0 inline-flex items-center gap-2 px-4 min-h-11 font-bold text-sm sm:text-base lg:text-lg"
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

    <!-- Removable applied-filter chips. Animated on the standard scale (§6) because this row sits
         directly above the feed: adding or dropping a filter used to make the whole catalogue jump
         while the grid one pixel below animated every move it made.
         `opacity` + `scale` only - both composited, so a row of chips costs no layout work. The
         leaving chip goes `absolute` (positioned by the `relative` ul, no offsets, so it stays put)
         to free its slot at once and let the survivors reflow under `move-class` instead of after it.
         `v-if` stays: removing the *last* chip removes the row itself, which is a different event
         from a chip leaving one - the row goes at once, and nothing is left to animate out. -->
    <TransitionGroup
      v-if="chips.length"
      tag="ul"
      class="relative flex flex-wrap gap-2"
      move-class="transition-transform duration-300 ease-out"
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="absolute transition duration-200 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <li v-for="chip in chips" :key="chip.key">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 pl-3 pr-2 min-h-9 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150 ease-out"
          :aria-label="`Retirer le filtre ${chip.label}`"
          @click="chip.remove"
        >
          {{ chip.label }}
          <CloseIcon class="w-3.5 h-3.5" />
        </button>
      </li>
    </TransitionGroup>

    <FilterSheet :open="sheetOpen" @close="sheetOpen = false" />
  </div>
</template>
