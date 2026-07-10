<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useExercises, DURATION_BUCKETS, LEVELS } from '@/application/useExercises';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const {
  totalCount,
  selectedBuckets,
  selectedLevels,
  selectedTags,
  availableTags,
  activeFilterCount,
  toggleBucket,
  toggleLevel,
  toggleTag,
  resetFilters,
} = useExercises();

// In-sheet tag search appears only once the list gets long (DESIGN §5.5).
const tagQuery = ref('');
const showTagSearch = computed(() => availableTags.value.length > 10);
const shownTags = computed(() => {
  const q = tagQuery.value.trim().toLowerCase();
  return q ? availableTags.value.filter((t) => t.toLowerCase().includes(q)) : availableTags.value;
});

// Shared toggle styling — identical to the scope pills (DESIGN §5.2): ink-fill active, and an
// inactive `slate-100` + visible `slate-200` border so every "unselected toggle" reads the same
// across header and sheet.
const OPTION_ON =
  'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 ring-slate-900 dark:ring-slate-50';
const OPTION_OFF =
  'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700';

function close(): void {
  emit('close');
}

// Esc closes; lock body scroll while the sheet is up.
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') close();
}
watch(
  () => props.open,
  (open) => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) window.addEventListener('keydown', onKeydown);
    else window.removeEventListener('keydown', onKeydown);
  }
);
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = '';
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <!-- Scrim -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-slate-900/50"
        aria-hidden="true"
        @click="close"
      ></div>
    </Transition>

    <!-- Panel: slides up from the thumb zone -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-y-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-slate-50 dark:bg-slate-900 shadow-[0_-8px_30px_rgba(15,23,42,0.18)] p-6 pb-8"
        role="dialog"
        aria-modal="true"
        aria-label="Filtres"
      >
        <!-- No grab handle: a bottom sheet handle implies swipe-to-dismiss, which we don't wire up
             (dismiss is the scrim / ✕ / Esc, §5.5). A false affordance is worse than none. -->

        <!-- min-h-11 reserves the reset button's height so toggling it in/out never resizes the panel -->
        <header class="flex items-center justify-between gap-3 mb-6 min-h-11">
          <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Filtres
          </h2>
          <button
            v-if="activeFilterCount"
            type="button"
            class="inline-flex items-center gap-2 px-3 min-h-11 rounded-full text-sm font-semibold ring-1 ring-slate-200 dark:ring-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-300 active:scale-95"
            @click="resetFilters"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Réinitialiser
          </button>
        </header>

        <!-- Durée -->
        <section class="mb-6">
          <p
            class="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300 mb-3"
          >
            Durée
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="bucket in DURATION_BUCKETS"
              :key="bucket.id"
              type="button"
              :aria-pressed="selectedBuckets.includes(bucket.id)"
              class="px-4 min-h-11 rounded-full font-semibold text-sm ring-1 transition-colors duration-300 active:scale-95"
              :class="selectedBuckets.includes(bucket.id) ? OPTION_ON : OPTION_OFF"
              @click="toggleBucket(bucket.id)"
            >
              {{ bucket.label }}
            </button>
          </div>
        </section>

        <!-- Niveau -->
        <section class="mb-6">
          <p
            class="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300 mb-3"
          >
            Niveau
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="lvl in LEVELS"
              :key="lvl.value"
              type="button"
              :aria-pressed="selectedLevels.includes(lvl.value)"
              class="px-4 min-h-11 rounded-full font-semibold text-sm ring-1 transition-colors duration-300 active:scale-95"
              :class="selectedLevels.includes(lvl.value) ? OPTION_ON : OPTION_OFF"
              @click="toggleLevel(lvl.value)"
            >
              {{ lvl.label }}
            </button>
          </div>
        </section>

        <!-- Tags -->
        <section v-if="availableTags.length" class="mb-6">
          <p
            class="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300 mb-3"
          >
            Tags
          </p>
          <input
            v-if="showTagSearch"
            v-model="tagQuery"
            type="search"
            placeholder="Rechercher un tag…"
            class="w-full mb-3 px-4 min-h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-50"
          />
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in shownTags"
              :key="tag"
              type="button"
              :aria-pressed="selectedTags.includes(tag)"
              class="px-4 min-h-11 rounded-full font-medium text-sm ring-1 transition-colors duration-300 active:scale-95"
              :class="selectedTags.includes(tag) ? OPTION_ON : OPTION_OFF"
              @click="toggleTag(tag)"
            >
              #{{ tag }}
            </button>
          </div>
        </section>

        <!-- Live feedback CTA (~52px, full-width) — DESIGN §5.5 / §8 -->
        <button
          type="button"
          class="w-full min-h-[52px] rounded-2xl bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 font-bold text-base transition-transform duration-300 active:scale-95"
          @click="close"
        >
          Voir {{ totalCount }} exercice{{ totalCount > 1 ? 's' : '' }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
