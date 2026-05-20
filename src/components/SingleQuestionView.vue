<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import { evaluateStatus } from '../utils/scoring';
import { isMultiSelectType, type QuestionItem } from '../types/quiz';
import AppButton from './ui/AppButton.vue';
import QuestionCard from './QuestionCard.vue';
import QuestionOptions from './QuestionOptions.vue';

const bankStore = useBankStore();
const attemptStore = useAttemptStore();

const bank = computed(() => bankStore.bank);
const attempt = computed(() => attemptStore.attempt);
const questions = computed(() => bank.value?.questions ?? []);

const containerRef = ref<HTMLElement | null>(null);

watch(
  () => attempt.value?.currentIndex,
  async () => {
    await nextTick();
    containerRef.value?.focus();
  },
);
const orderedQuestions = computed(() => {
  if (!attempt.value?.questionOrder || !bank.value) return questions.value;
  const qMap = new Map(bank.value.questions.map((q) => [q.id, q]));
  return attempt.value.questionOrder
    .map((id) => qMap.get(id))
    .filter((q): q is QuestionItem => !!q);
});
const total = computed(() => orderedQuestions.value.length);
const question = computed(() => {
  const base = orderedQuestions.value[attempt.value?.currentIndex ?? 0];
  if (!base || !attempt.value?.shuffledQuestions) return base;
  return attempt.value.shuffledQuestions[base.id] ?? base;
});
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
    return 'unanswered';
  }
  if (
    isMultiSelectType(question.value.type) &&
    attempt.value?.mode === 'practice' &&
    !answerState.value.submitted
  ) {
    return 'unanswered';
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
}

async function handleSubmit() {
  if (!question.value) return;
  await attemptStore.submitQuestion(question.value.id);
}

function handleKeydown(e: KeyboardEvent) {
  if (!question.value || !attempt.value || !answerState.value) return;

  // 1-9: toggle options (for judge: 1=correct, 2=wrong)
  if (/^[1-9]$/.test(e.key)) {
    e.preventDefault();
    const index = parseInt(e.key) - 1;

    if (question.value.type === 'judge') {
      if (index === 0) handleSelect(['T']);
      else if (index === 1) handleSelect(['F']);
      return;
    }

    const option = question.value.options[index];
    if (!option || optionsDisabled.value) return;

    const current = answerState.value.selected;
    if (isMultiSelectType(question.value.type)) {
      const next = current.includes(option.id)
        ? current.filter((id) => id !== option.id)
        : [...current, option.id];
      handleSelect(next);
    } else {
      handleSelect([option.id]);
    }
    return;
  }

  // Space / Enter: submit multi-select, or go next
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (
      attempt.value.mode === 'practice' &&
      isMultiSelectType(question.value.type) &&
      !answerState.value.submitted
    ) {
      handleSubmit();
    } else if (attempt.value.currentIndex < total.value - 1) {
      attemptStore.nextQuestion(total.value);
    }
    return;
  }

  // Arrow keys: navigate
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    if (attempt.value.currentIndex > 0) {
      attemptStore.prevQuestion(total.value);
    }
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    if (attempt.value.currentIndex < total.value - 1) {
      attemptStore.nextQuestion(total.value);
    }
    return;
  }
}
</script>

<template>
  <div
    ref="containerRef"
    tabindex="-1"
    @keydown="handleKeydown"
    v-if="question && attempt"
    class="grid gap-[26px] outline-none"
  >
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
    <div
      class="flex flex-wrap justify-center items-center gap-1 text-xs text-muted p-2 rounded-xl bg-surface-soft max-sm:hidden"
    >
      <kbd class="kbd">1</kbd><kbd class="kbd">2</kbd>…<kbd class="kbd">9</kbd>
      选择选项
      <span class="mx-[2px] opacity-50">·</span>
      <kbd class="kbd">空格</kbd> / <kbd class="kbd">Enter</kbd> 提交/下一题
      <span class="mx-[2px] opacity-50">·</span>
      <kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd><kbd class="kbd">←</kbd
      ><kbd class="kbd">→</kbd> 切换题目
    </div>
  </div>
</template>

<style scoped>
.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-size: 11px;
  line-height: 1;
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--muted);
}
</style>
