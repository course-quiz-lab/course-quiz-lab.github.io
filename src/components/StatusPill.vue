<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: 'correct' | 'partial' | 'wrong' | 'unanswered' | 'answered';
}>();

const labelMap: Record<string, string> = {
  correct: '正确',
  partial: '部分正确',
  wrong: '错误',
  unanswered: '未作答',
  answered: '已作答',
};

const iconMap: Record<string, string> = {
  correct: 'i-lucide-check',
  partial: 'i-lucide-minus',
  wrong: 'i-lucide-x',
};

const colorMap: Record<
  string,
  'success' | 'warning' | 'error' | 'primary' | 'neutral'
> = {
  correct: 'success',
  partial: 'warning',
  wrong: 'error',
  answered: 'primary',
  unanswered: 'neutral',
};

const showIcon = computed(() =>
  ['correct', 'partial', 'wrong'].includes(props.status),
);
const showPill = computed(() => props.status !== 'unanswered');
</script>

<template>
  <UBadge
    v-if="showPill"
    :color="colorMap[props.status] ?? 'neutral'"
    variant="soft"
    size="md"
    :icon="showIcon ? iconMap[props.status] : undefined"
  >
    {{ labelMap[props.status] }}
  </UBadge>
</template>
