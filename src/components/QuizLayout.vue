<script setup lang="ts">
import { computed } from 'vue';
import AnswerSheet from './AnswerSheet.vue';

const props = defineProps<{
  total: number;
  statuses: string[];
  currentIndex?: number;
  /** For paginated mode (整卷视图): which page is active */
  currentPage?: number;
  /** Items per page in paginated mode */
  pageSize?: number;
}>();

const emit = defineEmits<{
  (e: 'select', index: number): void;
}>();

const visibleStart = computed(() => {
  if (props.currentPage != null && props.pageSize) {
    return (props.currentPage - 1) * props.pageSize;
  }
  // Single-question mode: scroll to the current question
  return props.currentIndex ?? 0;
});

const visibleEnd = computed(() => {
  if (props.currentPage != null && props.pageSize) {
    return Math.min(props.currentPage * props.pageSize, props.total) - 1;
  }
  // Single-question mode: show a small window around current question
  return Math.min((props.currentIndex ?? 0) + 2, props.total - 1);
});
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
      :visible-start="visibleStart"
      :visible-end="visibleEnd"
      @select="emit('select', $event)"
    />
  </div>
</template>
