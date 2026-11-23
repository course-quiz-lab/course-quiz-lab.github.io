<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageLayout from '../components/ui/PageLayout.vue';
import { useAttemptStore } from '../stores/attempt';
import { usePaperStore } from '../stores/paper';
import type { QuestionType } from '../types/core';
import type { Paper, PaperAttempt } from '../types/quiz';
import {
  deletePaper,
  deletePaperAttempt,
  listPaperAttempts,
  listPapers,
} from '../utils/idb';

const router = useRouter();
const attemptStore = useAttemptStore();
const paperStore = usePaperStore();

const papers = ref<Paper[]>([]);
const selectedPaperId = ref<string | null>(null);
const isLoading = ref(true);

const attemptsByPaper = ref<Record<string, PaperAttempt[]>>({});

onMounted(async () => {
  papers.value = await listPapers();
  for (const p of papers.value) {
    attemptsByPaper.value[p.id] = await listPaperAttempts(p.id);
  }
  if (papers.value.length > 0) {
    selectedPaperId.value = papers.value[0].id;
  }
  isLoading.value = false;
});

const selectedPaper = computed(() => {
  return papers.value.find((p) => p.id === selectedPaperId.value) || null;
});

const selectedAttempts = computed(() => {
  return selectedPaperId.value
    ? attemptsByPaper.value[selectedPaperId.value] || []
    : [];
});

const typeLabels: Record<QuestionType, string> = {
  single: '单项选择题',
  multiple: '多项选择题',
  judge: '判断题',
  indeterminate: '不定项选择题',
};

const typeStats = computed(() => {
  if (!selectedPaper.value) return [];
  const counts: Record<QuestionType, number> = {
    single: 0,
    multiple: 0,
    judge: 0,
    indeterminate: 0,
  };
  for (const q of selectedPaper.value.questions) {
    if (counts[q.type] !== undefined) counts[q.type]++;
  }
  return (Object.entries(counts) as [QuestionType, number][]).filter(
    ([, count]) => count > 0,
  );
});

function goToCreatePaper() {
  router.push('/papers/create');
}

async function startNewAttempt(mode: 'practice' | 'exam') {
  if (!selectedPaper.value) return;
  paperStore.paper = selectedPaper.value;
  const attemptId = await attemptStore.startAttempt(
    selectedPaper.value.id,
    mode,
    selectedPaper.value.questions,
  );
  router.push(`/quiz/${selectedPaper.value.id}/attempt/${attemptId}`);
}

async function resumeOrReviewAttempt(attempt: PaperAttempt) {
  if (attempt.submittedAt) {
    // Review
    router.push(`/review/${attempt.paperId}/attempt/${attempt.id}`);
  } else {
    // Resume
    router.push(`/quiz/${attempt.paperId}/attempt/${attempt.id}`);
  }
}

function viewWrongQuestions(attempt: PaperAttempt) {
  router.push(`/wrong-review/${attempt.paperId}/attempt/${attempt.id}`);
}

async function removePaper(id: string) {
  if (confirm('确认删除该试卷及所有作答记录？')) {
    await deletePaper(id);
    papers.value = await listPapers();
    if (selectedPaperId.value === id) {
      selectedPaperId.value = papers.value.length ? papers.value[0].id : null;
    }
  }
}

async function deleteAttempt(attemptId: string) {
  if (!confirm('确认删除此作答记录？')) return;
  await deletePaperAttempt(attemptId);
  // Refresh attempts for current paper
  if (selectedPaperId.value) {
    attemptsByPaper.value[selectedPaperId.value] = await listPaperAttempts(
      selectedPaperId.value,
    );
  }
}
</script>

