<script setup lang="ts">
import { mdiMagnify, mdiPencilOutline } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import StatusPill from '../components/StatusPill.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import PageLayout from '../components/ui/PageLayout.vue';
import Pagination from '../components/ui/Pagination.vue';
import type { QuestionItem } from '../types/bank';
import type { QuestionType } from '../types/core';
import type { Paper, PaperAttempt } from '../types/quiz';
import { listPaperAttempts, listPapers } from '../utils/idb';
import { evaluateStatus } from '../utils/scoring';
import { questionKey } from '../utils/dedup';

const PAGE_SIZE = 15;

const router = useRouter();
const wrongItems = ref<WrongItem[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');

interface WrongItem {
  paper: Paper;
  attempt: PaperAttempt;
  question: QuestionItem;
  status: string;
  wrongCount: number;
}

onMounted(async () => {
  const papers = await listPapers();
  const rawItems: WrongItem[] = [];

  for (const paper of papers) {
    const attempts = await listPaperAttempts(paper.id);
    for (const attempt of attempts) {
      // Only include attempts with answers (submitted exam or practice mode)
      if (attempt.mode === 'exam' && !attempt.submittedAt) continue;

      for (const q of paper.questions) {
        const entry = attempt.answers[q.id];
        if (!entry || entry.selected.length === 0) continue;
        const status = evaluateStatus(q, entry.selected);
        if (status === 'wrong' || status === 'partial') {
          rawItems.push({ paper, attempt, question: q, status, wrongCount: 1 });
        }
      }
    }
  }

  // Deduplicate by normalized key, count occurrences
  const keyCounts = new Map<string, number>();
  for (const item of rawItems) {
    const key = questionKey(item.question);
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  }

  // Keep the most recent occurrence per key
  const seen = new Set<string>();
  // Sort by most recent attempt first so the first occurrence per key is the latest
  rawItems.sort((a, b) => b.attempt.startedAt - a.attempt.startedAt);
  const items: WrongItem[] = [];
  for (const item of rawItems) {
    const key = questionKey(item.question);
    if (!seen.has(key)) {
      seen.add(key);
      item.wrongCount = keyCounts.get(key) ?? 1;
      items.push(item);
    }
  }

  wrongItems.value = items;
  isLoading.value = false;
});

function matchesSearch(item: WrongItem, query: string): boolean {
  const q = query.toLowerCase();
  const { question } = item;
  if (question.stem.toLowerCase().includes(q)) return true;
  if (question.options.some((o) => o.text.toLowerCase().includes(q)))
    return true;
  if (question.analysis?.toLowerCase().includes(q)) return true;
  return false;
}

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return wrongItems.value;
  return wrongItems.value.filter((item) =>
    matchesSearch(item, searchQuery.value.trim()),
  );
});

// Reset to page 1 when search changes
watch(searchQuery, () => {
  currentPage.value = 1;
});

const currentPage = ref(1);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / PAGE_SIZE)),
);
const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredItems.value.slice(start, start + PAGE_SIZE);
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

function userSelectedFormat(question: QuestionItem, attempt: PaperAttempt) {
  const selected = attempt.answers[question.id]?.selected ?? [];
  if (selected.length === 0) return '未作答';
  if (question.type === 'judge') {
    return selected.map((id) => (id === 'T' ? '正确' : '错误')).join(' / ');
  }
  return selected.join(' / ');
}

function goToPaper() {
  router.push('/papers');
}
</script>

