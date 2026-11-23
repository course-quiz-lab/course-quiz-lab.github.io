<script setup lang="ts">
/**
 * 轻量分页适配层：内部完全使用 Nuxt UI 的 UPagination，
 * 对外仍暴露 current/total 语义，避免改动调用方。
 */
defineProps<{
  current: number;
  total: number;
  pageSize?: number;
}>();

const emit = defineEmits<{
  (e: 'update:current', page: number): void;
}>();
</script>

<template>
  <UPagination
    v-if="total > 1"
    :page="current"
    :total="total"
    :items-per-page="1"
    :sibling-count="1"
    :show-controls="false"
    class="flex items-center justify-center gap-1 pt-4"
    @update:page="emit('update:current', $event)"
  >
    <template #prev>
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-chevron-left"
        size="sm"
        square
        :disabled="current <= 1"
        aria-label="上一页"
      />
    </template>

    <template #item="{ item, page }">
      <UButton
        :label="String(item.value)"
        :variant="page === item.value ? 'solid' : 'ghost'"
        :color="page === item.value ? 'primary' : 'neutral'"
        size="sm"
        square
      />
    </template>

    <template #ellipsis>
      <span
        class="inline-flex size-8 select-none items-center justify-center text-xs text-muted"
      >
        …
      </span>
    </template>

    <template #next>
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-chevron-right"
        size="sm"
        square
        :disabled="current >= total"
        aria-label="下一页"
      />
    </template>
  </UPagination>
</template>
