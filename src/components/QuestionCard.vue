<script setup lang="ts">
import { computed } from 'vue';
import type { QuestionItem } from '../types/bank';
import StatusPill from './StatusPill.vue';

const props = defineProps<{
  question: QuestionItem;
  /** 题目在本卷中的序号；不传时隐藏「第 N 题」（错题本按去重键聚合后无卷内序号） */
  index?: number;
  status: 'correct' | 'partial' | 'wrong' | 'unanswered' | 'answered';
  showFeedback: boolean;
  answerText: string;
  /** 错题本等列表场景：缩小内边距与字号，作答页保持默认密度 */
  dense?: boolean;
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

const hasIndex = computed(() => props.index !== undefined);
</script>

<template>
  <UCard :ui="{ body: dense ? 'p-4 sm:p-5' : 'p-5 sm:p-6' }">
    <div class="flex items-start justify-between gap-3">
      <div
        class="flex flex-wrap items-center gap-x-2 gap-y-1"
        :class="dense ? 'text-sm' : 'text-xs'"
      >
        <template v-if="hasIndex">
          <span class="font-medium text-highlighted">
            第 {{ (index ?? 0) + 1 }} 题
          </span>
          <span class="text-dimmed">/</span>
        </template>
        <span class="text-muted">{{ name }}</span>
      </div>
      <StatusPill :status="status" class="shrink-0" />
    </div>

    <div
      v-if="$slots.meta"
      class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5"
    >
      <slot name="meta" />
    </div>

    <p class="mt-3 text-base leading-relaxed text-highlighted">
      {{ question.stem }}
    </p>

    <div :class="dense ? 'mt-3' : 'mt-4'">
      <slot />
    </div>

    <div
      v-if="showFeedback"
      class="rounded-lg border border-default bg-elevated text-sm"
      :class="dense ? 'mt-3 space-y-2 p-3' : 'mt-5 space-y-2.5 p-4'"
    >
      <div class="flex gap-2">
        <span
          class="shrink-0 font-medium text-muted"
          :class="dense ? 'text-sm' : 'text-xs'"
        >
          参考答案
        </span>
        <span class="text-highlighted">{{ answerText || '暂无' }}</span>
      </div>
      <div v-if="question.analysis" class="flex gap-2">
        <span
          class="shrink-0 font-medium text-muted"
          :class="dense ? 'text-sm' : 'text-xs'"
        >
          解析
        </span>
        <span class="text-default">{{ question.analysis }}</span>
      </div>
      <div v-if="question.difficulty" class="flex gap-2">
        <span
          class="shrink-0 font-medium text-muted"
          :class="dense ? 'text-sm' : 'text-xs'"
        >
          难度
        </span>
        <span class="text-default">{{ question.difficulty }}</span>
      </div>
    </div>
  </UCard>
</template>
