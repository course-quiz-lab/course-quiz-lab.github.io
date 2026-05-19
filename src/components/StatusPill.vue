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

const statusClass = computed(() => {
  const base =
    'px-3 py-1.5 rounded-full text-xs inline-flex items-center justify-center';
  const map: Record<string, string> = {
    correct: 'bg-[rgba(47,133,90,0.14)] text-ok',
    partial: 'bg-[rgba(226,181,109,0.2)] text-warn',
    wrong: 'bg-[rgba(185,74,60,0.15)] text-danger',
    unanswered: 'bg-[#f5f1ea] text-muted',
    answered: 'bg-[rgba(47,111,107,0.12)] text-brand-strong',
  };
  return `${base} ${map[props.status]}`;
});
</script>

<template>
  <span :class="statusClass">{{ labelMap[props.status] }}</span>
</template>
