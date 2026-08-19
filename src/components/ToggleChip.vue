<script setup lang="ts">
// One selectable filter option (DESIGN §5.5): the shared toggle button used by every section of the
// filter sheet (Durée, Niveau, Tags). Skin + asymmetric select/deselect timing come from
// `.toggle-on`/`.toggle-off` + `TOGGLE_ON`/`TOGGLE_OFF` (§6). Box (px/min-h) lives here since all
// three sections share it exactly. Content is a slot so the tag section can pass its `#` prefix.
//
// Not shared with CategoryScope's pills: those carry an icon, `flex-auto` sizing and their own
// arrival duration - a different box, deliberately not fused (skin, never box - §10/§11).
import { TOGGLE_ON, TOGGLE_OFF } from './toggleStyles';

defineProps<{ pressed: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <button
    type="button"
    :aria-pressed="pressed"
    class="px-4 min-h-11 rounded-full font-medium text-sm ring-1"
    :class="pressed ? TOGGLE_ON : TOGGLE_OFF"
    @click="$emit('toggle')"
  >
    <slot />
  </button>
</template>
