<script setup lang="ts">
import { computed } from 'vue';
import { CATEGORIES, type Exercise, type CategoryId } from '@/domain/exercise';
import CategoryIcon from './CategoryIcon.vue';
import LevelGauge from './LevelGauge.vue';

// `showCategory` is true only when the feed spans categories (global search); under a
// single-category scope the badge would just repeat the active scope, so the feed leaves it off.
const props = defineProps<{ exercise: Exercise; showCategory?: boolean }>();

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
// Sane ceiling, not the guarantee — the 1-line rule is enforced in CSS (DESIGN §5.4), because a
// *count* cannot promise a line: three short tags fit where two long ones would not. 3 = the widest
// entry in the catalogue, so it currently truncates nothing while still stopping a 20-tag entry from
// even trying. Was 2, which hid a tag on one exercise for no stated reason.
const visibleTags = computed(() => props.exercise.tags.slice(0, 3));
</script>

<template>
  <!-- `group` so the chevron can answer the card's hover as one object. -->
  <article
    class="card group relative active:scale-[0.98] flex flex-col gap-3 hover:border-slate-300 dark:hover:border-slate-600"
  >
    <!-- Category — search only: under a single-category scope it would just repeat the active scope
         (DESIGN §5.1). Icon + label, never a filled pill: that shape is reserved for controls (§1.5). -->
    <span
      v-if="showCategory"
      class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
    >
      <CategoryIcon :category="exercise.categoryId" class="w-4 h-4 shrink-0" :class="categoryTint" />
      {{ categoryLabel }}
    </span>

    <!-- Title leads; it owns the full row now that duration moved down to the status strip. -->
    <div class="flex flex-col gap-1 min-w-0">
      <!-- h2: each card is a top-level section under the page h1 (no intermediate h2 on the feed),
           so h2 keeps the heading order sequential (Lighthouse heading-order). Size is set by the
           classes, not the tag. -->
      <h2 class="text-base lg:text-lg font-bold leading-tight text-slate-900 dark:text-slate-50">
        <!-- Stretched link (DESIGN §3, title-link): the `after` overlay makes the *whole card* the
             hit area — mandatory for gloved, in-a-hurry use (§1.2) — while the link's accessible
             name stays just the title, not the card's entire text. The card holds no other
             interactive element, so the overlay traps no clicks. -->
        <RouterLink
          :to="{ name: 'exercise', params: { id: exercise.id } }"
          class="after:content-[''] after:absolute after:inset-0 after:rounded-3xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-slate-900 dark:focus-visible:after:ring-slate-50"
        >
          {{ exercise.title }}
        </RouterLink>
      </h2>
      <!-- `line-clamp-3` is a guarantee, not a cut: measured over the whole catalogue, **no
           description exceeds 3 lines** at either breakpoint, so today it truncates nothing — it costs
           the reader nothing while bounding what a card can ever become. Without it, one long entry
           (the JSON is hand-authored and validated nowhere) would silently grow its card and ragged the
           grid, in production, months later. A clamp that never fires is free.
           `-2` would truncate 68% of the catalogue on a phone (29 of them Mental, whose prose is the
           exercise and has nothing to extract). Once descriptions are rewritten as ≤71-char teasers
           (§5.1) they all fall to 2 lines and this can tighten to `-2` — still never firing. -->
      <p
        class="text-[15px] lg:text-base text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3"
      >
        {{ exercise.teaser }}
      </p>
    </div>

    <!-- Metadata block, pinned as one unit (`mt-auto`): tags + rule + status strip. Pinning the whole
         block puts the card's slack on the **content↔metadata boundary**; pinning only the strip put
         it *inside* this block, splitting the tags from the rule they belong with. The block lands at
         the same height across a grid row whatever the teaser's length. -->
    <div class="mt-auto flex flex-col gap-3">
      <!-- Tags = metadata, not controls → flat text. The filter sheet's tag *pills* are tappable; a
           pill here would promise a filter and instead navigate to the detail (DESIGN §5.4/§1.5).
           **Hard 1-line guarantee** (DESIGN §5.4): `max-h-[1lh]` + `overflow-hidden`. Keeping
           `flex-wrap` is what makes it clean — a tag that does not fit moves to a second line that is
           clipped *whole*. `flex-nowrap` would clip mid-word instead ("#lect"). The count cap is only
           a sane default; this is the promise.
           `text-xs` on the *list* is load-bearing, not redundant with the items': `lh` resolves against
           the element's **own** line-height, so without it the ul inherits the parent's 24 px and
           `1lh` lets half a second row through — clipping tags in two. -->
      <ul
        v-if="visibleTags.length"
        class="flex flex-wrap gap-x-3 gap-y-1 text-xs max-h-[1lh] overflow-hidden"
      >
        <li
          v-for="tag in visibleTags"
          :key="tag"
          class="text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          #{{ tag }}
        </li>
      </ul>

      <!-- Status strip: the two facts you triage on (how long · how hard), grouped, then the chevron.
           The rule separates "what it is" from "qualify it, then go". Identical in both modes. -->
      <div class="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
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
          <span class="sr-only">Durée : </span>{{ exercise.duration }} min
        </span>

        <!-- Separator, not extra space: a meta row's gap is the Group tier (12, §4) and must stay
             there, but 12 against the 6 inside each group is only 2× — too weak once the gauge's
             solid bars grab the adjacent text. The middot separates typographically instead. -->
        <span class="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>

        <LevelGauge :level="exercise.level" />

        <!-- Affordance: on touch there is no hover, so the card needs a resting mark saying "this
             leads somewhere" — without it the detail page is undiscoverable. A chevron signals it
             without posing as a separate control: the hit area stays the whole card, and no button
             is nested inside the link. Decorative — the link's name is the title. -->
        <svg
          class="ml-auto w-5 h-5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </article>
</template>
