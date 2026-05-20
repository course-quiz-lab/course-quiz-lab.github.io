<script setup lang="ts">
import { computed } from 'vue';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import { evaluateStatus } from '../utils/scoring';
import { isMultiSelectType, type QuestionItem, type QuestionType } from '../types/quiz';
import AppButton from './ui/AppButton.vue';
import QuestionCard from './QuestionCard.vue';
import QuestionOptions from './QuestionOptions.vue';

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
  const el = document.querySelector(`[data-question-index="${index}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

const statusStyles: Record<string, string> = {
  correct: '!border-[rgba(47,133,90,0.6)] !bg-[rgba(47,133,90,0.12)]',
  partial: '!border-[rgba(226,181,109,0.8)] !bg-[rgba(226,181,109,0.18)]',
  wrong: '!border-[rgba(185,74,60,0.6)] !bg-[rgba(185,74,60,0.1)]',
  unanswered: '',
  answered: '!border-[rgba(47,111,107,0.4)] !bg-[rgba(47,111,107,0.08)]',
};

function gridItemClass(status: string) {
  return statusStyles[status] ?? '';
}
</script>

<template>
  <div
    v-if="bank && attempt"
    class="grid gap-[26px] grid-cols-[minmax(0,1fr)_260px] max-lg:!grid-cols-1"
  >
    <div class="grid gap-4 max-lg:order-last">
      <div
        v-for="(question, index) in orderedQuestions"
        :key="question.id"
        :data-question-index="index"
      >
        <QuestionCard
          :question="resolveQuestion(question.id) ?? question"
          :index="index"
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
          <div class="mt-[12px]" v-if="isMultiSelectType(question.type)">
            <AppButton
              :disabled="optionsDisabled(question.id)"
              @click="handleSubmit(question.id)"
            >
              提交本题
            </AppButton>
          </div>
        </QuestionCard>
      </div>
    </div>

    <aside
      class="sticky top-[100px] p-4 rounded-[18px] bg-surface border border-[rgba(43,34,24,0.12)] h-fit max-lg:!static max-lg:order-first"
    >
      <div class="text-sm mb-[12px] text-muted">答题卡</div>
      <div class="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-5 gap-[12px]">
        <button
          v-for="(question, index) in orderedQuestions"
          :key="'nav-' + question.id"
          class="border border-[rgba(43,34,24,0.12)] bg-surface-grid rounded-[10px] p-2 text-xs cursor-pointer"
          :class="gridItemClass(answerStatus(question.id))"
          @click="scrollToQuestion(index)"
        >
          {{ index + 1 }}
        </button>
      </div>
    </aside>
  </div>
</template>
