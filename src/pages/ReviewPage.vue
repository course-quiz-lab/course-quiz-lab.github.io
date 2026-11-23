<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StatusPill from '../components/StatusPill.vue';
import PageLayout from '../components/ui/PageLayout.vue';
import Pagination from '../components/ui/Pagination.vue';
import { useAttemptStore } from '../stores/attempt';
import { usePaperStore } from '../stores/paper';
import type { QuestionItem } from '../types/bank';
import type { QuestionType } from '../types/core';
import { formatAnswerText } from '../utils/answer';
import { evaluateStatus } from '../utils/scoring';

const PAGE_SIZE = 10;

const route = useRoute();
const router = useRouter();
const attemptStore = useAttemptStore();
const paperStore = usePaperStore();

const paper = computed(() => paperStore.paper);
const attempt = computed(() => attemptStore.attempt);

const questions = computed(() => paper.value?.questions || []);

onMounted(async () => {
  const paperId = route.params.paperId as string;
  const attemptId = route.params.attemptId as string;
  if (!paperId || !attemptId) {
    router.replace('/papers');
    return;
  }
  if (!paperStore.paper || paperStore.paper.id !== paperId) {
    await paperStore.loadPaper(paperId);
  }
  if (!attemptStore.attempt || attemptStore.attempt.id !== attemptId) {
    await attemptStore.loadSavedAttempt(attemptId);
  }
});

const statusMap = computed(() => {
  if (!paper.value || !attempt.value) return {};
  return paper.value.questions.reduce<
    Record<string, ReturnType<typeof evaluateStatus>>
  >((acc, question) => {
    const selected = attempt.value?.answers[question.id]?.selected ?? [];
    acc[question.id] = evaluateStatus(question, selected);
    return acc;
  }, {});
});

const statuses = computed(() => Object.values(statusMap.value));
const correctCount = computed(
  () => statuses.value.filter((status) => status === 'correct').length,
);
const total = computed(
  () => statuses.value.filter((status) => status != 'unanswered').length,
);
const percent = computed(() =>
  total.value ? Math.round((correctCount.value / total.value) * 100) : 0,
);

const incorrectList = computed(() => {
  if (!paper.value) return [];
  return questions.value.filter((question) => {
    const status = statusMap.value[question.id];
    return status !== 'correct' && status !== 'unanswered';
  });
});

const currentPage = ref(1);
const totalPages = computed(() =>
  Math.ceil(incorrectList.value.length / PAGE_SIZE),
);
const pagedIncorrect = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return incorrectList.value.slice(start, start + PAGE_SIZE);
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
  return formatAnswerText(question);
}
</script>

<template>
  <PageLayout
    title="作答小结"
    :description="paper?.title"
    max-width="880px"
    show-back
  >
    <template #header-actions>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
        label="返回试卷列表"
        @click="router.push('/papers')"
      />
      <UButton
        v-if="attempt && !attempt.submittedAt"
        icon="i-lucide-play"
        label="继续作答"
        @click="router.push(`/quiz/${paper?.id}/attempt/${attempt.id}`)"
      />
    </template>

    <div v-if="paper && attempt" class="space-y-6">
      <UCard :ui="{ body: 'p-5 sm:p-6' }">
        <div v-if="!canReview" class="space-y-3">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-clock"
            title="考试尚未交卷"
            description="交卷后才能查看本次作答结果。"
          />
        </div>

        <div v-else class="space-y-6">
          <div class="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div
              class="flex flex-col items-center justify-center rounded-xl bg-elevated px-6 py-8 text-center"
            >
              <span class="text-sm text-muted">正确率</span>
              <p
                class="mt-2 text-5xl font-semibold tracking-tight text-highlighted"
              >
                {{ percent }}<span class="text-2xl text-muted">%</span>
              </p>
              <p class="mt-2 text-sm text-muted">
                正确 {{ correctCount }} / {{ total }} 题
              </p>
            </div>

            <div class="flex flex-col justify-center gap-4">
              <UProgress
                :model-value="percent"
                :color="percent >= 60 ? 'success' : 'error'"
                size="lg"
              />
              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-lg border border-default p-4">
                  <p class="text-xs text-muted">模式</p>
                  <p class="mt-1 text-lg font-medium text-highlighted">
                    {{ attempt.mode === 'practice' ? '练习' : '考试' }}
                  </p>
                </div>
                <div class="rounded-lg border border-default p-4">
                  <p class="text-xs text-muted">总题数</p>
                  <p class="mt-1 text-lg font-medium text-highlighted">
                    {{ paper.questions.length }}
                  </p>
                </div>
                <div class="rounded-lg border border-default p-4">
                  <p class="text-xs text-muted">错题</p>
                  <p class="mt-1 text-lg font-medium text-error">
                    {{ incorrectList.length }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <UCard v-if="canReview" :ui="{ body: 'p-5 sm:p-6' }">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-highlighted">
              错题与部分正确
            </span>
            <UBadge color="neutral" variant="soft" size="md">
              {{ incorrectList.length }}
            </UBadge>
          </div>
        </template>

        <UEmpty
          v-if="incorrectList.length === 0"
          icon="i-lucide-party-popper"
          title="没有错题"
          description="本次作答全部正确，继续保持！"
          variant="naked"
          class="py-10"
        />

        <ul v-else class="m-0 list-none space-y-3 p-0">
          <li
            v-for="question in pagedIncorrect"
            :key="question.id"
            class="rounded-lg border border-default p-4"
          >
            <p class="text-sm leading-relaxed text-highlighted">
              {{ question.stem }}
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill :status="statusMap[question.id]" />
              <UBadge color="neutral" variant="soft" size="md">
                题型：{{ typeLabel(question.type) }}
              </UBadge>
              <UBadge color="primary" variant="soft" size="md">
                参考答案：{{ answerLabel(question) }}
              </UBadge>
            </div>
          </li>
        </ul>

        <Pagination
          v-if="totalPages > 1"
          :current="currentPage"
          :total="totalPages"
          @update:current="currentPage = $event"
        />
      </UCard>
    </div>
  </PageLayout>
</template>
