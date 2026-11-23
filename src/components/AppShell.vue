<script setup lang="ts">
import { useImmersiveMode } from '../composables/useImmersiveMode';
import AppFooter from './AppFooter.vue';
import AppHeader from './AppHeader.vue';

const { isImmersive } = useImmersiveMode();
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader v-if="!isImmersive" />

    <UMain class="flex-1">
      <UContainer :class="isImmersive ? 'py-4 sm:py-6' : 'py-8 lg:py-12'">
        <slot />
      </UContainer>
    </UMain>

    <AppFooter v-if="!isImmersive" />
  </div>
</template>
