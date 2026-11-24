<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import WrongBookFilterBar from '../components/WrongBookFilterBar.vue';
import WrongBookQuestionCard from '../components/WrongBookQuestionCard.vue';
import PageLayout from '../components/ui/PageLayout.vue';
import Pagination from '../components/ui/Pagination.vue';
import { useWrongBookFilters } from '../composables/useWrongBookFilters';
import type { QuestionType } from '../types/core';
import type { PaperAttempt } from '../types/quiz';
import { listBankMetas, listPaperAttempts, listPapers } from '../utils/idb';
import {
  buildWrongBookFilterOptions,
  buildWrongBookItems,
  matchesWrongBookFilters,
  type WrongBookItem,
} from '../utils/wrongbook';

const PAGE_SIZE = 15;

const router = useRouter();
const wrongItems = ref<WrongBookItem[]>([]);
const isLoading = ref(true);
const currentPage = ref(1);

const {
  filters,
  searchQuery,
  hasActiveFilters,
  syncWithOptions,
  clearFilters,
} = useWrongBookFilters();

onMounted(async () => {
  // 一次性批量读取，避免按试卷逐份串行查询作答记录
  const [papers, attempts, metas] = await Promise.all([
    listPapers(),
    listPaperAttempts(),
    listBankMetas(),
  ]);

  const attemptsByPaper = new Map<string, PaperAttempt[]>();
  for (const attempt of attempts) {
    const list = attemptsByPaper.get(attempt.paperId) ?? [];
    list.push(attempt);
    attemptsByPaper.set(attempt.paperId, list);
  }

  const metaByBankId = new Map(metas.map((entry) => [entry.bankId, entry]));

  wrongItems.value = buildWrongBookItems(
    papers,
    attemptsByPaper,
    metaByBankId,
  );

  // 恢复持久化筛选后，剔除已不存在的题型 / 课程 / 题库选项
  syncWithOptions(buildWrongBookFilterOptions(wrongItems.value));
  isLoading.value = false;
});

const filterOptions = computed(() => buildWrongBookFilterOptions(wrongItems.value));

// USelectMenu 的值为字符串数组，这里收敛为筛选状态的强类型
const typeModel = computed({
  get: () => filters.types as string[],
  set: (value: string[] | undefined) => {
    filters.types = (value ?? []) as QuestionType[];
  },
});

const courseModel = computed({
  get: () => filters.courses,
  set: (value: string[] | undefined) => {
    filters.courses = value ?? [];
  },
});

const bankModel = computed({
  get: () => filters.banks,
  set: (value: string[] | undefined) => {
    filters.banks = value ?? [];
  },
});

const filteredItems = computed(() =>
  wrongItems.value.filter((item) =>
    matchesWrongBookFilters(item, filters, searchQuery.value),
  ),
);

const filteredWrongCount = computed(() =>
  filteredItems.value.reduce((sum, item) => sum + item.wrongCount, 0),
);

const filteredBankCount = computed(
  () => new Set(filteredItems.value.map((item) => item.source.bankName)).size,
);

watch(filteredItems, () => {
  currentPage.value = 1;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / PAGE_SIZE)),
);

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages;
});

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredItems.value.slice(start, start + PAGE_SIZE);
});

function questionIndex(item: WrongBookItem) {
  const index = item.paper.questions.findIndex(
    (question) => question.id === item.question.id,
  );
  return index === -1 ? undefined : index;
}

function goToPaper() {
  router.push('/papers');
}
</script>

<template>
  <PageLayout
    title="错题本"
    description="汇总所有试卷中的错题，按题目去重并保留最近一次作答。"
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
      <USkeleton class="h-28 w-full rounded-xl" />
      <USkeleton v-for="i in 3" :key="i" class="h-48 w-full rounded-xl" />
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
      <div
        class="grid gap-4 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-6"
      >
        <aside class="space-y-4 lg:sticky lg:top-20">
          <UCard :ui="{ body: 'p-4' }">
            <div class="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-3">
              <div>
                <p class="text-sm text-muted">错题数</p>
                <p class="mt-1 text-2xl font-semibold leading-none text-error">
                  {{ filteredItems.length }}
                  <span
                    v-if="hasActiveFilters"
                    class="ml-0.5 text-sm font-normal text-dimmed"
                  >
                    / {{ wrongItems.length }}
                  </span>
                </p>
              </div>
              <div>
                <p class="text-sm text-muted">累计答错</p>
                <p
                  class="mt-1 text-2xl font-semibold leading-none text-highlighted"
                >
                  {{ filteredWrongCount }}
                  <span class="ml-0.5 text-sm font-normal text-muted">次</span>
                </p>
              </div>
              <div>
                <p class="text-sm text-muted">涵盖题库</p>
                <p
                  class="mt-1 text-2xl font-semibold leading-none text-highlighted"
                >
                  {{ filteredBankCount }}
                </p>
              </div>
            </div>
          </UCard>

          <WrongBookFilterBar
            v-model:types="typeModel"
            v-model:courses="courseModel"
            v-model:banks="bankModel"
            v-model:search="searchQuery"
            :options="filterOptions"
            @clear="clearFilters"
          />
        </aside>

        <section class="min-w-0 max-w-4xl space-y-3 sm:space-y-4">
          <UEmpty
            v-if="filteredItems.length === 0"
            icon="i-lucide-search-x"
            title="没有匹配的错题"
            :description="
              hasActiveFilters
                ? '当前筛选条件下没有错题，试试清除部分条件。'
                : '换个关键词试试。'
            "
            variant="naked"
            class="rounded-xl border border-dashed border-default py-12"
          >
            <template #actions>
              <UButton
                v-if="hasActiveFilters"
                color="neutral"
                variant="outline"
                icon="i-lucide-filter-x"
                label="清除筛选"
                @click="clearFilters"
              />
            </template>
          </UEmpty>

          <template v-else>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-muted">
                共
                <span class="font-medium text-highlighted">
                  {{ filteredItems.length }}
                </span>
                道错题
              </p>
              <p class="text-xs text-muted">
                第 {{ currentPage }} / {{ totalPages }} 页 · 每页
                {{ PAGE_SIZE }} 题
              </p>
            </div>

            <div class="grid gap-3 sm:gap-4">
              <WrongBookQuestionCard
                v-for="item in pagedItems"
                :key="item.key"
                :question="item.question"
                :index="questionIndex(item)"
                :status="item.status"
                :selected="item.selected"
                :wrong-count="item.wrongCount"
                :source="item.source"
                :paper-title="item.paper.title"
                :attempt-date="item.attempt.startedAt"
                :attempt-mode="item.attempt.mode"
              />
            </div>

            <Pagination
              :current="currentPage"
              :total="totalPages"
              @update:current="currentPage = $event"
            />
          </template>
        </section>
      </div>
    </template>
  </PageLayout>
</template>
