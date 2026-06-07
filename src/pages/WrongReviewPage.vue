<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StatusPill from '../components/StatusPill.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import PageLayout from '../components/ui/PageLayout.vue';
import Pagination from '../components/ui/Pagination.vue';
import type { QuestionItem } from '../types/bank';
import type { QuestionType } from '../types/core';
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
  const paperId = route.query.paperId as string;
  const attemptId = route.query.attemptId as string;

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

function typeLabel(type: QuestionType) {
  const map: Record<QuestionType, string> = {
    single: '单选',
    multiple: '多选',
    indeterminate: '不定项',
    judge: '判断',
  };
  return map[type] || '未知';
}

function formatAnswer(question: QuestionItem) {
  if (question.type === 'judge') {
    return question.answer
      .map((id) => (id === 'T' ? '正确' : '错误'))
      .join(' / ');
  }
  return question.answer.join(' / ');
}

function userSelectedFormat(question: QuestionItem, selectedIds: string[]) {
  if (selectedIds.length === 0) return '未作答';
  if (question.type === 'judge') {
    return selectedIds.map((id) => (id === 'T' ? '正确' : '错误')).join(' / ');
  }
  return selectedIds.join(' / ');
}
</script>

<template>
  <PageLayout title="错题回顾" max-width="800px" show-back>
    <div v-if="isLoading" class="text-muted text-sm pb-[100px]">加载中…</div>

    <template v-else>
      <div v-if="!paper || !attempt" class="text-muted text-sm pb-10">
        查无记录或记录已删除。
      </div>
      <div
        v-else-if="wrongQuestions.length === 0"
        class="bg-surface rounded-2xl p-8 border border-[color:var(--border)] text-center text-muted"
      >
        本次作答没有错题。
      </div>

      <div v-else>
        <div
          class="bg-surface rounded-2xl p-5 border border-[color:var(--border)] mb-6 text-sm flex gap-6 max-sm:flex-col max-sm:gap-3"
        >
          <div class="flex flex-col">
            <span class="text-muted text-xs mb-1">所属试卷</span>
            <span class="font-medium">{{ paper.title }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-muted text-xs mb-1">错题总数</span>
            <span class="font-medium text-danger"
              >{{ wrongQuestions.length }} 题</span
            >
          </div>
          <div class="flex flex-col">
            <span class="text-muted text-xs mb-1">作答时间</span>
            <span class="font-medium">{{
              new Date(attempt.startedAt).toLocaleString('zh-CN')
            }}</span>
          </div>
        </div>

        <ul class="list-none m-0 p-0 grid gap-4 mb-6">
          <li
            v-for="item in pagedQuestions"
            :key="item.question.id"
            class="bg-surface rounded-2xl p-5 border border-[color:var(--border)]"
          >
            <div class="mb-4 text-base font-medium">
              {{ item.question.stem }}
            </div>

            <div
              v-if="item.question.options.length > 0"
              class="mb-4 pl-4 border-l-2 border-[color:var(--border)]"
            >
              <div
                v-for="opt in item.question.options"
                :key="opt.id"
                class="text-sm py-1"
              >
                <span class="font-medium mr-2">{{ opt.id }}.</span>
                <span class="text-muted text-foreground">{{ opt.text }}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <StatusPill :status="item.status as any" />
              <span
                class="bg-surface-chip rounded-full px-3 py-1 text-xs text-muted"
              >
                {{ typeLabel(item.question.type) }}
              </span>
              <span
                class="bg-surface-chip rounded-full px-3 py-1 text-xs text-muted"
              >
                您的作答：{{
                  userSelectedFormat(
                    item.question,
                    attempt.answers[item.question.id]?.selected || [],
                  )
                }}
              </span>
              <span
                class="bg-surface-chip rounded-full px-3 py-1 text-xs text-muted border border-brand/20 bg-brand/5 text-brand mix-blend-multiply"
              >
                参考答案：{{ formatAnswer(item.question) }}
              </span>
            </div>

            <div
              v-if="item.question.analysis"
              class="mt-4 pt-4 border-t border-[color:var(--border)] text-sm text-muted"
            >
              <span class="font-medium text-foreground mb-1 block">解析：</span>
              {{ item.question.analysis }}
            </div>
          </li>
        </ul>

        <Pagination
          v-if="totalPages > 1"
          :current="currentPage"
          :total="totalPages"
          @update:current="currentPage = $event"
          class="pb-10"
        />
      </div>
    </template>
  </PageLayout>
</template>
