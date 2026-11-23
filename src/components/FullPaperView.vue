<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAttemptStore } from '../stores/attempt';
import { usePaperStore } from '../stores/paper';
import type { QuestionType } from '../types/core';
import { isMultiSelectType } from '../types/core';
import { formatAnswerText } from '../utils/answer';
import { evaluateStatus } from '../utils/scoring';
import QuestionCard from './QuestionCard.vue';
import QuestionOptions from './QuestionOptions.vue';
import QuizLayout from './QuizLayout.vue';

const PAGE_SIZE = 10;

const paperStore = usePaperStore();
const attemptStore = useAttemptStore();

const paper = computed(() => paperStore.paper);
const attempt = computed(() => attemptStore.attempt);
const questions = computed(() => paper.value?.questions ?? []);

const total = computed(() => questions.value.length);

const currentPage = ref(1);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / PAGE_SIZE)),
);
const currentQuestions = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return questions.value.slice(start, start + PAGE_SIZE);
});

const allStatuses = computed(() =>
  questions.value.map((q) => answerStatus(q.id)),
);

function resolveQuestion(questionId: string) {
  return questions.value.find((q) => q.id === questionId);
}

function answerStatus(questionId: string) {
  const question = resolveQuestion(questionId);
  const entry = attempt.value?.answers[questionId];
  if (!question || !entry) return 'unanswered';
  if (attempt.value?.mode === 'exam' && !attempt.value?.submittedAt) {
    return 'unanswered';
  }
  if (
    isMultiSelectType(question.type) &&
    attempt.value?.mode === 'practice' &&
    !entry.submitted
  ) {
    return 'unanswered';
  }
  return evaluateStatus(question, entry.selected);
}

function answerText(questionId: string) {
  const question = resolveQuestion(questionId);
  return question ? formatAnswerText(question) : '';
}

function showFeedback(questionId: string) {
  if (!attempt.value) return false;
  const entry = attempt.value.answers[questionId];
  if (!entry) return false;
  if (attempt.value.mode === 'practice') return entry.submitted;
  return !!attempt.value.submittedAt;
}

function optionsDisabled(questionId: string) {
  const entry = attempt.value?.answers[questionId];
  if (!entry || !attempt.value) return false;
  if (attempt.value.mode === 'exam') return !!attempt.value.submittedAt;
  return entry.submitted;
}

async function handleSelect(
  questionId: string,
  selected: string[],
  type: QuestionType,
) {
  await attemptStore.updateSelection(questionId, selected);
  if (attempt.value?.mode === 'practice' && !isMultiSelectType(type)) {
    await attemptStore.submitQuestion(questionId);
  }
}

async function handleSubmit(questionId: string) {
  await attemptStore.submitQuestion(questionId);
}

function scrollToQuestion(index: number) {
  attemptStore.setCurrentIndex(index, total.value);
  // Switch to the page containing this question
  const targetPage = Math.floor(index / PAGE_SIZE) + 1;
  if (targetPage !== currentPage.value) {
    currentPage.value = targetPage;
  }
  // Use next tick to wait for DOM update after page switch
  import('vue').then(({ nextTick }) =>
    nextTick(() => {
      const el = document.querySelector(`[data-question-index="${index}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }),
  );
}
</script>

<template>
  <QuizLayout
    v-if="paper && attempt"
    tabindex="-1"
    data-quiz-focus-target
    class="outline-none"
    :total="total"
    :statuses="allStatuses"
    :current-index="(currentPage - 1) * PAGE_SIZE"
    :current-page="currentPage"
    :page-size="PAGE_SIZE"
    :should-show-current="false"
    @select="scrollToQuestion"
  >
    <!-- Page info -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-elevated px-3 py-2 text-sm text-muted"
    >
      <span>
        第
        <span class="font-medium text-highlighted">{{ currentPage }}</span>
        / {{ totalPages }} 页
      </span>
      <span>共 {{ total }} 题 · 每页 {{ PAGE_SIZE }} 题</span>
    </div>

    <div
      v-for="(question, idx) in currentQuestions"
      :key="question.id"
      :data-question-index="(currentPage - 1) * PAGE_SIZE + idx"
    >
      <QuestionCard
        :question="resolveQuestion(question.id) ?? question"
        :index="(currentPage - 1) * PAGE_SIZE + idx"
        :total="total"
        :status="answerStatus(question.id)"
        :showFeedback="showFeedback(question.id)"
        :answerText="answerText(question.id)"
      >
        <QuestionOptions
          :question="resolveQuestion(question.id) ?? question"
          :modelValue="attempt.answers[question.id]?.selected ?? []"
          :disabled="optionsDisabled(question.id)"
          :reveal-answer="optionsDisabled(question.id)"
          @update:model-value="
            (selected) => handleSelect(question.id, selected, question.type)
          "
        />
        <div
          v-if="
            isMultiSelectType(question.type) &&
            attempt.mode === 'practice' &&
            !attempt.answers[question.id]?.submitted &&
            (attempt.answers[question.id]?.selected.length ?? 0) > 0
          "
          class="mt-3"
        >
          <UButton
            :disabled="optionsDisabled(question.id)"
            icon="i-lucide-check"
            label="提交本题"
            @click="handleSubmit(question.id)"
          />
        </div>
      </QuestionCard>
    </div>

    <!-- Pagination -->
    <UPagination
      v-if="totalPages > 1"
      v-model:page="currentPage"
      :total="total"
      :items-per-page="PAGE_SIZE"
      :sibling-count="1"
      class="flex items-center justify-center py-4"
    />
  </QuizLayout>
</template>
