<script setup lang="ts">
import {
  mdiCheck,
  mdiDownload,
  mdiGithub,
  mdiMagnify,
  mdiRefresh,
  mdiSortVariant,
} from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../../components/ui/AppButton.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
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
  <div>
    <AppCard class="!p-4 sm:!p-5">
      <!-- Header -->
      <div class="flex items-center gap-2 mb-4">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
          >2</span
        >
        <h2 class="text-base max-sm:text-sm">云端题库</h2>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="py-12 text-center text-sm text-muted">
        加载中…
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="p-4 rounded-xl border border-[rgba(185,74,60,0.4)] bg-[rgba(185,74,60,0.08)] text-center"
      >
        <p class="text-sm text-danger">{{ error }}</p>
        <AppButton class="mt-3" @click="fetchCloudIndex">重试</AppButton>
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Toolbar -->
        <div
          class="flex flex-wrap items-center gap-3 pb-4 mb-4 border-b border-[color:var(--border)]"
        >
          <!-- Search -->
          <div class="relative flex-1 min-w-[180px] max-w-[320px]">
            <AppIcon
              :path="mdiMagnify"
              :size="16"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索题库名称、课程、作者…"
              class="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-[color:var(--border)] bg-surface outline-none transition-colors duration-150 focus:border-brand"
            />
          </div>

          <!-- Filter: unimported only -->
          <label
            class="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none shrink-0"
          >
            <input
              v-model="showUnimportedOnly"
              type="checkbox"
              class="accent-brand"
            />
            仅显示未导入
          </label>

          <!-- Sort buttons -->
          <div class="flex items-center gap-1">
            <span class="text-xs text-muted mr-1 flex items-center gap-0.5">
              <AppIcon :path="mdiSortVariant" :size="14" />
              排序
            </span>
            <button
              v-for="opt in [
                { key: 'name', label: '名称' },
                { key: 'course', label: '课程名称' },
                { key: 'total', label: '题数' },
              ] satisfies { key: SortKey; label: string }[]"
              :key="opt.key"
              class="px-2.5 py-1 text-xs rounded-md border border-[color:var(--border)] bg-surface cursor-pointer transition-colors duration-150 hover:border-brand"
              :class="{
                '!border-brand !bg-[rgba(47,111,107,0.08)] !text-brand':
                  sortKey === opt.key,
              }"
              @click="toggleSort(opt.key)"
            >
              {{ opt.label }}
              <span v-if="sortKey === opt.key" class="ml-0.5">
                {{ sortAsc ? '↑' : '↓' }}
              </span>
            </button>
          </div>

          <!-- Refresh -->
          <button
            class="inline-flex items-center gap-1 text-xs text-muted border border-[color:var(--border)] bg-surface rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors duration-150 hover:text-brand hover:border-brand ml-auto"
            @click="fetchCloudIndex"
            title="刷新列表（清除缓存）"
          >
            <AppIcon :path="mdiRefresh" :size="14" />
            <span>刷新</span>
          </button>
        </div>

        <!-- Batch actions -->
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <AppButton
            variant="inline"
            :icon-path="mdiCheck"
            :icon-size="14"
            @click="selectAllVisible"
          >
            全选本页
          </AppButton>
          <AppButton
            v-if="selected.size > 0"
            variant="inline"
            :icon-path="mdiDownload"
            :icon-size="14"
            @click="downloadSelected"
          >
            下载选中（{{ selected.size }}）
          </AppButton>
          <button
            v-if="selected.size > 0"
            class="text-xs text-muted hover:text-danger border-none bg-transparent cursor-pointer transition-colors"
            @click="clearSelection"
          >
            取消选择
          </button>
        </div>

        <!-- Summary -->
        <p class="text-xs text-muted mb-3">
          共 {{ filteredAndSorted.length }} 个云端题库
          <span v-if="filteredAndSorted.length !== banks.length">
            （已筛选）
          </span>
          <span class="ml-2"> 第 {{ currentPage }} / {{ totalPages }} 页 </span>
        </p>

        <!-- Card grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div
            v-for="entry in paginatedBanks"
            :key="entry.url"
            class="min-w-0 flex items-start gap-2.5 p-2.5 rounded-xl border border-[color:var(--border)] bg-surface-soft transition-all duration-150 select-none cursor-pointer"
            :class="{
              'border-brand': selected.has(entry.url),
            }"
            @click="toggleSelect(entry)"
          >
            <!-- Selected badge -->

            <!-- Card body -->
            <span class="flex-1 min-w-0">
              <span class="font-medium text-sm">
                {{ entry.metadata.name }}
              </span>
              <span class="block text-xs text-muted mt-0.5">
                {{ entry.metadata.course }}
              </span>
              <span class="block text-[11px] text-muted/70 mt-0.5">
                {{ totalQuestions(entry) }} 题 ·
                {{ entry.metadata.author || '未知作者' }}
              </span>
            </span>
            <button
              v-if="entry.metadata.sourceUrl"
              class="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[color:var(--border)] bg-surface text-muted cursor-pointer transition-colors duration-150 hover:text-brand hover:border-brand"
              :title="entry.metadata.sourceUrl"
              @click.stop="openGithub(entry.metadata.sourceUrl)"
            >
              <AppIcon :path="mdiGithub" :size="14" />
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <Pagination
          v-if="totalPages > 1"
          :current="currentPage"
          :total="totalPages"
          @update:current="currentPage = $event"
        />

        <!-- Empty -->
        <div
          v-if="paginatedBanks.length === 0"
          class="py-12 text-center text-sm text-muted"
        >
          没有匹配的题库
        </div>

        <!-- Updated time -->
        <div v-if="updatedAt" class="text-xs text-muted/40 text-center mt-6">
          索引最后构建于 {{ new Date(updatedAt).toLocaleString('zh-CN') }}
        </div>
      </template>
    </AppCard>
  </div>
</template>
