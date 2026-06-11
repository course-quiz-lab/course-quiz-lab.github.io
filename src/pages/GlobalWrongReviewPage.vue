<script setup lang="ts">
import { mdiMagnify, mdiPencilOutline } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import WrongQuestionCard from '../components/WrongQuestionCard.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import PageLayout from '../components/ui/PageLayout.vue';
import Pagination from '../components/ui/Pagination.vue';
import type { QuestionItem } from '../types/bank';
import type { Paper, PaperAttempt } from '../types/quiz';
import { questionKey } from '../utils/dedup';
import { listPaperAttempts, listPapers } from '../utils/idb';
import { evaluateStatus } from '../utils/scoring';

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



function goToPaper() {
  router.push('/papers');
}
</script>

<template>
  <PageLayout title="错题本" max-width="800px">
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
              <span class="text-muted text-xs mb-1">错题数</span>
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
          <WrongQuestionCard
            v-for="item in pagedItems"
            :key="
              item.paper.id + '-' + item.question.id + '-' + item.attempt.id
            "
            :question="item.question"
            :status="item.status"
            :paper-title="item.paper.title"
            :attempt-date="item.attempt.startedAt"
            :attempt-mode="item.attempt.mode"
            :wrong-count="item.wrongCount"
            :selected-answer="item.attempt.answers[item.question.id]?.selected ?? []"
          />
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
