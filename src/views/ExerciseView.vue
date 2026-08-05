<script setup lang="ts">
import { computed } from 'vue';
import { useExercise } from '@/application/useExercises';
import { CATEGORIES, type CategoryId } from '@/domain/exercise';
import CategoryIcon from '@/components/CategoryIcon.vue';
import LevelGauge from '@/components/LevelGauge.vue';

// Exercise detail (DESIGN §5.6), read-only. The coach reads this standing at the wall, in a hurry:
// the **Déroulement** is the payload they came for, so it is a scannable list — never a paragraph.
const props = defineProps<{ id: string }>();

const { exercise, notFound, isLoading, error } = useExercise(() => Number(props.id));

// Category icon tint = reinforcement only (DESIGN §2.1). Full static strings for the JIT (§10).
const CATEGORY_TINT: Record<CategoryId, string> = {
  physique: 'text-physique',
  technique: 'text-technique',
  mental: 'text-mental',
};
const categoryLabel = computed(
  () => CATEGORIES.find((c) => c.id === exercise.value?.categoryId)?.label ?? ''
);
const categoryTint = computed(() =>
  exercise.value ? CATEGORY_TINT[exercise.value.categoryId] : ''
);

// Only the directions that carry items — one-sided adaptation is the norm (plenty of exercises can
// be made easier but not usefully harder), and a missing one is a non-event (§5.6), never an empty
// block. `up` picks the arrow: direction must be legible without hue (§1.3).
type VariantBlock = { key: string; label: string; up: boolean; items: string[] };
const variantBlocks = computed<VariantBlock[]>(() => {
  const v = exercise.value?.variants;
  if (!v) return [];
  const out: VariantBlock[] = [];
  if (v.harder?.length) out.push({ key: 'harder', label: 'Plus dur', up: true, items: v.harder });
  if (v.easier?.length)
    out.push({ key: 'easier', label: 'Plus facile', up: false, items: v.easier });
  return out;
});
</script>

