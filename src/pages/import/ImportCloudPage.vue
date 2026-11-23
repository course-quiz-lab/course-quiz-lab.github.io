<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Pagination from '../../components/ui/Pagination.vue';
import { useImportStore } from '../../stores/import';
import type { CloudBankEntry, CloudBankIndex } from '../../types/quiz';
import { listBankMetas, loadBank } from '../../utils/idb';

const CLOUD_INDEX_URL = 'https://course-quiz-lab.github.io/store/index.json';
const PAGE_SIZE = 20;

type SortKey = 'name' | 'course' | 'total';

const router = useRouter();
const importStore = useImportStore();

const banks = ref<CloudBankEntry[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const updatedAt = ref<string | null>(null);

// Selection for batch download
const selected = ref<Set<string>>(new Set());

// Filter: only show unimported banks
const showUnimportedOnly = ref(false);
const importedUrls = ref<Set<string>>(new Set());

// Search & sort
const searchQuery = ref('');
const sortKey = ref<SortKey>('name');
const sortAsc = ref(true);

// Pagination
const currentPage = ref(1);

onMounted(async () => {
  await fetchCloudIndex();
  // Load imported sourceUrls for filtering
  const metas = await listBankMetas();
  for (const m of metas) {
    const bank = await loadBank(m.bankId);
    if (bank?.meta.sourceUrl) importedUrls.value.add(bank.meta.sourceUrl);
  }
});

// Reset to page 1 when search or sort changes
watch([searchQuery, sortKey, sortAsc], () => {
  currentPage.value = 1;
});

async function fetchCloudIndex() {
  isLoading.value = true;
  error.value = null;
  try {
    const ts = Date.now();
    const res = await fetch(`${CLOUD_INDEX_URL}?time=${ts}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CloudBankIndex = await res.json();
    banks.value = data.banks;
    updatedAt.value = data.updatedAt ?? null;
  } catch {
    error.value = '云端题库加载失败，请检查网络连接后重试。';
  } finally {
    isLoading.value = false;
  }
}

function totalQuestions(entry: CloudBankEntry): number {
  return (
    entry.count.single +
    entry.count.multiple +
    entry.count.judge +
    entry.count.indeterminate
  );
}

const filteredAndSorted = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  let result = banks.value;

  if (q) {
    result = result.filter(
      (b) =>
        b.metadata.name.toLowerCase().includes(q) ||
        b.metadata.course.toLowerCase().includes(q) ||
        (b.metadata.author || '').toLowerCase().includes(q),
    );
  }

  if (showUnimportedOnly.value) {
    result = result.filter((b) => !importedUrls.value.has(b.url));
  }

  const sorted = [...result];
  const key = sortKey.value;
  sorted.sort((a, b) => {
    let cmp: number;
    if (key === 'name') {
      cmp = a.metadata.name.localeCompare(b.metadata.name, 'zh-CN');
    } else if (key === 'course') {
      cmp = a.metadata.course.localeCompare(b.metadata.course, 'zh-CN');
    } else {
      cmp = totalQuestions(a) - totalQuestions(b);
    }
    return sortAsc.value ? cmp : -cmp;
  });

  return sorted;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAndSorted.value.length / PAGE_SIZE)),
);

const paginatedBanks = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredAndSorted.value.slice(start, start + PAGE_SIZE);
});

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = key !== 'total';
  }
}

function openGithub(url: string) {
  window.open(url, '_blank');
}

function toggleSelect(entry: CloudBankEntry) {
  const next = new Set(selected.value);
  if (next.has(entry.url)) next.delete(entry.url);
  else next.add(entry.url);
  selected.value = next;
}

function selectAllVisible() {
  selected.value = new Set(paginatedBanks.value.map((e) => e.url));
}

function clearSelection() {
  selected.value = new Set();
}

function startDownload(entries: CloudBankEntry[]) {
  importStore.downloadQueue = entries.map((entry) => ({
    entry,
    status: 'pending' as const,
  }));
  router.push('/import/cloud-progress');
}

async function downloadSelected() {
  if (selected.value.size === 0) return;
  if (
    selected.value.size >= 2 &&
    !confirm(`确认下载选中的 ${selected.value.size} 个题库？`)
  )
    return;

  const entries = banks.value.filter((e) => selected.value.has(e.url));
  selected.value = new Set();
  startDownload(entries);
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              class="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white"
            >
              2
            </span>
            <h2 class="text-sm font-semibold text-highlighted">云端题库</h2>
          </div>
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-refresh-cw"
            label="刷新"
            title="刷新列表（清除缓存）"
            @click="fetchCloudIndex"
          />
        </div>
      </template>

      <div v-if="isLoading" class="space-y-3">
        <USkeleton class="h-10 w-full rounded-lg" />
        <div class="grid gap-4 sm:grid-cols-2">
          <USkeleton v-for="i in 4" :key="i" class="h-24 w-full rounded-xl" />
        </div>
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-cloud-off"
        title="加载失败"
        :description="error"
      >
        <template #actions>
          <UButton
            color="error"
            variant="outline"
            size="sm"
            label="重试"
            @click="fetchCloudIndex"
          />
        </template>
      </UAlert>

      <template v-else>
        <!-- Toolbar -->
        <div
          class="flex flex-wrap items-center gap-3 border-b border-default pb-4"
        >
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="搜索题库名称、课程、作者…"
            class="min-w-[180px] max-w-xs flex-1"
          />

          <UCheckbox v-model="showUnimportedOnly" label="仅显示未导入" />

          <div class="flex items-center gap-1">
            <span class="mr-1 flex items-center gap-0.5 text-xs text-muted">
              <UIcon name="i-lucide-arrow-up-down" class="size-3.5" />
              排序
            </span>
            <UButton
              v-for="opt in [
                { key: 'name', label: '名称' },
                { key: 'course', label: '课程' },
                { key: 'total', label: '题数' },
              ] satisfies { key: SortKey; label: string }[]"
              :key="opt.key"
              size="xs"
              :variant="sortKey === opt.key ? 'soft' : 'ghost'"
              :color="sortKey === opt.key ? 'primary' : 'neutral'"
              @click="toggleSort(opt.key)"
            >
              {{ opt.label }}
              <UIcon
                v-if="sortKey === opt.key"
                :name="sortAsc ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                class="ml-0.5 size-3"
              />
            </UButton>
          </div>
        </div>

        <!-- Batch actions -->
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-check-check"
            label="全选本页"
            @click="selectAllVisible"
          />
          <UButton
            v-if="selected.size > 0"
            size="xs"
            icon="i-lucide-download"
            :label="`下载选中（${selected.size}）`"
            @click="downloadSelected"
          />
          <UButton
            v-if="selected.size > 0"
            variant="link"
            color="neutral"
            size="xs"
            class="px-0 text-muted"
            label="取消选择"
            @click="clearSelection"
          />
        </div>

        <p class="mt-3 text-xs text-muted">
          共 {{ filteredAndSorted.length }} 个云端题库
          <span v-if="filteredAndSorted.length !== banks.length"
            >（已筛选）</span
          >
          <span class="ml-2">第 {{ currentPage }} / {{ totalPages }} 页</span>
        </p>

        <!-- Card grid -->
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UCard
            v-for="entry in paginatedBanks"
            :key="entry.url"
            class="min-w-0 cursor-pointer select-none transition duration-150"
            :class="
              selected.has(entry.url)
                ? 'border-primary bg-primary/5'
                : 'hover:border-primary/40'
            "
            :ui="{ body: 'flex items-start gap-3 p-3.5' }"
            @click="toggleSelect(entry)"
          >
            <UIcon
              :name="
                selected.has(entry.url)
                  ? 'i-lucide-square-check-big'
                  : 'i-lucide-square'
              "
              class="mt-0.5 size-4 shrink-0"
              :class="selected.has(entry.url) ? 'text-primary' : 'text-dimmed'"
            />

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ entry.metadata.name }}
              </p>
              <p class="mt-0.5 truncate text-xs text-muted">
                {{ entry.metadata.course }}
              </p>
              <p class="mt-1 text-xs text-dimmed">
                {{ totalQuestions(entry) }} 题 ·
                {{ entry.metadata.author || '未知作者' }}
              </p>
            </div>

            <UButton
              v-if="entry.metadata.sourceUrl"
              variant="ghost"
              color="neutral"
              icon="i-lucide-github"
              size="xs"
              square
              class="shrink-0"
              :title="entry.metadata.sourceUrl"
              aria-label="打开来源链接"
              @click.stop="openGithub(entry.metadata.sourceUrl)"
            />
          </UCard>
        </div>

        <UEmpty
          v-if="paginatedBanks.length === 0"
          icon="i-lucide-search-x"
          title="没有匹配的题库"
          description="调整搜索或筛选条件试试。"
          variant="naked"
          class="py-10"
        />

        <Pagination
          v-if="totalPages > 1"
          :current="currentPage"
          :total="totalPages"
          @update:current="currentPage = $event"
        />

        <p v-if="updatedAt" class="mt-6 text-center text-xs text-dimmed">
          索引最后构建于 {{ new Date(updatedAt).toLocaleString('zh-CN') }}
        </p>
      </template>
    </UCard>
  </div>
</template>
