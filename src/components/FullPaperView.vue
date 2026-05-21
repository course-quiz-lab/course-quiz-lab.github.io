<script setup lang="ts">
import { computed, ref } from 'vue';
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import { evaluateStatus } from '../utils/scoring';
import {
  isMultiSelectType,
  type QuestionItem,
  type QuestionType,
} from '../types/quiz';
import AppButton from './ui/AppButton.vue';
import AppIcon from './ui/AppIcon.vue';
import QuestionCard from './QuestionCard.vue';
import QuestionOptions from './QuestionOptions.vue';
import QuizLayout from './QuizLayout.vue';

const PAGE_SIZE = 10;

const bankStore = useBankStore();
const attemptStore = useAttemptStore();

const bank = computed(() => bankStore.bank);
const attempt = computed(() => attemptStore.attempt);
const questions = computed(() => bank.value?.questions ?? []);
const orderedQuestions = computed(() => {
  if (!attempt.value?.questionOrder || !bank.value) return questions.value;
  const qMap = new Map(bank.value.questions.map((q) => [q.id, q]));
  return attempt.value.questionOrder
    .map((id) => qMap.get(id))
    .filter((q): q is QuestionItem => !!q);
});
const total = computed(() => orderedQuestions.value.length);

const currentPage = ref(1);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / PAGE_SIZE)),
);
const currentQuestions = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return orderedQuestions.value.slice(start, start + PAGE_SIZE);
});

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}

const visiblePages = computed<(number | 'ellipsis')[]>(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages: (number | 'ellipsis')[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  // Always include first page
  pages.push(1);

  if (current > 3) pages.push('ellipsis');

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('ellipsis');

  // Always include last page
  pages.push(total);

  return pages;
});

const allStatuses = computed(() =>
  orderedQuestions.value.map((q) => answerStatus(q.id)),
);

function resolveQuestion(questionId: string) {
  const base = questions.value.find((q) => q.id === questionId);
  if (!base) return undefined;
  return attempt.value?.shuffledQuestions?.[questionId] ?? base;
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
  if (!question) return '';
  if (question.type === 'judge') {
    return question.answer
      .map((id) => (id === 'T' ? '正确' : '错误'))
      .join(' / ');
  }
  return question.answer.join(' / ');
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
    v-if="bank && attempt"
    :total="total"
    :statuses="allStatuses"
    :current-page="currentPage"
    :page-size="PAGE_SIZE"
    @select="scrollToQuestion"
  >
    <!-- Page info -->
    <div class="flex items-center justify-between text-sm text-muted px-1">
      <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
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
          @update:modelValue="
            (selected) => handleSelect(question.id, selected, question.type)
          "
        />
        <div
          class="mt-[12px]"
          v-if="
            isMultiSelectType(question.type) &&
            attempt.mode === 'practice' &&
            !attempt.answers[question.id]?.submitted
          "
        >
          <AppButton
            :disabled="optionsDisabled(question.id)"
            @click="handleSubmit(question.id)"
          >
            提交本题
          </AppButton>
        </div>
      </QuestionCard>
    </div>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="flex items-center justify-center gap-3 py-4"
    >
      <AppButton
        variant="ghost"
        class="!px-3 !py-1.5"
        :disabled="currentPage <= 1"
        @click="goToPage(currentPage - 1)"
      >
        <AppIcon :path="mdiChevronLeft" :size="18" />
        上一页
      </AppButton>

      <div class="flex items-center gap-1">
        <template v-for="item in visiblePages" :key="item">
          <span
            v-if="item === 'ellipsis'"
            class="w-8 h-8 inline-flex items-center justify-center text-sm text-muted select-none"
          >
            …
          </span>
          <button
            v-else
            class="w-8 h-8 rounded-lg border-none text-sm cursor-pointer transition-colors duration-150"
            :class="
              item === currentPage
                ? 'bg-brand text-white font-semibold'
                : 'bg-surface-soft text-muted hover:bg-surface-chip'
            "
            @click="goToPage(item)"
          >
            {{ item }}
          </button>
        </template>
      </div>

      <AppButton
        variant="ghost"
        class="!px-3 !py-1.5"
        :disabled="currentPage >= totalPages"
        @click="goToPage(currentPage + 1)"
      >
        下一页
        <AppIcon :path="mdiChevronRight" :size="18" />
      </AppButton>
    </div>
  </QuizLayout>
</template>
