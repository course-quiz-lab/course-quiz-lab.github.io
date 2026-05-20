<script setup lang="ts">
const model = defineModel<boolean>({ default: false });
</script>

<template>
  <label class="flex items-center gap-3 cursor-pointer select-none group">
    <span
      class="relative w-5 h-5 flex items-center justify-center rounded-md border-2 border-[color:var(--border)] transition-colors duration-150 group-has-[:checked]:bg-brand group-has-[:checked]:border-brand"
    >
      <input type="checkbox" v-model="model" class="sr-only" />
      <svg
        v-show="model"
        class="w-3 h-3 text-white"
        viewBox="0 0 12 12"
        fill="none"
      >
        <path
          d="M2 6l3 3 5-5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span class="text-sm">
      <slot />
    </span>
  </label>
</template>
