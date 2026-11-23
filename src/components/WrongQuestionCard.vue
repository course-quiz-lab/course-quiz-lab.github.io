<script setup lang="ts">
import StatusPill from './StatusPill.vue';
import type { QuestionItem } from '../types/bank';
import type { QuestionType } from '../types/core';
import { formatAnswerText } from '../utils/answer';

defineProps<{
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
  return formatAnswerText(question);
}

function userSelectedFormat(question: QuestionItem, selected: string[]) {
  if (selected.length === 0) return '未作答';
  return formatAnswerText(question, selected);
}
</script>

<template>
  <UCard :ui="{ body: 'p-5' }">
    <div
      v-if="
        paperTitle ||
        (wrongCount && wrongCount > 1) ||
        attemptDate ||
        attemptMode
      "
      class="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted"
    >
      <UBadge v-if="paperTitle" color="neutral" variant="outline" size="md">
        {{ paperTitle }}
      </UBadge>
      <UBadge
        v-if="wrongCount && wrongCount > 1"
        color="error"
        variant="soft"
        size="md"
      >
        错 {{ wrongCount }} 次
      </UBadge>
      <template v-if="attemptDate">
        <span class="text-dimmed">·</span>
        <span>{{ new Date(attemptDate).toLocaleDateString('zh-CN') }}</span>
      </template>
      <template v-if="attemptMode">
        <span class="text-dimmed">·</span>
        <span>{{ attemptMode === 'exam' ? '考试' : '练习' }}</span>
      </template>
    </div>

    <p class="mb-3 text-base font-medium leading-relaxed text-highlighted">
      {{ question.stem }}
    </p>

    <div
      v-if="question.options.length > 0"
      class="mb-3 space-y-1 border-l-2 border-default pl-3"
    >
      <div
        v-for="opt in question.options"
        :key="opt.id"
        class="rounded px-2 py-1 text-sm"
        :class="
          question.answer.includes(opt.id)
            ? 'bg-success/10 text-success'
            : 'text-default'
        "
      >
        <span class="mr-2 font-medium">{{ opt.id }}.</span>
        <span>{{ opt.text }}</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <StatusPill :status="status as any" />
      <UBadge color="neutral" variant="soft" size="md">
        {{ typeLabel(question.type) }}
      </UBadge>
      <UBadge color="neutral" variant="soft" size="md">
        您的作答：{{ userSelectedFormat(question, selectedAnswer) }}
      </UBadge>
      <UBadge color="primary" variant="soft" size="md">
        参考答案：{{ formatAnswer(question) }}
      </UBadge>
    </div>

    <div
      v-if="question.analysis"
      class="mt-3 border-t border-default pt-3 text-sm text-muted"
    >
      <span class="mb-1 block font-medium text-highlighted">解析</span>
      {{ question.analysis }}
    </div>
  </UCard>
</template>
