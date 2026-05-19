<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    path: string;
    size?: number | string;
    viewBox?: string;
  }>(),
  {
    size: 18,
    viewBox: '0 0 24 24',
  },
);
</script>

<template>
  <svg
    :viewBox="props.viewBox"
    :width="props.size"
    :height="props.size"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="props.path" fill="currentColor" />
  </svg>
</template>
