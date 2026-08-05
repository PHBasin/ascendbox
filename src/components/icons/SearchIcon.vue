<script setup lang="ts">
// Magnifier. Decorative (`aria-hidden`, inherits `currentColor`); the control's `aria-label` carries
// the meaning. Size comes from the call site's `class`, same contract as CategoryIcon.vue.
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
</template>
