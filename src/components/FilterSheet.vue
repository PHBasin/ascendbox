<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useExercises, DURATION_BUCKETS } from '@/application/useExercises';
import { LEVELS } from '@/domain/exercise';
import ResetIcon from './icons/ResetIcon.vue';
import CloseIcon from './icons/CloseIcon.vue';

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

    <!-- Panel. Below lg it slides up from the thumb zone; from lg it is a centered modal.
         The transition carries `lg:` variants of its own, so the phone keeps the full sheet slide
         while the desktop dialog only rises 4 and fades — a full-height slide reads as a sheet, and
         at lg this is no longer one. -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full lg:translate-y-4 lg:opacity-0"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="translate-y-full lg:translate-y-4 lg:opacity-0"
    >
      <!-- From lg: `inset-0 + m-auto + h-fit` centres the panel with margins alone, deliberately
           leaving `transform` free for the Transition above — centring by `-translate-1/2` would be
           overwritten by the enter/leave classes. Width caps at `max-w-2xl` (672px): measured, the
           content never exceeds 666px at any viewport, so past that the panel was only growing empty
           (1254px of it at 1920). Bottom sheet → floating card: all four borders, an omnidirectional
           shadow, and `pb-8` (thumb clearance) relaxes to `pb-6`. -->
      <div
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_-8px_30px_rgba(15,23,42,0.18)] p-6 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:w-full lg:max-w-2xl lg:rounded-3xl lg:border lg:pb-6 lg:shadow-[0_24px_64px_rgba(15,23,42,0.24)]"
        role="dialog"
        aria-modal="true"
        aria-label="Filtres"
      >
        <!-- No grab handle: it implies swipe-to-dismiss, which we don't wire up (dismiss = ✕ / scrim / Esc). -->

        <!-- The ✕ owns the top-right (DESIGN §5.5): on a sheet that is the slot convention reserves
             for dismissal, and it is the worst thumb reach on a phone — the wrong place for a
             state-destroying action, which is why `Effacer les filtres` moved down by the CTA.
             Ghost circle, not `.pill-action`: that skin is white and would vanish on a white sheet. -->
        <header class="flex items-center justify-between gap-3 mb-6">
          <h2
            class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
          >
            Filtres
          </h2>
          <button
            type="button"
            aria-label="Fermer les filtres"
            class="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-300 active:scale-95"
            @click="close"
          >
            <CloseIcon class="w-5 h-5" />
          </button>
        </header>

        <!-- Durée -->
        <section class="mb-6">
          <p class="eyebrow mb-3">Durée</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="bucket in DURATION_BUCKETS"
              :key="bucket.id"
              type="button"
              :aria-pressed="selectedBuckets.includes(bucket.id)"
              class="px-4 min-h-11 rounded-full font-semibold text-sm ring-1 transition-colors duration-300 active:scale-95"
              :class="selectedBuckets.includes(bucket.id) ? 'toggle-on' : 'toggle-off'"
              @click="toggleBucket(bucket.id)"
            >
              {{ bucket.label }}
            </button>
          </div>
        </section>

        <!-- Niveau -->
        <section class="mb-6">
          <p class="eyebrow mb-3">Niveau</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="lvl in LEVELS"
              :key="lvl.value"
              type="button"
              :aria-pressed="selectedLevels.includes(lvl.value)"
              class="px-4 min-h-11 rounded-full font-semibold text-sm ring-1 transition-colors duration-300 active:scale-95"
              :class="selectedLevels.includes(lvl.value) ? 'toggle-on' : 'toggle-off'"
              @click="toggleLevel(lvl.value)"
            >
              {{ lvl.label }}
            </button>
          </div>
        </section>

        <!-- Tags -->
        <section v-if="availableTags.length" class="mb-6">
          <p class="eyebrow mb-3">Tags</p>
          <input
            v-if="showTagSearch"
            v-model="tagQuery"
            type="search"
            placeholder="Rechercher un tag…"
            class="w-full mb-3 px-4 min-h-11 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-50"
          />
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in shownTags"
              :key="tag"
              type="button"
              :aria-pressed="selectedTags.includes(tag)"
              class="px-4 min-h-11 rounded-full font-medium text-sm ring-1 transition-colors duration-300 active:scale-95"
              :class="selectedTags.includes(tag) ? 'toggle-on' : 'toggle-off'"
              @click="toggleTag(tag)"
            >
              #{{ tag }}
            </button>
          </div>
        </section>

        <!-- Bottom cluster — stacked on phones, side by side from sm (DESIGN §5.5).
             Stacked, `Effacer les filtres` sits *above* the CTA: the sheet is anchored to the bottom
             edge, so anything above leaves the CTA at a constant distance from it.
             The breakpoint is `sm`, not `lg`, and it is measured rather than guessed. The reset is
             conditional, so a row halves the CTA the moment a filter is applied; what decides is
             whether the half still reads as the primary action next to the option pills it now
             shares ink and radius with (widest: 124px). At 390px it does not — 165px, only 1.3×.
             At 640px it already does — 290px, 2.3×, roomier than the 305px/2.5× the lg modal ships.
             So `sm` is where the objection stops applying, and waiting for `lg` only left tablets a
             720–975px apply bar: the same slab the max-w-2xl cap was added to remove.
             Named for what it clears, to keep it distinct from the feed's `Tout réinitialiser`,
             which also drops search mode. -->
        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            v-if="activeFilterCount"
            type="button"
            class="w-full sm:flex-1 inline-flex items-center justify-center gap-2 min-h-11 sm:min-h-[52px] rounded-full text-sm font-semibold ring-1 ring-slate-200 dark:ring-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-300 active:scale-95"
            @click="resetFilters"
          >
            <ResetIcon class="w-3.5 h-3.5" />
            Effacer les filtres
          </button>

          <!-- Live feedback CTA (~52px, full-width) — DESIGN §5.5 / §8. Full-width is load-bearing:
               `.toggle-on` shares this exact ink, so width is what keeps the primary action from
               reading as one more selected option. -->
          <button
            type="button"
            class="w-full sm:flex-1 min-h-[52px] rounded-full bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 font-bold text-base transition-transform duration-300 active:scale-95"
            @click="close"
          >
            Voir {{ totalCount }} exercice{{ totalCount > 1 ? 's' : '' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
