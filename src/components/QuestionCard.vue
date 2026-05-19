<script setup lang="ts">
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
</script>

<template>
  <section
    class="bg-surface rounded-[18px] p-[26px] border border-[rgba(43,34,24,0.12)]"
  >
    <header class="flex justify-between gap-4">
      <div>
        <div class="text-xs uppercase tracking-wide text-muted">
          第 {{ index + 1 }} 题 / {{ total }}
        </div>
        <div class="text-lg mt-1.5">{{ question.stem }}</div>
      </div>
      <StatusPill :status="status" />
    </header>
    <div class="mt-[18px]">
      <slot />
    </div>
    <div
      v-if="showFeedback"
      class="mt-[18px] pt-[12px] border-t border-dashed border-[rgba(43,34,24,0.12)] grid gap-[6px] text-muted"
    >
      <div>
        <span class="text-xs uppercase tracking-wide">参考答案</span>
        <span class="text-[#2f2a35] ml-2">{{ answerText || '暂无' }}</span>
      </div>
      <div v-if="question.analysis">
        <span class="text-xs uppercase tracking-wide">解析</span>
        <span class="text-[#2f2a35] ml-2">{{ question.analysis }}</span>
      </div>
      <div v-if="question.difficulty">
        <span class="text-xs uppercase tracking-wide">难度</span>
        <span class="text-[#2f2a35] ml-2">{{ question.difficulty }}</span>
      </div>
    </div>
  </section>
</template>
