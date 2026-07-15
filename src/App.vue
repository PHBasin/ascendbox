<script setup lang="ts">
// Shell only. Every screen-specific chrome (the sticky search/scope bar, the detail page's back nav)
// belongs to its own view — the shell just holds what is true on every route.
</script>

<template>
  <div class="min-h-screen font-sans">
    <RouterView />
  </div>
</template>
