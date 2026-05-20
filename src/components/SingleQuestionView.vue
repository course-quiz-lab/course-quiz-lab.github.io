<script setup lang="ts">
import { computed } from 'vue';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import { evaluateStatus } from '../utils/scoring';
import { isMultiSelectType } from '../types/quiz';
import AppButton from './ui/AppButton.vue';
import QuestionCard from './QuestionCard.vue';
import QuestionOptions from './QuestionOptions.vue';

const bankStore = useBankStore();
const attemptStore = useAttemptStore();

const bank = computed(() => bankStore.bank);
const attempt = computed(() => attemptStore.attempt);
const questions = computed(() => bank.value?.questions ?? []);
const total = computed(() => questions.value.length);
const question = computed(
  () => questions.value[attempt.value?.currentIndex ?? 0],
);
const answerState = computed(() =>
  question.value ? attempt.value?.answers[question.value.id] : undefined,
);

const showFeedback = computed(() => {
  if (!attempt.value || !answerState.value) return false;
  if (attempt.value.mode === 'practice') return answerState.value.submitted;
  return !!attempt.value.submittedAt;
});

const status = computed(() => {
  if (!question.value || !answerState.value) return 'unanswered';
  if (attempt.value?.mode === 'exam' && !attempt.value.submittedAt) {
    return answerState.value.selected.length > 0 ? 'answered' : 'unanswered';
  }
  return evaluateStatus(question.value, answerState.value.selected);
});

const answerText = computed(() => {
  if (!question.value) return '';
  if (question.value.type === 'judge') {
    return question.value.answer
      .map((id) => (id === 'T' ? '正确' : '错误'))
      .join(' / ');
  }
  return question.value.answer.join(' / ');
});

const optionsDisabled = computed(() => {
  if (!attempt.value || !answerState.value) return false;
  if (attempt.value.mode === 'exam') return !!attempt.value.submittedAt;
  return answerState.value.submitted;
});

async function handleSelect(selected: string[]) {
  if (!question.value || !attempt.value) return;
  await attemptStore.updateSelection(question.value.id, selected);
  if (
    attempt.value.mode === 'practice' &&
    !isMultiSelectType(question.value.type)
  ) {
    await attemptStore.submitQuestion(question.value.id);
  }
  if (
    !isMultiSelectType(question.value.type) &&
    attempt.value.currentIndex < total.value - 1
  ) {
    await attemptStore.nextQuestion(total.value);
  }
}

async function handleSubmit() {
  if (!question.value) return;
  await attemptStore.submitQuestion(question.value.id);
}
</script>

<template>
  <div v-if="question && attempt" class="grid gap-[26px]">
    <QuestionCard
      :question="question"
      :index="attempt.currentIndex"
      :total="total"
      :status="status"
      :showFeedback="showFeedback"
      :answerText="answerText"
    >
      <QuestionOptions
        :question="question"
        :modelValue="answerState?.selected ?? []"
        :disabled="optionsDisabled"
        @update:modelValue="handleSelect"
      />
      <div class="mt-[12px]" v-if="isMultiSelectType(question.type)">
        <AppButton :disabled="optionsDisabled" @click="handleSubmit">
          提交本题
        </AppButton>
      </div>
    </QuestionCard>
    <div class="flex justify-between items-center gap-[12px]">
      <AppButton
        variant="ghost"
        :disabled="attempt.currentIndex === 0"
        @click="attemptStore.prevQuestion(total)"
      >
        上一题
      </AppButton>
      <div class="text-muted text-sm">
        进度 {{ attempt.currentIndex + 1 }} / {{ total }}
      </div>
      <AppButton
        :disabled="attempt.currentIndex >= total - 1"
        @click="attemptStore.nextQuestion(total)"
      >
        下一题
      </AppButton>
    </div>
  </div>
</template>
