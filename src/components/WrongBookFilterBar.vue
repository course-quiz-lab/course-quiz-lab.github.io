<script setup lang="ts">
import { computed } from 'vue';
import type { WrongBookFilterOptions } from '../utils/wrongbook';

const props = defineProps<{
  options: WrongBookFilterOptions;
}>();

const types = defineModel<string[]>('types', { required: true });
const courses = defineModel<string[]>('courses', { required: true });
const banks = defineModel<string[]>('banks', { required: true });
const search = defineModel<string>('search', { required: true });

const emit = defineEmits<{ clear: [] }>();

const toSelectItems = (
  options: { value: string; label: string; count: number }[],
) =>
  options.map((option) => ({
    value: option.value,
    label: `${option.label}（${option.count}）`,
  }));

const typeItems = computed(() => toSelectItems(props.options.types));
const courseItems = computed(() => toSelectItems(props.options.courses));
const bankItems = computed(() => toSelectItems(props.options.banks));

const hasActiveFilters = computed(
  () =>
    search.value.trim().length > 0 ||
    types.value.length > 0 ||
    courses.value.length > 0 ||
    banks.value.length > 0,
);
</script>

<template>
  <UCard :ui="{ body: 'p-4' }">
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <span
          class="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted"
        >
          <UIcon name="i-lucide-filter" class="size-4" />
          筛选
        </span>
        <UButton
          v-if="hasActiveFilters"
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-filter-x"
          label="清除筛选"
          @click="emit('clear')"
        />
      </div>

      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="搜索题干、选项或解析…"
        size="md"
        class="w-full"
      />
      <div class="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        <USelectMenu
          v-model="types"
          :items="typeItems"
          multiple
          value-key="value"
          placeholder="全部题型"
          icon="i-lucide-list-checks"
          size="md"
          :search-input="false"
          class="w-full"
        />
        <USelectMenu
          v-model="courses"
          :items="courseItems"
          multiple
          value-key="value"
          placeholder="全部课程"
          icon="i-lucide-book-open"
          size="md"
          class="w-full"
        />
        <USelectMenu
          v-model="banks"
          :items="bankItems"
          multiple
          value-key="value"
          placeholder="全部题库"
          icon="i-lucide-library"
          size="md"
          class="w-full"
        />
      </div>
    </div>
  </UCard>
</template>
