<script setup lang="ts">
// Category icon map (DESIGN §2.1 / §11): dumbbell · target · spark.
// Decorative reinforcement only — the visible label carries the meaning, so
// the SVG is aria-hidden and inherits `currentColor`. Size/colour via the caller.
import type { CategoryId } from '@/domain/exercise';

defineProps<{ category: CategoryId }>();
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
    <!-- Physique → dumbbell -->
    <template v-if="category === 'physique'">
      <path d="M4 9v6" />
      <path d="M7 7v10" />
      <path d="M17 7v10" />
      <path d="M20 9v6" />
      <path d="M7 12h10" />
    </template>

    <!-- Technique → target -->
    <template v-else-if="category === 'technique'">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </template>

    <!-- Mental → spark -->
    <template v-else>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10z" />
    </template>
  </svg>
</template>
