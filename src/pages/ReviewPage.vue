<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import StatusPill from '../components/StatusPill.vue';
import AppButton from '../components/ui/AppButton.vue';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import { evaluateStatus } from '../utils/scoring';
import type { QuestionItem, QuestionType } from '../types/quiz';

const bankStore = useBankStore();
const attemptStore = useAttemptStore();
const router = useRouter();

const bank = computed(() => bankStore.bank);
const attempt = computed(() => attemptStore.attempt);

const orderedQuestions = computed(() => {
  if (!bank.value) return [];
  if (!attempt.value?.questionOrder) return bank.value.questions;
  const qMap = new Map(bank.value.questions.map((q) => [q.id, q]));
  return attempt.value.questionOrder
    .map((id) => qMap.get(id))
    .filter((q): q is QuestionItem => !!q);
});

const resolvedQuestions = computed(() => {
  const shuffled = attempt.value?.shuffledQuestions;
  if (!shuffled) return orderedQuestions.value;
  return orderedQuestions.value.map((q) => shuffled[q.id] ?? q);
});

const statusMap = computed(() => {
  if (!bank.value || !attempt.value) return {};
  const shuffled = attempt.value.shuffledQuestions;
  return bank.value.questions.reduce<
    Record<string, ReturnType<typeof evaluateStatus>>
  >((acc, question) => {
    const selected = attempt.value?.answers[question.id]?.selected ?? [];
    // Use shuffled question for evaluation if available (answer IDs were remapped)
    const evalQuestion = shuffled?.[question.id] ?? question;
    acc[question.id] = evaluateStatus(evalQuestion, selected);
    return acc;
  }, {});
});

const statuses = computed(() => Object.values(statusMap.value));

const correctCount = computed(
  () => statuses.value.filter((status) => status === 'correct').length,
);
const total = computed(() => orderedQuestions.value.length);
const percent = computed(() =>
  total.value ? Math.round((correctCount.value / total.value) * 100) : 0,
);

const incorrectList = computed(() => {
  if (!bank.value) return [];
  return resolvedQuestions.value.filter(
    (question) => statusMap.value[question.id] !== 'correct',
  );
});

const canReview = computed(() => {
  if (!attempt.value) return false;
  if (attempt.value.mode === 'practice') return true;
  return !!attempt.value.submittedAt;
});

function typeLabel(type: QuestionType) {
  if (type === 'single') return '单选';
  if (type === 'multiple') return '多选';
  if (type === 'indeterminate') return '不定项';
  return '判断';
}

function answerLabel(question: QuestionItem) {
  if (question.type === 'judge') {
    return question.answer
      .map((id) => (id === 'T' ? '正确' : '错误'))
      .join(' / ');
  }
  return question.answer.join(' / ');
}
</script>

<template>
  <div v-if="bank && attempt" class="page">
    <section
      class="bg-surface rounded-2xl p-[26px] max-sm:p-4 border border-[rgba(43,34,24,0.12)] grid gap-4"
    >
      <div class="text-sm text-muted tracking-wide uppercase">作答结果</div>
      <div v-if="!canReview" class="text-muted text-sm">
        考试尚未交卷，暂无法查看结果。
      </div>
      <div
        v-else
        class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4"
      >
        <div class="p-4 rounded-xl bg-surface-soft">
          <div class="text-muted text-xs">正确题数</div>
          <div class="text-xl mt-1.5">{{ correctCount }} / {{ total }}</div>
        </div>
        <div class="p-4 rounded-xl bg-surface-soft">
          <div class="text-muted text-xs">正确率</div>
          <div class="text-xl mt-1.5">{{ percent }}%</div>
        </div>
        <div class="p-4 rounded-xl bg-surface-soft">
          <div class="text-muted text-xs">当前模式</div>
          <div class="text-xl mt-1.5">
            {{ attempt.mode === 'practice' ? '练习' : '考试' }}
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-[12px]">
        <AppButton variant="ghost" @click="router.push('/practice')">
          继续练习
        </AppButton>
        <AppButton variant="ghost" @click="router.push('/exam')">
          继续考试
        </AppButton>
        <AppButton @click="router.push('/import')">更换题库</AppButton>
      </div>
    </section>

    <section
      v-if="canReview"
      class="bg-surface rounded-2xl p-[26px] max-sm:p-4 border border-[rgba(43,34,24,0.12)]"
    >
      <div class="text-sm text-muted tracking-wide uppercase">
        错题与部分正确
      </div>
      <div v-if="incorrectList.length === 0" class="text-muted text-sm">
        目前没有错题。
      </div>
      <ul v-else class="list-none m-0 p-0 grid gap-[12px]">
        <li
          v-for="question in incorrectList"
          :key="question.id"
          class="p-4 rounded-xl border border-[rgba(43,34,24,0.12)] bg-surface-review"
        >
          <div class="mb-[6px]">{{ question.stem }}</div>
          <div class="flex gap-[12px] flex-wrap">
            <StatusPill :status="statusMap[question.id]" />
            <span
              class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted"
              >题型：{{ typeLabel(question.type) }}</span
            >
            <span
              class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted"
            >
              参考答案：{{ answerLabel(question) }}
            </span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
