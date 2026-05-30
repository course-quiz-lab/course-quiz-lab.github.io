<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import ImportStepIndicator from '../../components/import/ImportStepIndicator.vue';

const route = useRoute();

const currentStep = computed<1 | 2 | 3>(() => {
  const name = route.name as string;
  if (name === 'import-select') return 1;
  if (name === 'import-preview') return 3;
  return 2;
});
</script>

<template>
  <div class="flex flex-col gap-8 sm:gap-5">
    <div class="max-w-[720px] mx-auto px-4 w-full mb-2 lg:mb-4">
      <ImportStepIndicator :current-step="currentStep" class="!mb-0" />
    </div>
    <div class="mx-auto px-4 w-full max-w-[1024px]">
      <RouterView v-slot="{ Component }">
        <Transition name="slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.25s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}
</style>
