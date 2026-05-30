<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'hero';
  }>(),
  {
    variant: 'default',
  },
);

const classes = {
  default:
    'w-full bg-surface rounded-2xl p-[26px] border border-[color:var(--border)]',
  hero: 'w-full bg-gradient-to-br from-[color:var(--surface-hero)] to-[color:var(--surface-hero-alt)] rounded-xl p-[26px] border border-[color:var(--border)]',
};
</script>

<template>
  <section :class="classes[props.variant]">
    <slot />
  </section>
</template>
