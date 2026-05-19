<script setup lang="ts">
import { computed } from 'vue';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import { evaluateStatus } from '../utils/scoring';
import AppButton from './ui/AppButton.vue';
import QuestionCard from './QuestionCard.vue';
import QuestionOptions from './QuestionOptions.vue';

const bankStore = useBankStore();
const attemptStore = useAttemptStore();

const bank = computed(() => bankStore.bank);
const attempt = computed(() => attemptStore.attempt);
const questions = computed(() => bank.value?.questions ?? []);
const total = computed(() => questions.value.length);

function answerStatus(questionId: string) {
  const question = questions.value.find((item) => item.id === questionId);
  const entry = attempt.value?.answers[questionId];
  if (!question || !entry) return 'unanswered';
  if (attempt.value?.mode === 'exam' && !attempt.value?.submittedAt) {
    return entry.selected.length > 0 ? 'answered' : 'unanswered';
  }
  return evaluateStatus(question, entry.selected);
}

function answerText(questionId: string) {
  const question = questions.value.find((item) => item.id === questionId);
  if (!question) return '';
  return question.answer
    .map(
      (id) => question.options.find((option) => option.id === id)?.text ?? id,
    )
    .join(' / ');
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
  type: string,
) {
  await attemptStore.updateSelection(questionId, selected);
  if (attempt.value?.mode === 'practice' && type !== 'multiple') {
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
    class="grid gap-[26px] grid-cols-[minmax(0,1fr)_220px] max-lg:!grid-cols-1"
  >
    <div class="grid gap-4">
      <div
        v-for="(question, index) in questions"
        :key="question.id"
        :data-question-index="index"
      >
        <QuestionCard
          :question="question"
          :index="index"
          :total="total"
          :status="answerStatus(question.id)"
          :showFeedback="showFeedback(question.id)"
          :answerText="answerText(question.id)"
        >
          <QuestionOptions
            :question="question"
            :modelValue="attempt.answers[question.id]?.selected ?? []"
            :disabled="optionsDisabled(question.id)"
            @update:modelValue="
              (selected) => handleSelect(question.id, selected, question.type)
            "
          />
          <div class="mt-[12px]" v-if="question.type === 'multiple'">
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
      class="sticky top-[120px] p-4 rounded-[18px] bg-surface border border-[rgba(43,34,24,0.12)] h-fit max-lg:!static"
    >
      <div class="text-sm mb-[12px] text-muted">答题卡</div>
      <div class="grid grid-cols-4 gap-[12px]">
        <button
          v-for="(question, index) in questions"
          :key="question.id"
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
