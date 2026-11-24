<script setup lang="ts">
import { computed } from 'vue';
import QuestionCard from './QuestionCard.vue';
import QuestionOptions from './QuestionOptions.vue';
import type { QuestionItem } from '../types/bank';
import type { Mode } from '../types/core';
import type { ResolvedQuestionSource } from '../utils/wrongbook';
import { formatAnswerText } from '../utils/answer';

const props = defineProps<{
  question: QuestionItem;
  index?: number;
  status: 'wrong' | 'partial';
  selected: string[];
  wrongCount: number;
  source: ResolvedQuestionSource;
  paperTitle: string;
  attemptDate: number;
  attemptMode: Mode;
}>();

const answerText = computed(() => formatAnswerText(props.question));

const attemptDateText = computed(() =>
  new Date(props.attemptDate).toLocaleDateString('zh-CN'),
);

const attemptModeText = computed(() =>
  props.attemptMode === 'exam' ? '考试' : '练习',
);
</script>

<template>
  <QuestionCard
    :question="question"
    :index="index"
    :status="status"
    :show-feedback="true"
    :answer-text="answerText"
    dense
  >
    <template #meta>
      <div class="w-full space-y-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span class="inline-flex items-center gap-1 font-semibold text-error">
            <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0" />
            累计答错 {{ wrongCount }} 次
          </span>
          <span class="text-dimmed">·</span>
          <span class="text-muted">{{ attemptModeText }}</span>
          <span class="text-dimmed">·</span>
          <span class="text-muted">{{ attemptDateText }}</span>
        </div>

        <div
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted"
        >
          <span class="inline-flex min-w-0 items-center gap-1">
            <UIcon
              name="i-lucide-book-open"
              class="size-4 shrink-0 text-dimmed"
            />
            <span>{{ source.course }}</span>
          </span>
          <span class="text-dimmed">·</span>
          <span class="inline-flex min-w-0 items-center gap-1">
            <UIcon
              name="i-lucide-library"
              class="size-4 shrink-0 text-dimmed"
            />
            <span>{{ source.bankName }}</span>
          </span>
          <span class="text-dimmed">·</span>
          <span class="inline-flex min-w-0 items-center gap-1">
            <UIcon
              name="i-lucide-clipboard-list"
              class="size-4 shrink-0 text-dimmed"
            />
            <span>{{ paperTitle }}</span>
          </span>
        </div>
      </div>
    </template>

    <QuestionOptions
      :question="question"
      :model-value="selected"
      disabled
      reveal-answer
      dense
    />
  </QuestionCard>
</template>
