<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { useExercises } from '@/application/useExercises';
import { DURATION_BUCKETS } from '@/application/useFilters';
import { LEVELS } from '@/domain/exercise';
import ToggleChip from './ToggleChip.vue';
import ResetIcon from './icons/ResetIcon.vue';
import CloseIcon from './icons/CloseIcon.vue';
import { useFocusTrap } from './useFocusTrap';

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

function close(): void {
  emit('close');
}

// The panel itself, so focus can be moved into it and kept there: `aria-modal="true"` below is a
// promise, and this is what keeps it (DESIGN §8).
const panel = ref<HTMLElement | null>(null);
useFocusTrap(panel, () => props.open);

// Esc closes; lock body scroll while the sheet is up.
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') close();
}

// The value we replaced, not the empty string: writing `''` on close clobbers whatever *else* had
// locked the scroll, which is the classic way two lock owners end up fighting.
let restoreOverflow: string | null = null;

// `inert` on the app root is the other half of `aria-modal`: without it the promise is only a label,
// and a screen reader can still walk the feed underneath. The sheet is teleported to <body>, so the
// root is never its own ancestor. Side benefit: the field's own Escape handler can no longer race
// this one, because the field is no longer reachable.
function setBackgroundInert(on: boolean): void {
  document.getElementById('app')?.toggleAttribute('inert', on);
}

function unlock(): void {
  if (restoreOverflow !== null) {
    document.body.style.overflow = restoreOverflow;
    restoreOverflow = null;
  }
  setBackgroundInert(false);
  window.removeEventListener('keydown', onKeydown);
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      restoreOverflow ??= document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setBackgroundInert(true);
      window.addEventListener('keydown', onKeydown);
    } else {
      unlock();
    }
  },
  // Mounted open (a future deep link into the filters, a keep-alive restore) would otherwise get
  // neither the scroll lock nor Escape.
  { immediate: true }
);

