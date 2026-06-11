<script setup lang="ts">
import StatusPill from './StatusPill.vue';
import AppCard from './ui/AppCard.vue';
import type { QuestionItem } from '../types/bank';
import type { QuestionType } from '../types/core';

const props = defineProps<{
  question: QuestionItem;
  status: string;
  paperTitle?: string;
  attemptDate?: number;
  attemptMode?: string;
  wrongCount?: number;
  selectedAnswer: string[];
}>();

function typeLabel(type: QuestionType) {
  const map: Record<QuestionType, string> = {
    single: '单选',
    multiple: '多选',
    indeterminate: '不定项',
    judge: '判断',
  };
  return map[type] || '未知';
}

function formatAnswer(question: QuestionItem) {
  if (question.type === 'judge') {
    return question.answer
      .map((id) => (id === 'T' ? '正确' : '错误'))
      .join(' / ');
  }
  return question.answer.join(' / ');
}

function userSelectedFormat(question: QuestionItem, selected: string[]) {
  if (selected.length === 0) return '未作答';
  if (question.type === 'judge') {
    return selected.map((id) => (id === 'T' ? '正确' : '错误')).join(' / ');
  }
  return selected.join(' / ');
}
</script>

<template>
  <AppCard>
    <div
      v-if="
        paperTitle ||
        (wrongCount && wrongCount > 1) ||
        attemptDate ||
        attemptMode
      "
      class="flex items-center gap-2 text-[11px] text-muted mb-3 flex-wrap"
    >
      <span
        v-if="paperTitle"
        class="px-2 py-0.5 rounded border border-[color:var(--border)] bg-surface-soft"
      >
        {{ paperTitle }}
      </span>
      <span
        v-if="wrongCount && wrongCount > 1"
        class="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-medium"
      >
        错 {{ wrongCount }} 次
      </span>
      <template v-if="attemptDate">
        <span>·</span>
        <span>{{ new Date(attemptDate).toLocaleDateString('zh-CN') }}</span>
      </template>
      <template v-if="attemptMode">
        <span>·</span>
        <span>{{ attemptMode === 'exam' ? '考试' : '练习' }}</span>
      </template>
    </div>

    <div class="mb-3 text-base font-medium">
      {{ question.stem }}
    </div>

    <div
      v-if="question.options.length > 0"
      class="mb-3 pl-4 border-l-2 border-[color:var(--border)]"
    >
      <div
        v-for="opt in question.options"
        :key="opt.id"
        class="text-sm py-1 px-2 -mx-2 rounded"
        :class="
          question.answer.includes(opt.id) ? 'bg-[rgba(47,133,90,0.1)]' : ''
        "
      >
        <span class="font-medium mr-2">{{ opt.id }}.</span>
        <span class="text-foreground">{{ opt.text }}</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <StatusPill :status="status as any" />
      <span class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted">
        {{ typeLabel(question.type) }}
      </span>
      <span class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted">
        您的作答：{{ userSelectedFormat(question, selectedAnswer) }}
      </span>
      <span
        class="bg-[rgba(47,133,90,0.14)] text-ok rounded-full px-2.5 py-1 text-xs border border-brand/20 bg-brand/5 text-brand"
      >
        参考答案：{{ formatAnswer(question) }}
      </span>
    </div>

    <div
      v-if="question.analysis"
      class="mt-3 pt-3 border-t border-[color:var(--border)] text-sm text-muted"
    >
      <span class="font-medium text-foreground block mb-1">解析：</span>
      {{ question.analysis }}
    </div>
  </AppCard>
</template>
