<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { useRouter } from 'vue-router';
import AppIcon from './AppIcon.vue';

const props = defineProps<{
  title: string;
  maxWidth?: string;
  showBack?: boolean;
}>();

const router = useRouter();

function goBack() {
  router.back();
}
</script>

<template>
  <div
    class="page"
    :style="
      maxWidth
        ? { maxWidth: maxWidth, marginLeft: 'auto', marginRight: 'auto' }
        : undefined
    "
  >
    <div class="flex items-center gap-3 mb-6">
      <button
        v-if="showBack"
        class="border-none bg-transparent p-2 -ml-2 rounded-full cursor-pointer text-muted hover:bg-surface-soft hover:text-foreground transition-colors shrink-0"
        @click="goBack"
      >
        <AppIcon :path="mdiArrowLeft" :size="24" />
      </button>
      <h1 class="text-3xl max-sm:text-2xl m-0">{{ title }}</h1>
      <slot name="header-actions" />
    </div>

    <slot name="subtitle" />
    <slot />
  </div>
</template>
