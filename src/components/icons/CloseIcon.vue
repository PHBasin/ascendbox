<script setup lang="ts">
// Dismiss cross. Decorative (`aria-hidden`, inherits `currentColor`); the control's `aria-label`
// carries the meaning. Size comes from the call site's `class`, same contract as CategoryIcon.vue.
//
// `stroke-width="2.5"`, heavier than the 2 the other glyphs use: at 14–16px a cross drawn at 2 reads
// as a smudge rather than two strokes.
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
</template>
