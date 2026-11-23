<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps<{
  title: string;
  description?: string;
  maxWidth?: string;
  showBack?: boolean;
}>();

const route = useRoute();
const router = useRouter();

const shouldShowBack = computed(
  () => props.showBack ?? Boolean(route.meta?.back),
);

function goBack() {
  const back = route.meta?.back as string | undefined;
  if (back) {
    router.push(back);
  } else {
    router.back();
  }
}
</script>

<template>
  <div class="page mx-auto w-full" :style="maxWidth ? { maxWidth } : undefined">
    <div class="space-y-3">
      <UButton
        v-if="shouldShowBack"
        variant="link"
        color="neutral"
        icon="i-lucide-arrow-left"
        size="sm"
        class="px-0 text-muted"
        @click="goBack"
      >
        返回
      </UButton>

      <UPageHeader
        :title="title"
        :description="description"
        :ui="{
          root: 'border-b-0 py-0',
          container: 'px-0',
          title: 'text-2xl font-semibold tracking-tight sm:text-3xl',
          description: 'mt-2 text-sm text-muted',
        }"
      >
        <template v-if="$slots['header-actions']" #links>
          <slot name="header-actions" />
        </template>
      </UPageHeader>

      <slot name="subtitle" />
    </div>

    <slot />
  </div>
</template>
