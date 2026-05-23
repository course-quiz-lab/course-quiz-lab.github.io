<script setup lang="ts">
import { computed } from 'vue';
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    current: number;
    total: number;
    pageSize?: number;
  }>(),
  { pageSize: undefined },
);

const emit = defineEmits<{
  (e: 'update:current', page: number): void;
}>();

const totalPages = computed(() => Math.max(1, props.total));

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === props.current) return;
  emit('update:current', page);
}

const visiblePages = computed<(number | 'ellipsis')[]>(() => {
  const total = totalPages.value;
  const current = props.current;
  const pages: (number | 'ellipsis')[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('ellipsis');

  pages.push(total);

  return pages;
});
</script>

<template>
  <div
    v-if="totalPages > 1"
    class="flex items-center justify-center gap-1 pt-4"
  >
    <button
      class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[color:var(--border)] bg-surface text-muted cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:border-brand transition-colors duration-150"
      :disabled="current <= 1"
      @click="goToPage(current - 1)"
    >
      <AppIcon :path="mdiChevronLeft" :size="16" />
    </button>

    <template v-for="(item, idx) in visiblePages" :key="idx">
      <span
        v-if="item === 'ellipsis'"
        class="inline-flex items-center justify-center w-8 h-8 text-xs text-muted select-none"
      >
        …
      </span>
      <button
        v-else
        class="inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-lg border transition-colors duration-150 cursor-pointer"
        :class="
          item === current
            ? 'border-brand bg-brand text-white'
            : 'border-[color:var(--border)] bg-surface text-muted hover:border-brand'
        "
        @click="goToPage(item)"
      >
        {{ item }}
      </button>
    </template>

    <button
      class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[color:var(--border)] bg-surface text-muted cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:border-brand transition-colors duration-150"
      :disabled="current >= totalPages"
      @click="goToPage(current + 1)"
    >
      <AppIcon :path="mdiChevronRight" :size="16" />
    </button>
  </div>
</template>
