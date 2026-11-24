<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { confirmDialog } from '../../composables/useConfirm';
import { useBankStore } from '../../stores/bank';
import { useImportStore, type DownloadQueueItem } from '../../stores/import';
import type { CloudBankEntry } from '../../types/quiz';
import { clearAttempt, loadAttempt } from '../../utils/idb';
import { validateBankSchema } from '../../utils/validation';

const router = useRouter();
const bankStore = useBankStore();
const importStore = useImportStore();

const queue = ref<DownloadQueueItem[]>([]);
const isProcessing = ref(false);
const isCancelled = ref(false);
const expandedErrors = ref<Set<string>>(new Set());

const abortController = new AbortController();

onMounted(() => {
  if (importStore.downloadQueue.length === 0) {
    router.replace('/import/cloud');
    return;
  }
  queue.value = importStore.downloadQueue.map((item) => ({ ...item }));
  importStore.resetDownloadQueue();
  startDownload();
});

const totalCount = computed(() => queue.value.length);
const doneCount = computed(
  () =>
    queue.value.filter((i) => i.status === 'success' || i.status === 'fail')
      .length,
);

async function startDownload() {
  isProcessing.value = true;
  for (let i = 0; i < queue.value.length; i++) {
    if (isCancelled.value) break;

    const item = queue.value[i];
    item.status = 'downloading';
    // Force reactivity by replacing the array item
    queue.value = [...queue.value];

    const ok = await downloadSingle(item.entry);
    if (isCancelled.value) break;
    item.status = ok ? 'success' : 'fail';
    queue.value = [...queue.value];
  }
  isProcessing.value = false;
}

async function cancelDownload() {
  const ok = await confirmDialog({
    title: '取消下载',
    description: '已完成的题库会保留，正在下载与排队中的任务将被中断。',
    confirmText: '取消下载',
    cancelText: '继续下载',
    color: 'warning',
  });
  if (!ok) return;

  isCancelled.value = true;
  abortController.abort('用户取消');
  // Mark remaining pending items as cancelled
  for (const item of queue.value) {
    if (item.status === 'pending') {
      item.status = 'cancelled';
    }
  }
  queue.value = [...queue.value];
  isProcessing.value = false;
}

async function downloadSingle(entry: CloudBankEntry): Promise<boolean> {
  try {
    const res = await fetch(entry.url, { signal: abortController.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const result = validateBankSchema(raw);
    if (result.errors.length > 0) {
      queue.value.find((i) => i.entry.url === entry.url)!.error =
        result.errors.join('\n');
      return false;
    }
    if (!result.bank) return false;
    result.bank.meta.importMethod = 'cloud';
    result.bank.meta.sourceUrl = entry.url;
    await bankStore.setBank(result.bank);
    if (bankStore.bankId) {
      const saved = await loadAttempt(bankStore.bankId);
      if (saved) {
        await clearAttempt(bankStore.bankId);
      }
    }
    return true;
  } catch (e) {
    queue.value.find((i) => i.entry.url === entry.url)!.status = 'fail';
    queue.value.find((i) => i.entry.url === entry.url)!.error =
      '下载失败：' + (e instanceof Error ? e.message : String(e));
    return false;
  }
}

function goBack() {
  const redirect = importStore.returnTo;
  if (redirect) {
    importStore.returnTo = null;
    router.push(redirect);
  } else {
    router.push('/import/cloud');
  }
}

function toggleError(url: string) {
  const next = new Set(expandedErrors.value);
  if (next.has(url)) next.delete(url);
  else next.add(url);
  expandedErrors.value = next;
}

function statusIcon(status: DownloadQueueItem['status']) {
  switch (status) {
    case 'pending':
      return { name: 'i-lucide-download', class: 'text-muted' };
    case 'downloading':
      return {
        name: 'i-lucide-loader-circle',
        class: 'animate-spin text-primary',
      };
    case 'success':
      return { name: 'i-lucide-check', class: 'text-success' };
    case 'cancelled':
      return { name: 'i-lucide-x', class: 'text-warning' };
    default:
      return { name: 'i-lucide-x', class: 'text-error' };
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-xl">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <span
            class="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white"
          >
            3
          </span>
          <h2 class="text-sm font-semibold text-highlighted">下载进度</h2>
        </div>
      </template>

      <div class="mb-4 space-y-2 rounded-lg bg-elevated p-4 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted">总任务数</span>
          <span class="font-medium text-highlighted">{{ totalCount }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">已完成</span>
          <span class="font-medium text-highlighted">
            {{ doneCount }} / {{ totalCount }}
          </span>
        </div>
        <UProgress
          :model-value="doneCount"
          :max="totalCount || 1"
          class="mt-2"
          size="sm"
        />
      </div>

      <div class="flex max-h-[400px] flex-col gap-2 overflow-y-auto pr-1">
        <div
          v-for="item in queue"
          :key="item.entry.url"
          class="flex items-start gap-3 rounded-lg border p-3 text-sm"
          :class="{
            'border-primary/30 bg-primary/5': item.status === 'downloading',
            'border-success/30 bg-success/5': item.status === 'success',
            'border-error/30 bg-error/5': item.status === 'fail',
            'border-warning/30 bg-warning/5': item.status === 'cancelled',
            'border-default': item.status === 'pending',
          }"
        >
          <UIcon
            :name="statusIcon(item.status).name"
            class="mt-0.5 size-4 shrink-0"
            :class="statusIcon(item.status).class"
          />

          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-highlighted">
              {{ item.entry.metadata.name }}
            </p>
            <p class="text-xs text-muted">
              {{ item.entry.metadata.course }}
            </p>
          </div>

          <button
            v-if="item.error"
            type="button"
            class="max-w-[200px] shrink-0 cursor-pointer select-none text-left text-xs"
            :class="[
              expandedErrors.has(item.entry.url) ? '' : 'truncate',
              item.status === 'cancelled' ? 'text-warning' : 'text-error',
            ]"
            :title="expandedErrors.has(item.entry.url) ? '' : item.error"
            @click="toggleError(item.entry.url)"
          >
            {{ item.error }}
          </button>
          <span
            v-else-if="item.status === 'cancelled'"
            class="shrink-0 text-xs text-warning"
          >
            已取消
          </span>
        </div>
      </div>

      <div class="mt-6 flex justify-center gap-3">
        <UButton
          :disabled="!isProcessing && isCancelled"
          icon="i-lucide-square"
          variant="outline"
          color="neutral"
          label="取消下载"
          @click="cancelDownload"
        />
        <UButton
          :disabled="isProcessing"
          icon="i-lucide-arrow-right"
          trailing
          label="下一步"
          @click="goBack"
        />
      </div>
    </UCard>
  </div>
</template>
