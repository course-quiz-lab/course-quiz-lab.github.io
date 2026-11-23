<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useAttemptStore } from '../stores/attempt';
import { usePaperStore } from '../stores/paper';
import { isMultiSelectType } from '../types/core';
import { formatAnswerText } from '../utils/answer';
import { evaluateStatus } from '../utils/scoring';
import QuestionCard from './QuestionCard.vue';
import QuestionOptions from './QuestionOptions.vue';
import QuizLayout from './QuizLayout.vue';

const paperStore = usePaperStore();
const attemptStore = useAttemptStore();
const toast = useToast();

const paper = computed(() => paperStore.paper);
const attempt = computed(() => attemptStore.attempt);
const questions = computed(() => paper.value?.questions ?? []);

const containerRef = ref<HTMLElement | null>(null);

watch(
  () => attempt.value?.currentIndex,
  async () => {
    await nextTick();
    containerRef.value?.focus();
  },
);
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

const answerText = computed(() =>
  question.value ? formatAnswerText(question.value) : '',
);

function answerStatusForQuestion(questionId: string) {
  const q = questions.value.find((q) => q.id === questionId);
  if (!q) return 'unanswered';
  const entry = attempt.value?.answers[questionId];
  if (!entry) return 'unanswered';
  if (attempt.value?.mode === 'exam' && !attempt.value?.submittedAt) {
    return 'unanswered';
  }
  if (
    isMultiSelectType(q.type) &&
    attempt.value?.mode === 'practice' &&
    !entry.submitted
  ) {
    return 'unanswered';
  }
  return evaluateStatus(q, entry.selected);
}

const allStatuses = computed(() =>
  questions.value.map((q) => answerStatusForQuestion(q.id)),
);

const optionsDisabled = computed(() => {
  if (!attempt.value || !answerState.value) return false;
  if (attempt.value.mode === 'exam') return !!attempt.value.submittedAt;
  return answerState.value.submitted;
});

