<script setup lang="ts">
import { computed } from 'vue';
import { useExercise } from '@/application/useExercises';
import { CATEGORY_LABELS, LEVEL_LABELS } from '@/domain/exercise';
import { CATEGORY_TINT, CATEGORY_RULE } from '@/components/categoryStyles';
import CategoryIcon from '@/components/CategoryIcon.vue';

// Exercise detail (DESIGN §5.6), read-only. The coach reads this standing at the wall, in a hurry:
// the **Déroulement** is the payload they came for, so it is a scannable list — never a paragraph.
const props = defineProps<{ id: string }>();

const { exercise, notFound, isLoading, error } = useExercise(() => Number(props.id));

// All three are read only inside `v-else-if="exercise"`, but a computed evaluates regardless — hence
// the same guard on each, falling back to '' until the catalogue lands.
const categoryLabel = computed(() =>
  exercise.value ? CATEGORY_LABELS[exercise.value.categoryId] : ''
);
const categoryTint = computed(() =>
  exercise.value ? CATEGORY_TINT[exercise.value.categoryId] : ''
);
const categoryRule = computed(() =>
  exercise.value ? CATEGORY_RULE[exercise.value.categoryId] : ''
);

// The spec block's three planning facts, in reading order. Built here rather than spelled out three
// times in the template so the cells cannot drift apart typographically — the whole point of the
// block is that its values read as siblings. `Matériel` is the only variable-length one, so it takes
// the full row on phones; the other two are short and fixed.
type Spec = { key: string; label: string; value: string; wide: boolean };
const specs = computed<Spec[]>(() => {
  const e = exercise.value;
  if (!e) return [];
  const out: Spec[] = [
    { key: 'duration', label: 'Durée', value: `${e.duration} min`, wide: false },
    { key: 'level', label: 'Niveau', value: LEVEL_LABELS[e.level], wide: false },
  ];
  if (e.equipment?.length) {
    out.push({ key: 'kit', label: 'Matériel', value: e.equipment.join(' · '), wide: true });
  }
  return out;
});

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
        class="pill-action inline-flex items-center gap-2 px-4 min-h-11 font-bold text-sm sm:text-base lg:text-lg"
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
      <RouterLink to="/" class="btn-ink"> Voir le catalogue </RouterLink>
    </div>

    <!-- `gap-8` = the §4 Section tier. The page is a sequence of distinct sections, not a column of
         paragraphs, and 24px (the container tier) read as one undifferentiated stack. -->
    <article v-else-if="exercise" class="flex flex-col gap-8">
      <!-- Identity block. The category rule spans eyebrow + title + objective, so the pillar reads as
           the identity of the whole block rather than a mark next to a word — legible at arm's length
           in sunlight, where a 16px icon is not. It is a **third** channel on top of the icon and the
           label (§2.1): pure reinforcement, so grayscale loses nothing. -->
      <header class="flex gap-4">
        <span :class="categoryRule" class="w-1 shrink-0 rounded-full" aria-hidden="true" />
        <div class="flex flex-col gap-2 min-w-0">
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
          <h1
            class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
          >
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
      </header>

      <!-- Spec block — the planning facts, read before committing to the exercise.
           A labelled `<dl>` grid, not a row of icon+value pairs: the label is *visible* rather than
           `sr-only`, so sighted and screen-reader users get the same page and no icon has to be
           decoded (a dumbbell meaning "level" is a rebus, not a label). Every value is the same type,
           which is what makes the block read as a spec sheet instead of three unrelated facts.
           The grid also retires the middot problem outright — cells never need separators, so it
           wraps freely at any width, which is what §5.6's wrapping rule asks for. -->
      <dl
        class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 py-4 border-y border-slate-200 dark:border-slate-700"
      >
        <div
          v-for="spec in specs"
          :key="spec.key"
          class="flex flex-col gap-1"
          :class="spec.wide ? 'col-span-2 sm:col-span-1' : ''"
        >
          <dt class="eyebrow">
            {{ spec.label }}
          </dt>
          <dd class="text-base font-bold text-slate-900 dark:text-slate-50">{{ spec.value }}</dd>
        </div>
      </dl>

      <!-- Déroulement — the page's signature, and its payload. It carries the figures the removed
           `protocol` tiles used to hold ("3 min de récup", "5 s par bras").
           **Numbered, on a spine.** A déroulement *is* a sequence, so order is information the coach
           needs rather than decoration: the numbers give a spoken anchor mid-session ("j'en suis à la
           3") that a bullet cannot, and the connecting rule binds the steps into one object, which is
           what someone glancing back down at a phone re-finds their place in.
           Nodes are **pure ink** — maximum contrast for sunlight, and no hue to lose in grayscale or
           to a colour-vision difference (§1.3). -->
      <section v-if="exercise.instructions?.length" class="flex flex-col gap-4">
        <h2 class="eyebrow">Déroulement</h2>
        <ol>
          <li
            v-for="(step, i) in exercise.instructions"
            :key="i"
            class="group relative flex gap-4 pb-5 last:pb-0"
          >
            <!-- Drawn per-step and hidden on the last: a rule trailing past the final step reads as
                 an unfinished list. -->
            <span
              class="absolute left-4 top-8 bottom-0 w-0.5 -translate-x-1/2 bg-slate-200 dark:bg-slate-700 group-last:hidden"
              aria-hidden="true"
            />
            <span
              class="relative grid place-items-center w-8 h-8 shrink-0 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-sm font-bold tabular-nums"
              aria-hidden="true"
            >
              {{ i + 1 }}
            </span>
            <!-- `pt-1` centres the first text line against the 32px node; without it the step rides
                 high and the number stops looking like it belongs to its sentence. -->
            <p
              class="pt-1 text-[15px] lg:text-base text-slate-700 dark:text-slate-300 leading-relaxed"
            >
              {{ step }}
            </p>
          </li>
        </ol>
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
        <h2 class="eyebrow">Adapter</h2>
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
                class="flex gap-3 text-[15px] lg:text-base text-slate-700 dark:text-slate-300 leading-relaxed"
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

      <!-- Tags = flat metadata, never pills (pills are for controls — DESIGN §5.4/§1.5).
           **No rule above them.** One here looked right on a full page and broke an empty one: with
           no detail data the tags follow the spec block directly, and its closing border plus this
           one framed 32px of nothing — a visible empty band, which is precisely the shell §5.6 says
           a missing section must never produce. The spec block's own border already closes the
           record; a second rule was an accessory. -->
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
