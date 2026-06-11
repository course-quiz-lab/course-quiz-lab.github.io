<script setup lang="ts">
import { mdiCheck, mdiClose, mdiDownload, mdiLoading, mdiStop } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../../components/ui/AppButton.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
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

function cancelDownload() {
  if (!confirm('确定取消下载？')) return;
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
</script>

<template>
  <div class="max-w-[576px] mx-auto">
    <AppCard class="!p-4 sm:!p-5">
      <div class="flex items-center gap-2 mb-4">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
        >
          3
        </span>
        <h2 class="text-base max-sm:text-sm">下载进度</h2>
      </div>

      <!-- Progress summary -->
      <div class="bg-surface-soft rounded-xl p-4 mb-4 grid gap-2 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted">总任务数</span>
          <span class="font-semibold">{{ totalCount }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">已完成</span>
          <span class="font-semibold">{{ doneCount }} / {{ totalCount }}</span>
        </div>
        <div class="w-full h-2 bg-surface rounded-full overflow-hidden mt-3">
          <div
            class="h-full bg-brand rounded-full transition-all duration-300"
            :style="{
              width:
                totalCount > 0 ? (doneCount / totalCount) * 100 + '%' : '0%',
            }"
          />
        </div>
      </div>

      <!-- Download list -->
      <div class="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
        <div
          v-for="item in queue"
          :key="item.entry.url"
          class="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--border)] text-sm"
          :class="{
            'border-brand/30 bg-brand/5': item.status === 'downloading',
            'border-ok/30 bg-ok/5': item.status === 'success',
            'border-danger/30 bg-danger/5': item.status === 'fail',
            'border-[rgba(226,181,109,0.8)] bg-[rgba(226,181,109,0.18)]':
              item.status === 'cancelled',
          }"
        >
          <!-- Status icon -->
          <span class="shrink-0 w-5 h-5 flex items-center justify-center">
            <AppIcon
              v-if="item.status === 'pending'"
              :path="mdiDownload"
              :size="16"
              class="text-muted"
            />
            <AppIcon
              v-else-if="item.status === 'downloading'"
              :path="mdiLoading"
              :size="16"
              class="text-brand animate-spin"
            />
            <AppIcon
              v-else-if="item.status === 'success'"
              :path="mdiCheck"
              :size="16"
              class="text-ok"
            />
            <AppIcon
              v-else-if="item.status === 'cancelled'"
              :path="mdiClose"
              :size="16"
              class="text-warn"
            />
            <AppIcon v-else :path="mdiClose" :size="16" class="text-danger" />
          </span>

          <!-- Info -->
          <span class="flex-1 min-w-0">
            <span class="block truncate font-medium">
              {{ item.entry.metadata.name }}
            </span>
            <span class="block text-xs text-muted">
              {{ item.entry.metadata.course }}
            </span>
          </span>

          <!-- Error (click to expand) -->
          <span
            v-if="item.error"
            class="text-xs shrink-0 max-w-[200px] cursor-pointer select-none"
            :class="[
              expandedErrors.has(item.entry.url) ? '' : 'truncate',
              item.status === 'cancelled' ? 'text-warn' : 'text-danger',
            ]"
            @click="toggleError(item.entry.url)"
            :title="expandedErrors.has(item.entry.url) ? '' : item.error"
          >
            {{ item.error }}
          </span>
          <span
            v-else-if="item.status === 'cancelled'"
            class="text-xs text-warn shrink-0"
          >
            已取消
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 justify-center mt-6">
        <AppButton
          :disabled="!isProcessing && isCancelled"
          :icon-path="mdiStop"
          :icon-size="18"
          variant="secondary"
          @click="cancelDownload"
        >
          取消下载
        </AppButton>
        <AppButton variant="solid" @click="goBack" :disabled="isProcessing">
          下一步
        </AppButton>
      </div>
    </AppCard>
  </div>
</template>
