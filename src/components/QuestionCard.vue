<script setup lang="ts">
import { computed } from 'vue';
import type { QuestionItem } from '../types/quiz';
import StatusPill from './StatusPill.vue';

const props = defineProps<{
  question: QuestionItem;
  index: number;
  total: number;
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
  <section
    class="bg-surface rounded-2xl p-5 max-sm:p-4 border border-[rgba(43,34,24,0.12)]"
  >
    <div class="text-xs uppercase tracking-wide text-muted">
      第 {{ index + 1 }} 题 / {{ name }}
    </div>
    <div class="flex items-start justify-between gap-3 mt-2">
      <div class="text-base max-sm:text-sm min-w-0 flex-1">
        {{ question.stem }}
      </div>
      <StatusPill :status="status" class="shrink-0 mt-0.5" />
    </div>
    <div class="mt-4">
      <slot />
    </div>
    <div
      v-if="showFeedback"
      class="mt-4 pt-3 border-t border-dashed border-[rgba(43,34,24,0.12)] grid gap-2 text-sm"
    >
      <div>
        <span class="text-xs font-medium text-muted">参考答案</span>
        <span class="ml-2">{{ answerText || '暂无' }}</span>
      </div>
      <div v-if="question.analysis">
        <span class="text-xs font-medium text-muted">解析</span>
        <span class="ml-2">{{ question.analysis }}</span>
      </div>
      <div v-if="question.difficulty">
        <span class="text-xs font-medium text-muted">难度</span>
        <span class="ml-2">{{ question.difficulty }}</span>
      </div>
    </div>
  </section>
</template>
