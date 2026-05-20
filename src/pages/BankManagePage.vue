<script setup lang="ts">
import { mdiDeleteOutline, mdiFileDownloadOutline } from '@mdi/js';
import { onMounted, ref } from 'vue';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import type { Bank, BankMetaEntry } from '../types/quiz';
import { clearBank, listBankMetas, loadBank } from '../utils/idb';

const bankMetas = ref<BankMetaEntry[]>([]);
const isLoading = ref(true);
const deletingId = ref<string | null>(null);
const exportingId = ref<string | null>(null);

onMounted(async () => {
  bankMetas.value = await listBankMetas();
  isLoading.value = false;
});

async function handleDelete(entry: BankMetaEntry) {
  const name = entry.meta.course.name;
  const ok = confirm(`确定要删除题库「${name}」吗？此操作不可恢复。`);
  if (!ok) return;
  deletingId.value = entry.bankId;
  try {
    await clearBank(entry.bankId);
    bankMetas.value = bankMetas.value.filter((e) => e.bankId !== entry.bankId);
  } finally {
    deletingId.value = null;
  }
}

async function handleExport(entry: BankMetaEntry) {
  exportingId.value = entry.bankId;
  try {
    const bank: Bank | undefined = await loadBank(entry.bankId);
    if (!bank) return;
    const json = JSON.stringify(bank, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${entry.meta.course.code || 'bank'}-${entry.meta.course.name || 'export'}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } finally {
    exportingId.value = null;
  }
}
</script>

<template>
  <div class="page">
    <div class="flex items-center gap-3 mb-6">
      <h1 class="text-3xl max-sm:text-2xl m-0">管理题库</h1>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-muted text-sm">加载中…</div>

    <!-- Empty state -->
    <div
      v-else-if="!bankMetas.length"
      class="text-center py-16 bg-surface rounded-2xl border border-[color:var(--border)]"
    >
      <p class="text-muted mb-4">还没有导入过题库</p>
      <AppButton :to="'/import'">去导入</AppButton>
    </div>

    <!-- Bank list -->
    <div v-else class="flex flex-col gap-4">
      <div class="text-sm text-muted mb-1">
        共 {{ bankMetas.length }} 个题库
      </div>
      <AppCard
        v-for="entry in bankMetas"
        :key="entry.bankId"
        class="!p-5 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start"
      >
        <div class="min-w-0 flex-1">
          <div class="font-medium text-base">
            {{ entry.meta.course.name }}
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mt-1">
            <code>{{ entry.meta.course.code }}</code>
            <span>{{ entry.meta.total ?? '?' }} 题</span>
            <span>{{ entry.meta.author || '未知作者' }}</span>
            <span>{{
              new Date(entry.importedAt).toLocaleString('zh-CN')
            }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <AppButton
            variant="ghost"
            :icon-path="mdiFileDownloadOutline"
            :icon-size="16"
            :disabled="exportingId === entry.bankId"
            @click="handleExport(entry)"
          >
            {{ exportingId === entry.bankId ? '导出中…' : '导出' }}
          </AppButton>
          <AppButton
            variant="ghost"
            :icon-path="mdiDeleteOutline"
            :icon-size="16"
            class="!text-danger"
            :disabled="deletingId === entry.bankId"
            @click="handleDelete(entry)"
          >
            {{ deletingId === entry.bankId ? '删除中…' : '删除' }}
          </AppButton>
        </div>
      </AppCard>
    </div>
  </div>
</template>
