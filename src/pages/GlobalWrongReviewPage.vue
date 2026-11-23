<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import WrongQuestionCard from '../components/WrongQuestionCard.vue';
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

const paperCount = computed(
  () => new Set(wrongItems.value.map((i) => i.paper.id)).size,
);

function goToPaper() {
  router.push('/papers');
}
</script>

<template>
  <PageLayout
    title="错题本"
    description="汇总所有试卷中的错题，按最近一次作答去重。"
  >
    <template #header-actions>
      <UButton
        icon="i-lucide-play"
        label="开始练习"
        size="sm"
        @click="goToPaper"
      />
    </template>

    <div v-if="isLoading" class="space-y-3">
      <USkeleton class="h-24 w-full rounded-xl" />
      <USkeleton v-for="i in 3" :key="i" class="h-40 w-full rounded-xl" />
    </div>

    <UEmpty
      v-else-if="wrongItems.length === 0"
      icon="i-lucide-party-popper"
      title="错题本空空如也"
      description="目前还没有错题，去做几套题试试吧。"
      variant="naked"
      class="rounded-xl border border-dashed border-default py-16"
    >
      <template #actions>
        <UButton icon="i-lucide-play" label="去做题" @click="goToPaper" />
      </template>
    </UEmpty>

    <template v-else>
      <UCard :ui="{ body: 'p-5' }">
        <div class="flex flex-wrap items-center gap-6">
          <div class="flex items-center gap-6">
            <div>
              <p class="text-xs text-muted">错题数</p>
              <p class="mt-1 text-2xl font-semibold text-error">
                {{ wrongItems.length }}
              </p>
            </div>
            <USeparator orientation="vertical" class="h-10" />
            <div>
              <p class="text-xs text-muted">涵盖试卷</p>
              <p class="mt-1 text-2xl font-semibold text-highlighted">
                {{ paperCount }}
              </p>
            </div>
          </div>

          <div class="w-full sm:ml-auto sm:max-w-sm">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="搜索题干、选项或解析…"
              class="w-full"
            />
          </div>
        </div>
      </UCard>

      <UEmpty
        v-if="filteredItems.length === 0"
        icon="i-lucide-search-x"
        title="没有匹配的错题"
        description="换个关键词试试。"
        variant="naked"
        class="rounded-xl border border-dashed border-default py-12"
      />

      <template v-else>
        <div class="grid gap-4">
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
            :selected-answer="
              item.attempt.answers[item.question.id]?.selected ?? []
            "
          />
        </div>

        <Pagination
          v-if="totalPages > 1"
          :current="currentPage"
          :total="totalPages"
          @update:current="currentPage = $event"
        />
      </template>
    </template>
  </PageLayout>
</template>