onBeforeUnmount(unlock);
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
         while the desktop dialog only rises 4 and fades - a full-height slide reads as a sheet, and
         at lg this is no longer one. -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full lg:translate-y-4 lg:opacity-0"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="translate-y-full lg:translate-y-4 lg:opacity-0"
    >
      <!-- Width and vertical anchoring are two independent rules, on two different breakpoints —
           each moves one variable, as the rest of the responsive does.
           **Width** caps at `max-w-2xl` (672px) from `sm`, centred by `mx-auto` against the existing
           `inset-x-0`: measured, the content never exceeds 666px at any viewport, so past that the
           panel only grows empty - 333px of void at 1023px, five times the 63–78px it holds
           everywhere else. The cap is inert below ~672px of viewport, so it costs the low end
           nothing. `sm:border-x` because the panel now has side edges it never had while full-bleed;
           `rounded-t-3xl` stays until `lg` since it still meets the bottom edge, and square bottom
           corners are what read as a sheet.
           **Vertical**: bottom-anchored (thumb zone) until `lg`, then centred by
           `inset-0 + m-auto + h-fit` - margins, not `-translate-1/2`, so `transform` stays free for
           the Transition above, whose enter/leave classes would otherwise overwrite the centring.
           At `lg` it also closes into a floating card: bottom border, omnidirectional shadow, and
           `pb-8` (thumb clearance) relaxed to `pb-6`. -->
      <div
        v-if="open"
        ref="panel"
        class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_-8px_30px_rgba(15,23,42,0.18)] p-6 pb-8 sm:max-w-2xl sm:mx-auto sm:border-x lg:inset-0 lg:m-auto lg:h-fit lg:rounded-3xl lg:border-b lg:pb-6 lg:shadow-[0_24px_64px_rgba(15,23,42,0.24)]"
        role="dialog"
        aria-modal="true"
        aria-label="Filtres"
      >
        <!-- No grab handle: it implies swipe-to-dismiss, which we don't wire up (dismiss = ✕ / scrim / Esc). -->

        <!-- The ✕ owns the top-right (DESIGN §5.5): on a sheet that is the slot convention reserves
             for dismissal, and it is the worst thumb reach on a phone - the wrong place for a
             state-destroying action, which is why `Effacer les filtres` moved down by the CTA.
             Deliberately the one control here with neither fill nor ring: a close is conventionally
             edgeless, and having no edge is what separates it from every control that acts on the
             filters - this one only acts on the panel. (It also rules out `.pill-action`, whose white
             fill would vanish on a white sheet.) -->
        <header class="flex items-center justify-between gap-3 mb-6">
          <h2
            class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
          >
            Filtres
          </h2>
          <button
            type="button"
            aria-label="Fermer les filtres"
            class="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition duration-150 ease-out active:scale-95"
            @click="close"
          >
            <CloseIcon class="w-5 h-5" />
          </button>
        </header>

        <!-- Durée -->
        <section class="mb-6">
          <p class="eyebrow mb-3">Durée</p>
          <div class="flex flex-wrap gap-2">
            <ToggleChip
              v-for="bucket in DURATION_BUCKETS"
              :key="bucket.id"
              :pressed="selectedBuckets.includes(bucket.id)"
              @toggle="toggleBucket(bucket.id)"
            >
              {{ bucket.label }}
            </ToggleChip>
          </div>
        </section>

        <!-- Niveau -->
        <section class="mb-6">
          <p class="eyebrow mb-3">Niveau</p>
          <div class="flex flex-wrap gap-2">
            <ToggleChip
              v-for="lvl in LEVELS"
              :key="lvl.value"
              :pressed="selectedLevels.includes(lvl.value)"
              @toggle="toggleLevel(lvl.value)"
            >
              {{ lvl.label }}
            </ToggleChip>
          </div>
        </section>

        <!-- Tags -->
        <section v-if="availableTags.length" class="mb-6">
          <p class="eyebrow mb-3">Tags</p>
          <div class="flex flex-wrap gap-2">
            <ToggleChip
              v-for="tag in availableTags"
              :key="tag"
              :pressed="selectedTags.includes(tag)"
              @toggle="toggleTag(tag)"
            >
              #{{ tag }}
            </ToggleChip>
          </div>
        </section>

        <!-- Bottom cluster - stacked on phones, side by side from sm (DESIGN §5.5).
             Stacked, `Effacer les filtres` sits *above* the CTA: the sheet is anchored to the bottom
             edge, so anything above leaves the CTA at a constant distance from it.
             The breakpoint is `sm`, not `lg`, and it is measured rather than guessed. The reset is
             conditional, so a row halves the CTA the moment a filter is applied; what decides is
             whether the half still reads as the primary action next to the option pills it now
             shares ink and radius with (widest: 124px). At 390px it does not - 165px, only 1.3×.
             At 640px it already does - 290px, 2.3×, roomier than the 305px/2.5× the lg modal ships.
             So `sm` is where the objection stops applying, and waiting for `lg` only left tablets a
             720–975px apply bar: the same slab the max-w-2xl cap was added to remove.
             In the row the two are *not* split 50/50, which would claim they are equal choices: the
             reset takes its natural width and the CTA takes the rest (190 / 420px at 1280), so the
             widths state the hierarchy the roles already have. They stay one type step apart at every
             breakpoint (14/16 then 16/18) - the reset scales with the CTA rather than sitting still
             while it grows, which is how the gap had opened to 4px at lg.
             Named for what it clears, to keep it distinct from the feed's `Tout réinitialiser`,
             which also drops search mode. -->
        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            v-if="activeFilterCount"
            type="button"
            class="w-full sm:w-auto sm:flex-none sm:px-4 inline-flex items-center justify-center gap-2 min-h-11 sm:min-h-[52px] rounded-full text-sm lg:text-base font-semibold ring-1 ring-slate-200 dark:ring-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition duration-150 ease-out active:scale-95"
            @click="resetFilters"
          >
            <ResetIcon class="w-3.5 h-3.5" />
            Effacer les filtres
          </button>

          <!-- Live feedback CTA (~52px, full-width) - DESIGN §5.5 / §8. Full-width is load-bearing:
               `.toggle-on` shares this exact ink, so width is what keeps the primary action from
               reading as one more selected option. -->
          <button
            type="button"
            class="w-full sm:flex-1 min-h-[52px] rounded-full bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 font-bold text-base lg:text-lg transition duration-150 ease-out active:scale-95"
            @click="close"
          >
            Voir {{ totalCount }} exercice{{ totalCount > 1 ? 's' : '' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
