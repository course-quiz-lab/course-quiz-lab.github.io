<script setup lang="ts">
import { computed } from 'vue';
import type { QuestionItem } from '../types/bank';
import StatusPill from './StatusPill.vue';

const props = defineProps<{
  question: QuestionItem;
  index: number;
  status: 'correct' | 'partial' | 'wrong' | 'unanswered' | 'answered';
  showFeedback: boolean;
  answerText: string;
}>();

const name = computed(
  () =>
    ({
      single: '单项选择题',
      multiple: '多项选择题',
      indeterminate: '不定项选择题',
      judge: '判断题',
    })[props.question.type] || 'question',
);
</script>

<template>
  <UCard :ui="{ body: 'p-5 sm:p-6' }">
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span class="font-medium text-highlighted">
          第 {{ index + 1 }} 题
        </span>
        <span class="text-dimmed">/</span>
        <span class="text-muted">{{ name }}</span>
      </div>
      <StatusPill :status="status" class="shrink-0" />
    </div>

    <p class="mt-3 text-base leading-relaxed text-highlighted">
      {{ question.stem }}
    </p>

    <div class="mt-4">
      <slot />
    </div>

    <div
      v-if="showFeedback"
      class="mt-5 space-y-2.5 rounded-lg border border-default bg-elevated p-4 text-sm"
    >
      <div class="flex gap-2">
        <span class="shrink-0 text-xs font-medium text-muted">参考答案</span>
        <span class="text-highlighted">{{ answerText || '暂无' }}</span>
      </div>
      <div v-if="question.analysis" class="flex gap-2">
        <span class="shrink-0 text-xs font-medium text-muted">解析</span>
        <span class="text-default">{{ question.analysis }}</span>
      </div>
      <div v-if="question.difficulty" class="flex gap-2">
        <span class="shrink-0 text-xs font-medium text-muted">难度</span>
        <span class="text-default">{{ question.difficulty }}</span>
      </div>
    </div>
  </UCard>
</template>
