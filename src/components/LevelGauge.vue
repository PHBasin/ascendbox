<script setup lang="ts">
import { LEVEL_LABELS, type Level } from '@/domain/exercise';

// Level = filled-bar count + the word, never hue (DESIGN §2.3). Drawn as an icon-sized glyph of 3
// ascending bars so it reads as a sibling of the duration's clock rather than a foreign widget. The
// bars are decorative (`aria-hidden`); the word carries the meaning, so this passes a grayscale and a
// screen-reader test alike.
//
// **Card-only.** The bars pay for themselves where levels are *scanned* — a filled count compares
// across a grid faster than a word reads. The detail page's spec block is read one exercise at a
// time and prints the word plain, so its three values stay typographic siblings (§5.6).
defineProps<{ level: Level }>();

// Bars above the level: dimmed, never absent — an empty slot is what makes the count readable.
const MUTED = 'stroke-slate-300 dark:stroke-slate-600';
</script>

<template>
  <span
    class="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
  >
    <svg
      class="w-3.5 h-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M5 20v-4" :class="level >= 1 ? '' : MUTED" />
      <path d="M12 20v-8" :class="level >= 2 ? '' : MUTED" />
      <path d="M19 20v-12" :class="level >= 3 ? '' : MUTED" />
    </svg>
    <span><span class="sr-only">Niveau : </span>{{ LEVEL_LABELS[level] }}</span>
  </span>
</template>