/** 「提交本题」只对练习模式下的多选题有意义：未选任何选项或已提交时不显示 */
const canSubmit = computed(() => {
  if (!attempt.value || !question.value || !answerState.value) return false;
  if (attempt.value.mode !== 'practice') return false;
  if (!isMultiSelectType(question.value.type)) return false;
  if (answerState.value.submitted) return false;
  return answerState.value.selected.length > 0;
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
  const entry = answerState.value;
  if (!question.value || !entry) return;

  if (entry.submitted) {
    toast.add({
      title: '本题已提交',
      description: '可切换到下一题继续作答',
      icon: 'i-lucide-info',
      color: 'neutral',
      duration: 2000,
    });
    return;
  }

  if (entry.selected.length === 0) {
    toast.add({
      title: '请先选择答案',
      description: '按 1-9 选择选项后再提交',
      icon: 'i-lucide-circle-alert',
      color: 'warning',
      duration: 2500,
    });
    return;
  }

  // 提交后结果直接由题目卡内的反馈区与选项样式呈现，不再弹出答案提示
  await attemptStore.submitQuestion(question.value.id);

  // 提交后把焦点收回题目区域：原先焦点可能在「提交本题」按钮上，
  // 按钮提交后会被禁用，焦点会落到 body，影响后续空格 / Enter。
  await nextTick();
  containerRef.value?.focus({ preventScroll: true });
}

/** 空格 / Enter：提交当前题，已提交则进入下一题 */
async function submitOrAdvance() {
  const currentAttempt = attempt.value;
  const entry = answerState.value;
  if (!currentAttempt || !entry) return;

  if (currentAttempt.mode === 'practice') {
    if (!entry.submitted) {
      await handleSubmit();
      return;
    }
    if (currentAttempt.currentIndex < total.value - 1) {
      await attemptStore.nextQuestion(total.value);
      return;
    }
    toast.add({
      title: '已是最后一题',
      icon: 'i-lucide-info',
      color: 'neutral',
      duration: 2000,
    });
    return;
  }

  if (currentAttempt.currentIndex < total.value - 1) {
    await attemptStore.nextQuestion(total.value);
  }
}

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
/**
 * 可被空格 / Enter 原生激活的元素。焦点落在这些元素上时交给浏览器处理，
 * 避免一次按键既触发按钮（如「退出沉浸」「整卷视图」）又提交当前题。
 */
const ACTIVATABLE_SELECTOR =
  'button, a[href], summary, [role="button"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="radio"]';

function closestMatch(target: EventTarget | null, selector: string) {
  return target instanceof Element ? target.closest(selector) : null;
}

function isEditableTarget(target: EventTarget | null) {
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return !!closestMatch(target, EDITABLE_SELECTOR);
}

/**
 * 快捷键挂在 document 上，因此不再依赖“焦点在题目容器内”。
 * 之前事件绑定在容器 div 上，点击工具条或空白处后焦点离开容器，
 * 空格 / Enter 提交就会失效。
 */
function handleKeydown(event: KeyboardEvent) {
  if (!question.value || !attempt.value || !answerState.value) return;
  if (event.defaultPrevented || event.isComposing) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isEditableTarget(event.target)) return;

  const activatable = closestMatch(event.target, ACTIVATABLE_SELECTOR);

  // 1-9：选择选项（判断题 1=正确、2=错误）
  if (/^[1-9]$/.test(event.key)) {
    if (event.repeat) return;
    event.preventDefault();

    if (optionsDisabled.value) return;

    const index = Number(event.key) - 1;

    if (question.value.type === 'judge') {
      if (index === 0) void handleSelect(['T']);
      else if (index === 1) void handleSelect(['F']);
      return;
    }

    const option = question.value.options[index];
    if (!option) return;

    const current = answerState.value.selected;
    if (isMultiSelectType(question.value.type)) {
      const next = current.includes(option.id)
        ? current.filter((id) => id !== option.id)
        : [...current, option.id];
      void handleSelect(next);
    } else {
      void handleSelect([option.id]);
    }
    return;
  }

  // 空格 / Enter：提交（多选题或填空题）或进入下一题
  if (event.key === ' ' || event.key === 'Enter') {
    if (activatable) return;
    event.preventDefault();
    void submitOrAdvance();
    return;
  }

  // 方向键：切换题目
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault();
    if (attempt.value.currentIndex > 0) {
      void attemptStore.prevQuestion(total.value);
    }
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault();
    if (attempt.value.currentIndex < total.value - 1) {
      void attemptStore.nextQuestion(total.value);
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div
    v-if="question && attempt"
    ref="containerRef"
    tabindex="-1"
    data-quiz-focus-target
    class="outline-none"
  >
    <QuizLayout
      :total="total"
      :statuses="allStatuses"
      :current-index="attempt.currentIndex"
      @select="(index) => attemptStore.setCurrentIndex(index, total)"
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
          :reveal-answer="optionsDisabled"
          @update:model-value="handleSelect"
        />
        <div v-if="canSubmit" class="mt-3">
          <UButton
            icon="i-lucide-check"
            label="提交本题"
            @click="handleSubmit"
          />
        </div>
      </QuestionCard>

      <div
        class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default p-2"
      >
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-arrow-left"
          label="上一题"
          :disabled="attempt.currentIndex === 0"
          @click="attemptStore.prevQuestion(total)"
        />
        <span class="text-sm tabular-nums text-muted">
          {{ attempt.currentIndex + 1 }} / {{ total }}
        </span>
        <UButton
          trailing-icon="i-lucide-arrow-right"
          label="下一题"
          :disabled="attempt.currentIndex >= total - 1"
          @click="attemptStore.nextQuestion(total)"
        />
      </div>

      <div
        class="flex flex-wrap items-center justify-center gap-1 rounded-lg bg-elevated px-3 py-2 text-xs text-muted max-sm:hidden"
      >
        <UKbd value="1" size="lg" />
        <UKbd value="2" size="lg" />
        …
        <UKbd value="9" size="lg" />
        <span class="ml-1">选择选项</span>
        <span class="mx-1 text-dimmed">·</span>
        <UKbd size="lg" value="space"/>
        <span>/</span>
        <UKbd size="lg" value="enter"/>
        <span class="ml-1">提交 / 下一题</span>
        <span class="mx-1 text-dimmed">·</span>
        <UKbd size="lg">↑</UKbd>
        <UKbd size="lg">↓</UKbd>
        <UKbd size="lg">←</UKbd>
        <UKbd size="lg">→</UKbd>
        <span class="ml-1">切换题目</span>
      </div>
    </QuizLayout>
  </div>
</template>