<template>
  <PageLayout title="错题本">
    <div v-if="isLoading" class="text-muted text-sm pb-[100px]">加载中…</div>

    <div
      v-else-if="wrongItems.length === 0"
      class="text-center py-16 bg-surface rounded-2xl border border-[color:var(--border)]"
    >
      <div class="text-4xl mb-4 select-none">🎉</div>
      <p class="text-muted text-sm mb-4">恭喜，你的错题本空空如也！</p>
      <AppButton
        :icon-path="mdiPencilOutline"
        :icon-size="18"
        variant="secondary"
        @click="goToPaper"
      >
        去做题
      </AppButton>
    </div>

    <template v-else>
      <div
        class="bg-surface rounded-2xl px-7 py-5 border border-[color:var(--border)] text-sm flex flex-wrap items-center gap-4 mb-6 max-sm:flex-col max-sm:items-stretch"
      >
        <div class="flex gap-6 max-sm:gap-4">
          <div class="flex flex-col">
              <span class="text-muted text-xs mb-1">去重错题</span>
            <span class="font-medium text-danger text-lg"
              >{{ wrongItems.length }} 题</span
            >
          </div>
          <div class="flex flex-col">
            <span class="text-muted text-xs mb-1">涵盖试卷</span>
            <span class="font-medium text-lg">
              {{ new Set(wrongItems.map((i) => i.paper.id)).size }} 份
            </span>
          </div>
        </div>
        <div class="relative w-1/2 sm:ml-auto sm:max-w-[500px] max-sm:w-full">
          <AppIcon
            :path="mdiMagnify"
            :size="18"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索题干、选项或解析…"
            class="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[color:var(--border)] bg-surface focus:border-brand focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div
        v-if="filteredItems.length === 0"
        class="text-center py-12 bg-surface rounded-2xl border border-[color:var(--border)]"
      >
        <p class="text-muted text-sm">没有匹配的错题</p>
      </div>

      <template v-else>
        <div class="grid gap-4 mb-6">
          <AppCard
            v-for="item in pagedItems"
            :key="
              item.paper.id + '-' + item.question.id + '-' + item.attempt.id
            "
          >
            <div class="flex items-center gap-2 text-[11px] text-muted mb-3">
              <span
                class="px-2 py-0.5 rounded border border-[color:var(--border)] bg-surface-soft"
              >
                {{ item.paper.title }}
              </span>
              <span
                v-if="item.wrongCount > 1"
                class="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-medium"
              >
                错 {{ item.wrongCount }} 次
              </span>
              <span>·</span>
              <span>{{
                new Date(item.attempt.startedAt).toLocaleDateString('zh-CN')
              }}</span>
              <span>·</span>
              <span>{{ item.attempt.mode === 'exam' ? '考试' : '练习' }}</span>
            </div>

            <div class="mb-3 text-base font-medium">
              {{ item.question.stem }}
            </div>

            <div
              v-if="item.question.options.length > 0"
              class="mb-3 pl-4 border-l-2 border-[color:var(--border)]"
            >
              <div
                v-for="opt in item.question.options"
                :key="opt.id"
                class="text-sm py-1 px-2 -mx-2 rounded"
                :class="
                  item.question.answer.includes(opt.id)
                    ? 'bg-[rgba(47,133,90,0.1)]'
                    : ''
                "
              >
                <span class="font-medium mr-2">{{ opt.id }}.</span>
                <span class="text-muted text-foreground">{{ opt.text }}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <StatusPill :status="item.status as any" />
              <span
                class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted"
              >
                {{ typeLabel(item.question.type) }}
              </span>
              <span
                class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted"
              >
                您的作答：{{ userSelectedFormat(item.question, item.attempt) }}
              </span>
              <span
                class="bg-[rgba(47,133,90,0.14)] text-ok rounded-full px-2.5 py-1 text-xs border border-brand/20 bg-brand/5 text-brand"
              >
                参考答案：{{ formatAnswer(item.question) }}
              </span>
            </div>

            <div
              v-if="item.question.analysis"
              class="mt-3 pt-3 border-t border-[color:var(--border)] text-sm text-muted"
            >
              <span class="font-medium text-foreground block mb-1">解析：</span>
              {{ item.question.analysis }}
            </div>
          </AppCard>
        </div>

        <Pagination
          v-if="totalPages > 1"
          :current="currentPage"
          :total="totalPages"
          @update:current="currentPage = $event"
          class="pb-10"
        />
      </template>
    </template>
  </PageLayout>
</template>