<template>
  <PageLayout
    title="试卷管理"
    description="选择一份试卷开始练习，或创建新的试卷。"
  >
    <template #header-actions>
      <UButton
        icon="i-lucide-plus"
        label="新建试卷"
        size="sm"
        @click="goToCreatePaper"
      />
    </template>

    <div v-if="isLoading" class="text-sm text-muted">加载中…</div>

    <UEmpty
      v-else-if="papers.length === 0"
      icon="i-lucide-file-text"
      title="还没有试卷"
      description="先导入题库，再按题型与数量生成试卷。"
      variant="naked"
      class="rounded-xl border border-dashed border-default py-16"
    >
      <template #actions>
        <UButton to="/import" icon="i-lucide-download" label="导入题库" />
        <UButton
          to="/papers/create"
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          label="直接创建"
        />
      </template>
    </UEmpty>

    <div v-else class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <UCard :ui="{ body: 'p-2' }" class="h-fit lg:sticky lg:top-24">
        <div class="flex items-center justify-between px-2 pb-2 pt-1">
          <span class="text-xs font-medium uppercase tracking-wide text-muted">
            我的试卷 · {{ papers.length }}
          </span>
        </div>

        <div class="max-h-[560px] space-y-1 overflow-y-auto">
          <button
            v-for="paper in papers"
            :key="paper.id"
            type="button"
            class="w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors duration-150"
            :class="
              selectedPaperId === paper.id
                ? 'border-primary/30 bg-primary/10'
                : 'border-transparent hover:bg-elevated'
            "
            @click="selectedPaperId = paper.id"
          >
            <span class="block truncate text-sm font-medium text-highlighted">
              {{ paper.title }}
            </span>
            <span class="mt-0.5 block text-xs text-muted">
              {{ paper.questions.length }} 题 ·
              {{ new Date(paper.createdAt).toLocaleDateString('zh-CN') }}
            </span>
          </button>
        </div>
      </UCard>

      <div v-if="selectedPaper" class="min-w-0 space-y-6">
        <UCard>
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 class="truncate text-xl font-semibold text-highlighted">
                {{ selectedPaper.title }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                生成于
                {{ new Date(selectedPaper.createdAt).toLocaleString('zh-CN') }}
              </p>
            </div>
            <UTooltip text="删除试卷">
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash"
                square
                aria-label="删除试卷"
                @click="removePaper(selectedPaper.id)"
              />
            </UTooltip>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg border border-default bg-elevated p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                题量统计
              </p>
              <div class="mt-3 space-y-2">
                <div
                  v-for="[type, count] in typeStats"
                  :key="type"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-muted">{{ typeLabels[type] }}</span>
                  <span class="font-medium text-highlighted">{{ count }}</span>
                </div>
                <div
                  class="flex items-center justify-between border-t border-default pt-2 text-sm"
                >
                  <span class="font-medium">总计</span>
                  <span class="font-semibold text-primary">
                    {{ selectedPaper.questions.length }} 题
                  </span>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-default bg-elevated p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                来源题库
              </p>
              <div
                v-if="selectedPaper.bankNames?.length"
                class="mt-3 flex flex-wrap gap-1.5"
              >
                <UBadge
                  v-for="name in selectedPaper.bankNames"
                  :key="name"
                  color="neutral"
                  variant="soft"
                  size="md"
                >
                  {{ name }}
                </UBadge>
              </div>
              <p v-else class="mt-3 text-sm text-muted">未知来源</p>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
            <UButton
              icon="i-lucide-play"
              label="练习模式"
              @click="startNewAttempt('practice')"
            />
            <UButton
              icon="i-lucide-square-pen"
              label="考试模式"
              color="neutral"
              variant="outline"
              @click="startNewAttempt('exam')"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-history" class="size-4 text-muted" />
              <span class="text-sm font-medium text-highlighted">
                历史作答
              </span>
              <UBadge color="neutral" variant="soft" size="md">
                {{ selectedAttempts.length }}
              </UBadge>
            </div>
          </template>

          <p
            v-if="selectedAttempts.length === 0"
            class="py-6 text-center text-sm text-muted"
          >
            暂无历史作答
          </p>

          <div v-else class="space-y-2">
            <div
              v-for="(attempt, index) in selectedAttempts"
              :key="attempt.id"
              class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-3"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-highlighted">
                    第 {{ selectedAttempts.length - index }} 次作答
                  </span>
                  <UBadge
                    :color="attempt.submittedAt ? 'success' : 'warning'"
                    variant="soft"
                    size="md"
                  >
                    {{ attempt.submittedAt ? '已完成' : '进行中' }}
                  </UBadge>
                  <UBadge color="neutral" variant="soft" size="md">
                    {{ attempt.mode === 'exam' ? '考试' : '练习' }}
                  </UBadge>
                </div>
                <p class="mt-1 text-xs text-muted">
                  开始于
                  {{ new Date(attempt.startedAt).toLocaleString('zh-CN') }}
                </p>
              </div>

              <div class="flex items-center gap-1">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  :label="attempt.submittedAt ? '查看记录' : '继续作答'"
                  @click="resumeOrReviewAttempt(attempt)"
                />
                <UButton
                  v-if="attempt.submittedAt"
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-circle-alert"
                  label="错题"
                  @click="viewWrongQuestions(attempt)"
                />
                <UTooltip text="删除此作答记录">
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash"
                    square
                    size="sm"
                    aria-label="删除此作答记录"
                    @click="deleteAttempt(attempt.id)"
                  />
                </UTooltip>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </PageLayout>
</template>
