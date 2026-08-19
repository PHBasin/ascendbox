<script setup lang="ts">
// Category eyebrow: the tinted icon + label pair, shared by the card (global search) and the detail
// page's identity block. The one place the id → label / id → tint mapping is resolved for this badge,
// so the card and the detail can no longer drift. Icon + label, never a filled pill - that shape is
// reserved for controls (§1.5); the tint is reinforcement only (§2.1), the label carries meaning.
import { computed } from 'vue';
import { CATEGORY_LABELS, type CategoryId } from '@/domain/exercise';
import { CATEGORY_TINT } from './categoryStyles';
import CategoryIcon from './CategoryIcon.vue';

const props = defineProps<{ category: CategoryId }>();

const label = computed(() => CATEGORY_LABELS[props.category]);
const tint = computed(() => CATEGORY_TINT[props.category]);
</script>

<template>
  <span class="meta-chip">
    <CategoryIcon :category="category" class="w-4 h-4 shrink-0" :class="tint" />
    {{ label }}
  </span>
</template>
