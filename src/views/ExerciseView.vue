<script setup lang="ts">
import { computed } from 'vue';
import { useExercise } from '@/application/useExercises';
import { CATEGORIES, type CategoryId } from '@/domain/exercise';
import CategoryIcon from '@/components/CategoryIcon.vue';
import LevelGauge from '@/components/LevelGauge.vue';

// Exercise detail (DESIGN §5.6), read-only. The coach reads this standing at the wall, in a hurry:
// the **Déroulé** is the payload they came for, so it is the visual hero — not the prose.
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

// Seconds → the unit a coach actually says out loud. 180 → "3 min" beats "180 s" at arm's length;
// 90 → "1 min 30" keeps the remainder rather than rounding it away.
function fmtSec(s: number): string {
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${min} min ${rest}` : `${min} min`;
}

// Only the tiles that have a value — a missing figure is a non-event (§5.6), never an empty tile.
type Tile = { key: string; value: string; label: string };
const tiles = computed<Tile[]>(() => {
  const p = exercise.value?.protocol;
  if (!p) return [];
  const out: Tile[] = [];
  if (p.sets !== undefined) out.push({ key: 'sets', value: String(p.sets), label: 'Séries' });
  if (p.reps !== undefined) out.push({ key: 'reps', value: String(p.reps), label: 'Répétitions' });
  if (p.holdSec !== undefined)
    out.push({ key: 'hold', value: fmtSec(p.holdSec), label: 'Tenue' });
  if (p.restSec !== undefined)
    out.push({ key: 'rest', value: fmtSec(p.restSec), label: 'Repos' });
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
          <CategoryIcon :category="exercise.categoryId" class="w-4 h-4 shrink-0" :class="categoryTint" />
          {{ categoryLabel }}
        </span>
        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {{ exercise.title }}
        </h1>
        <!-- `instructions`, never the teaser: the coach read the teaser on the card and tapped
             *because of it* — echoing it here would spend the most valuable line of the page saying
             something already known (same rule as the contextual category, §5.1). Optional and
             self-hiding like every other detail section (§5.6). -->
        <p
          v-if="exercise.instructions"
          class="text-[15px] lg:text-base text-slate-700 dark:text-slate-300 leading-relaxed"
        >
          {{ exercise.instructions }}
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
        <span class="hidden sm:inline text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>

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

      <!-- Déroulé — the hero. Big figures, readable at arm's length; the label is the eyebrow (§3). -->
      <section v-if="tiles.length" class="flex flex-col gap-3">
        <h2 class="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300">
          Déroulé
        </h2>
        <!-- Tiles grow to fill the row but are capped: 3–4 of them divide it evenly, while 1–2 keep a
             sane size and pack left instead of stretching a lone figure across half the page. A fixed
             4-col grid was the other option, but it leaves a hole whenever a figure is absent — and
             absent is the norm here. Phones keep 2 columns: 4 across 390 px kills the glance. -->
        <ul class="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <li
            v-for="tile in tiles"
            :key="tile.key"
            class="card p-4 flex flex-col gap-1 items-center text-center sm:flex-1 sm:min-w-32 sm:max-w-64"
          >
            <span class="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {{ tile.value }}
            </span>
            <span
              class="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300"
            >
              {{ tile.label }}
            </span>
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
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          Sécurité
        </h2>
        <p class="text-[15px] lg:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
          {{ exercise.safety }}
        </p>
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