<template>
  <!-- Back nav is sticky: the page can run long and the coach must be able to bail out at any scroll
       position without hunting. Same opaque treatment as the feed bar (DESIGN §5.8) — never frosted,
       which erodes contrast in sunlight. -->
  <header
    class="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
  >
    <!-- `py-4` + `px-6 lg:px-8` mirror the feed's HeaderToolbar exactly: same gutter, and — with the
         control's min-h-11 — the same bar height, so the sticky bar doesn't jump between routes. -->
    <div class="max-w-3xl mx-auto px-6 lg:px-8 py-4">
      <!-- Same pill as `Filtres`/search, not the scope's: §5.2 keeps the white surface for a
           *standalone action* and the recessed slate-100 for an *unselected toggle* — this is an
           action. Bare text would also break §1.5 (a control must look like what it does) and, with no
           hover on touch, would rest as plain bold text right above a same-weight h1: read as a
           breadcrumb, not a button. -->
      <RouterLink
        to="/"
        class="inline-flex items-center gap-2 px-4 min-h-11 rounded-full font-semibold text-sm sm:text-base lg:text-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-300 active:scale-95"
      >
        <svg
          class="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Exercices
      </RouterLink>
    </div>
  </header>

  <!-- Narrower measure than the feed's max-w-7xl: this page is read, not scanned as a grid, and a
       1280 px line length is unreadable. The sticky nav above shares it, so the edges line up (§5.8). -->
  <main class="max-w-3xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
    <p v-if="error" class="text-rose-600 dark:text-rose-400 py-12 text-center">{{ error }}</p>

    <p
      v-else-if="isLoading"
      class="text-slate-600 dark:text-slate-300 py-12 text-center"
      aria-busy="true"
      aria-live="polite"
    >
      Chargement…
    </p>

    <!-- A shared link can point at an id that no longer exists — offer the way back, not a dead end. -->
    <div v-else-if="notFound" class="py-12 text-center flex flex-col items-center gap-3">
      <p class="text-slate-600 dark:text-slate-300">Cet exercice n’existe pas.</p>
      <RouterLink
        to="/"
        class="inline-flex items-center px-4 min-h-11 rounded-full font-semibold text-sm bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 transition-transform duration-300 active:scale-95"
      >
        Voir le catalogue
      </RouterLink>
    </div>

    <article v-else-if="exercise" class="flex flex-col gap-6">
      <!-- Category = icon + label, always both (DESIGN §2.1) -->
      <div class="flex flex-col gap-2">
        <span
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          <CategoryIcon
            :category="exercise.categoryId"
            class="w-4 h-4 shrink-0"
            :class="categoryTint"
          />
          {{ categoryLabel }}
        </span>
        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {{ exercise.title }}
        </h1>
        <!-- `objective`, never the teaser: the coach read the teaser on the card and tapped *because
             of it* — echoing it here would spend the most valuable line of the page saying something
             already known (same rule as the contextual category, §5.1). The objective answers the
             other question ("what does this buy me?"), which is what belongs under a title.
             No eyebrow label: the block already opens with the category eyebrow, and a second one
             above a single line reads as noise. A subtitle *is* self-evidently the objective.
             Optional and self-hiding like every other detail section (§5.6). -->
        <p
          v-if="exercise.objective"
          class="text-base lg:text-lg text-slate-700 dark:text-slate-300 leading-relaxed"
        >
          {{ exercise.objective }}
        </p>
      </div>

      <!-- Stat strip: planning context (how long · how hard · what kit).
           **Stacked on phones, one row from `sm`.** A separator in a *wrapping* row always orphans —
           it trails one line or leads the next — so rather than negotiate with the wrap, we remove it:
           below `sm` each fact owns a line (a spec sheet reads well that way, and no separator is
           needed); from `sm` there is room for a single row, which is what makes the middots legal —
           exactly as on the card's strip, which never wraps either (§5.1).
           Gaps stay on the §4 scale: `gap-x-3` = Group tier (meta row). The previous `gap-x-5` was
           off-scale — 20 is the Component tier, whose sole role is card/panel padding. -->
      <div
        class="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 py-3 border-y border-slate-200 dark:border-slate-700"
      >
        <span
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
        >
          <svg
            class="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path stroke-linecap="round" d="M12 7v5l3 2" />
          </svg>
          <span class="sr-only">Durée : </span>{{ exercise.duration }} min
        </span>

        <!-- Middots exist only where the row is guaranteed single-line (`sm+`); stacked, they would
             each become a row of their own. -->
        <span class="hidden sm:inline text-slate-300 dark:text-slate-600" aria-hidden="true"
          >·</span
        >

        <LevelGauge :level="exercise.level" size="lg" />

        <span
          v-if="exercise.equipment?.length"
          class="hidden sm:inline text-slate-300 dark:text-slate-600"
          aria-hidden="true"
          >·</span
        >

        <span
          v-if="exercise.equipment?.length"
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
        >
          <svg
            class="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8h4l2-2h6l2 2h4v10H3z" />
          </svg>
          <span class="sr-only">Matériel : </span>{{ exercise.equipment.join(' · ') }}
        </span>
      </div>

      <!-- Déroulement — the payload. A list, never a paragraph: this is read mid-session, standing,
           and a sequence is scanned where prose has to be re-read. It also carries the figures the
           removed `protocol` tiles used to hold ("5 séries de 7 s, 3 min de récup"), which is what
           lets one line say "5 s par bras" — the thing the tile model could not express. -->
      <section v-if="exercise.instructions?.length" class="flex flex-col gap-3">
        <h2
          class="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300"
        >
          Déroulement
        </h2>
        <ul class="flex flex-col gap-3">
          <li
            v-for="(step, i) in exercise.instructions"
            :key="i"
            class="flex gap-3 text-[15px] lg:text-base text-slate-700 dark:text-slate-300 leading-relaxed"
          >
            <!-- Drawn, not a `list-disc` marker: a real bullet inherits the text's line-height and
                 drifts off the first line as the item wraps. `mt-2.5` pins it to the first line's
                 optical centre and it stays there however long the step runs. -->
            <span
              class="w-1.5 h-1.5 mt-2.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
              aria-hidden="true"
            />
            {{ step }}
          </li>
        </ul>
      </section>

      <!-- Sécurité — must be unmissable, but never by hue alone (§1.3): the warning icon and the
           explicit "Sécurité" heading carry it; the rose surface only reinforces. Body stays slate so
           a long warning is still comfortably readable (§2.2 keeps rose for error text only). -->
      <section
        v-if="exercise.safety"
        class="rounded-3xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-5 flex flex-col gap-2"
      >
        <h2
          class="inline-flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300"
        >
          <svg
            class="w-5 h-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
            />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          Sécurité
        </h2>
        <p class="text-[15px] lg:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
          {{ exercise.safety }}
        </p>
      </section>

      <!-- Adapter — deliberately **after** Sécurité: the "plus dur" column is where a coach adds load
           and removes holds, so it must be read once the warning has been. Direction is carried by
           the heading *and* the arrow, never by hue (§1.3) — the blocks are plain slate surfaces, so
           the section survives grayscale and colour-vision differences untouched. -->
      <section v-if="variantBlocks.length" class="flex flex-col gap-3">
        <h2
          class="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300"
        >
          Adapter
        </h2>
        <!-- Two columns from `sm`, stacked below: each list runs several lines, and two of them side
             by side on a 390px phone would leave ~4 words per line. -->
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="block in variantBlocks" :key="block.key" class="card p-4 flex flex-col gap-2">
            <h3
              class="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-50"
            >
              <svg
                class="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path v-if="block.up" d="M12 19V5M5 12l7-7 7 7" />
                <path v-else d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              {{ block.label }}
            </h3>
            <ul class="flex flex-col gap-2">
              <li
                v-for="(item, i) in block.items"
                :key="i"
                class="flex gap-3 text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                <span
                  class="w-1.5 h-1.5 mt-2.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                  aria-hidden="true"
                />
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Tags = flat metadata, never pills (pills are for controls — DESIGN §5.4/§1.5). -->
      <ul v-if="exercise.tags.length" class="flex flex-wrap gap-x-3 gap-y-1">
        <li
          v-for="tag in exercise.tags"
          :key="tag"
          class="text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          #{{ tag }}
        </li>
      </ul>
    </article>
  </main>
</template>
