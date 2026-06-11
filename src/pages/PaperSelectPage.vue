<script setup lang="ts">
import {
  mdiAlertCircleOutline,
  mdiHistory,
  mdiPlay,
  mdiPlus,
  mdiTrashCanOutline,
} from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppIcon from '../components/ui/AppIcon.vue';
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
  router.push(
    `/wrong-review/${attempt.paperId}/attempt/${attempt.id}`,
  );
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
  <PageLayout title="试卷管理">
    <div v-if="isLoading" class="text-muted text-sm">加载中…</div>

    <div v-else class="grid grid-cols-[360px_1fr] gap-6 max-lg:grid-cols-1">
      <div
        class="bg-surface rounded-2xl border border-[color:var(--border)] overflow-hidden max-h-[600px] max-sm:max-h-[280px] flex flex-col"
      >
        <div
          class="p-4 border-b border-[color:var(--border)] flex items-center justify-between"
        >
          <span class="text-sm font-medium text-muted">
            我的试卷（{{ papers.length }}）
          </span>
          <AppButton
            variant="inline"
            :icon-path="mdiPlus"
            :icon-size="16"
            @click="goToCreatePaper"
          >
            新建试卷
          </AppButton>
        </div>
        <div
          class="flex-1 overflow-y-auto divide-y divide-[color:var(--border)]"
        >
          <div
            v-if="papers.length === 0"
            class="p-6 text-center text-muted text-sm h-full flex items-center justify-center"
          >
            暂无试卷
          </div>
          <button
            v-for="paper in papers"
            :key="paper.id"
            class="w-full text-left p-4 max-sm:p-3 cursor-pointer border-none bg-transparent transition-colors duration-150 hover:bg-surface-soft"
            :class="{
              '!bg-[rgba(47,133,90,0.08)]': selectedPaperId === paper.id,
            }"
            @click="selectedPaperId = paper.id"
          >
            <div class="font-medium text-sm">{{ paper.title }}</div>
            <div class="block text-[11px] text-muted/70 mt-0.5">
              {{ paper.questions.length }} 题 · 生成于
              {{ new Date(paper.createdAt).toLocaleDateString('zh-CN') }}
            </div>
          </button>
        </div>
      </div>

      <div
        v-if="!selectedPaper"
        class="flex items-center justify-center h-[400px] bg-surface rounded-2xl border border-[color:var(--border)] text-muted text-sm"
      >
        请选择一个试卷……
      </div>

      <div v-else class="flex flex-col gap-5 min-w-0 pb-[100px]">
        <AppCard class="max-sm:p-4">
          <div class="flex justify-between items-start mb-5">
            <div>
              <div class="text-[22px] max-sm:text-lg mb-1">
                {{ selectedPaper.title }}
              </div>
              <span class="text-sm text-muted">
                生成于
                {{ new Date(selectedPaper.createdAt).toLocaleString('zh-CN') }}
              </span>
            </div>
            <button
              class="text-danger flex items-center p-2 rounded hover:bg-danger/10 transition-colors cursor-pointer border-none bg-transparent"
              @click="removePaper(selectedPaper.id)"
              title="删除试卷"
            >
              <AppIcon :path="mdiTrashCanOutline" :size="20" />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1 min-w-0">
            <AppCard class="!p-4 bg-surface-soft">
              <div
                class="text-xs text-muted tracking-wide uppercase mb-3 font-bold"
              >
                题量统计
              </div>
              <div class="grid gap-2">
                <div
                  v-for="[type, count] in typeStats"
                  :key="type"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-muted">{{ typeLabels[type] }}</span>
                  <span class="font-semibold">
                    {{ count }}
                    <span class="text-xs text-muted font-normal ml-0.5">
                      题
                    </span>
                  </span>
                </div>
                <div
                  class="border-t border-[color:var(--border)] pt-2 mt-1 flex items-center justify-between text-sm font-medium"
                >
                  <span>总计</span>
                  <span class="text-brand">
                    {{ selectedPaper.questions.length }} 题
                  </span>
                </div>
              </div>
            </AppCard>

            <AppCard class="!p-4 bg-surface-soft">
              <div
                class="text-xs text-muted tracking-wide uppercase mb-3 font-bold"
              >
                来源题库
              </div>
              <div
                v-if="selectedPaper.bankNames?.length"
                class="flex flex-wrap gap-1.5"
              >
                <span
                  v-for="name in selectedPaper.bankNames"
                  :key="name"
                  class="text-xs px-2 py-1 rounded-full bg-surface-chip text-muted"
                >
                  {{ name }}
                </span>
              </div>
              <div v-else class="text-xs text-muted">未知来源</div>
            </AppCard>
          </div>

          <div class="flex gap-3 justify-center mt-5">
            <AppButton
              :icon-path="mdiPlay"
              :icon-size="18"
              @click="startNewAttempt('practice')"
            >
              练习模式
            </AppButton>
            <AppButton
              :icon-path="mdiPlay"
              :icon-size="18"
              variant="secondary"
              @click="startNewAttempt('exam')"
            >
              考试模式
            </AppButton>
          </div>
        </AppCard>

        <AppCard class="max-sm:p-4">
          <div class="text-sm font-medium mb-4 flex items-center gap-2">
            <AppIcon :path="mdiHistory" :size="18" class="text-muted" />
            <span>历史作答记录 ({{ selectedAttempts.length }}次)</span>
          </div>

          <div
            v-if="selectedAttempts.length === 0"
            class="text-sm text-muted text-center py-4"
          >
            暂无历史作答
          </div>

          <div v-else class="flex flex-col gap-3">
            <div
              v-for="(attempt, index) in selectedAttempts"
              :key="attempt.id"
              class="p-3 border border-[color:var(--border)] rounded-lg flex items-center justify-between gap-3 flex-wrap"
            >
              <div class="flex flex-col">
                <span class="text-sm font-medium flex items-center gap-2">
                  第 {{ selectedAttempts.length - index }} 次作答
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded-full"
                    :class="
                      attempt.submittedAt
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    "
                  >
                    {{ attempt.submittedAt ? '已完成' : '进行中' }}
                  </span>
                </span>
                <span class="text-xs text-muted mt-1">
                  开始于:
                  {{ new Date(attempt.startedAt).toLocaleString('zh-CN') }}
                </span>
                <span class="text-xs text-muted">
                  模式: {{ attempt.mode === 'exam' ? '考试' : '练习' }}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <AppButton
                  size="small"
                  variant="secondary"
                  @click="resumeOrReviewAttempt(attempt)"
                >
                  {{ attempt.submittedAt ? '查看记录' : '继续作答' }}
                </AppButton>
                <AppButton
                  v-if="attempt.submittedAt"
                  size="small"
                  variant="secondary"
                  @click="viewWrongQuestions(attempt)"
                >
                  <AppIcon
                    :path="mdiAlertCircleOutline"
                    :size="14"
                    class="mr-1"
                  />
                  错题
                </AppButton>
                <button
                  class="text-danger p-2 rounded hover:bg-danger/10 transition-colors cursor-pointer border-none bg-transparent shrink-0"
                  :title="'删除此作答记录'"
                  @click="deleteAttempt(attempt.id)"
                >
                  <AppIcon :path="mdiTrashCanOutline" :size="20" />
                </button>
              </div>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </PageLayout>
</template>
