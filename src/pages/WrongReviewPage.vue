<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WrongQuestionCard from '../components/WrongQuestionCard.vue';
import PageLayout from '../components/ui/PageLayout.vue';
import Pagination from '../components/ui/Pagination.vue';
import type { QuestionItem } from '../types/bank';
import type { Paper, PaperAttempt } from '../types/quiz';
import { loadPaper, loadPaperAttempt } from '../utils/idb';
import { evaluateStatus } from '../utils/scoring';

const PAGE_SIZE = 15;

const route = useRoute();
const router = useRouter();

const paper = ref<Paper | null>(null);
const attempt = ref<PaperAttempt | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  const paperId = route.params.paperId as string;
  const attemptId = route.params.attemptId as string;

  if (!paperId || !attemptId) {
    router.replace('/papers');
    return;
  }

  const [p, a] = await Promise.all([
    loadPaper(paperId),
    loadPaperAttempt(attemptId),
  ]);

  paper.value = p ?? null;
  attempt.value = a ?? null;
  isLoading.value = false;
});

const wrongQuestions = computed(() => {
  if (!paper.value || !attempt.value) return [];
  const list: { question: QuestionItem; status: string }[] = [];

  for (const question of paper.value.questions) {
    const entry = attempt.value.answers[question.id];
    if (!entry) continue;

    const status = evaluateStatus(question, entry.selected);
    if (status !== 'correct' && status !== 'unanswered') {
      list.push({ question, status });
    }
  }
  return list;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(wrongQuestions.value.length / PAGE_SIZE)),
);
const currentPage = ref(1);

const pagedQuestions = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return wrongQuestions.value.slice(start, start + PAGE_SIZE);
});
</script>

<template>
  <PageLayout
    title="错题回顾"
    :description="paper?.title"
    max-width="880px"
    show-back
  >
    <template #header-actions>
      <UButton
        v-if="paper && attempt"
        color="neutral"
        variant="outline"
        icon="i-lucide-clipboard-list"
        label="查看小结"
        :to="`/review/${paper.id}/attempt/${attempt.id}`"
      />
    </template>

    <div v-if="isLoading" class="space-y-3">
      <USkeleton class="h-20 w-full rounded-xl" />
      <USkeleton class="h-40 w-full rounded-xl" />
    </div>

    <p v-else-if="!paper || !attempt" class="text-sm text-muted">
      查无记录或记录已删除。
    </p>

    <UEmpty
      v-else-if="wrongQuestions.length === 0"
      icon="i-lucide-party-popper"
      title="本次作答没有错题"
      description="全部答对，继续保持！"
      variant="naked"
      class="rounded-xl border border-dashed border-default py-16"
    />

    <div v-else class="space-y-6">
      <UCard :ui="{ body: 'p-5' }">
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <p class="text-xs text-muted">所属试卷</p>
            <p class="mt-1 truncate text-sm font-medium text-highlighted">
              {{ paper.title }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">错题总数</p>
            <p class="mt-1 text-sm font-medium text-error">
              {{ wrongQuestions.length }} 题
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">作答时间</p>
            <p class="mt-1 text-sm font-medium text-highlighted">
              {{ new Date(attempt.startedAt).toLocaleString('zh-CN') }}
            </p>
          </div>
        </div>
      </UCard>

      <div class="grid gap-4">
        <WrongQuestionCard
          v-for="item in pagedQuestions"
          :key="item.question.id"
          :question="item.question"
          :status="item.status"
          :selected-answer="attempt.answers[item.question.id]?.selected ?? []"
        />
      </div>

      <Pagination
        v-if="totalPages > 1"
        :current="currentPage"
        :total="totalPages"
        @update:current="currentPage = $event"
      />
    </div>
  </PageLayout>
</template>
