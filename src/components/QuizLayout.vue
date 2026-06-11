<script setup lang="ts">
import AnswerSheet from './AnswerSheet.vue';

defineProps<{
  total: number;
  statuses: string[];
  currentIndex?: number;
  currentPage?: number;
  pageSize?: number;
  shouldShowCurrent?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', index: number): void;
}>();
</script>

<template>
  <div
    class="grid gap-[26px] grid-cols-[minmax(0,1fr)_300px] max-lg:!grid-cols-1"
  >
    <div class="grid gap-4 max-lg:order-last">
      <slot />
    </div>

    <AnswerSheet
      :total="total"
      :statuses="statuses"
      :current-index="currentIndex"
      :should-show-current="shouldShowCurrent"
      @select="emit('select', $event)"
    />
  </div>
</template>
