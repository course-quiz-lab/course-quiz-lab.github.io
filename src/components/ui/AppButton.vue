<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    to?: string;
    variant?: 'solid' | 'ghost';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    iconPath?: string;
    iconSize?: number | string;
  }>(),
  {
    variant: 'solid',
    type: 'button',
    disabled: false,
    iconPath: undefined,
    iconSize: 16,
  },
);

const isLink = computed(() => !!props.to);
const classes = computed(() => [
  'inline-flex items-center gap-2 border-none rounded-full px-[18px] py-[10px] text-sm cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed',
  props.variant === 'ghost'
    ? 'bg-transparent text-brand-strong border border-[rgba(43,34,24,0.12)]'
    : 'bg-brand text-white',
  props.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
]);
</script>

<template>
  <component
    :is="isLink ? RouterLink : 'button'"
    :to="isLink ? props.to : undefined"
    :type="!isLink ? props.type : undefined"
    :disabled="!isLink ? props.disabled : undefined"
    :class="classes"
    :aria-disabled="props.disabled ? 'true' : undefined"
  >
    <span v-if="props.iconPath" class="inline-flex shrink-0">
      <AppIcon :path="props.iconPath" :size="props.iconSize" />
    </span>
    <span class="inline-flex items-center">
      <slot />
    </span>
  </component>
</template>
