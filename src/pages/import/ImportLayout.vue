<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import ImportStepIndicator from '../../components/import/ImportStepIndicator.vue';

const route = useRoute();

const currentStep = computed<1 | 2 | 3>(() => {
  const name = route.name as string;
  if (name === 'import-select') return 1;
  if (name === 'import-preview' || name === 'import-cloud-progress') return 3;
  return 2;
});
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-8">
    <div class="space-y-3">
      <UButton
        to="/"
        variant="link"
        color="neutral"
        size="sm"
        icon="i-lucide-arrow-left"
        class="px-0 text-muted"
        label="返回首页"
      />
      <div>
        <h1
          class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl"
        >
          导入题库
        </h1>
        <p class="mt-1 text-sm text-muted">
          支持 JSON（上传或链接读取）、Excel
          与云端题库，导入后保存在本地浏览器。
        </p>
      </div>
    </div>

    <ImportStepIndicator :current-step="currentStep" />

    <RouterView v-slot="{ Component }">
      <Transition name="fade-slide" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
