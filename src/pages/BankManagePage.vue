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
  const name = entry.meta.name || entry.meta.course;
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

const EXPORT_SCHEMA_URL =
  'https://course-quiz-lab.github.io/json-schema/v1/bank.schema.json';

/** 字母标签 → 数字索引: A→0, B→1, ... */
function labelToIndex(label: string): number {
  return label.toUpperCase().charCodeAt(0) - 65;
}

/**
 * 将内部 Bank 格式转换为符合 schema 的导出格式。
 * 转换要点：
 *  - meta → metadata
 *  - options: {id,text,index}[] → string[]
 *  - answer: 字母标签数组 → 数字索引 / 布尔值
 */
function toSchemaFormat(bank: Bank) {
  const { meta, questions, ...rest } = bank;
  // 排除仅内部使用的字段：id（题库标识）、total（导入时会自动重新计算）
  const { id: _id, total: _total, ...metadata } = meta;
  return {
    ...rest,
    metadata,
    questions: questions.map((q) => {
      const base: Record<string, unknown> = {
        type: q.type,
        stem: q.stem,
        analysis: q.analysis,
        difficulty: q.difficulty,
      };

      // options: 对象数组 → 字符串数组（判断题不输出此字段）
      if (q.type !== 'judge') {
        base.options = q.options.map((o) => o.text);
      }

      // answer: 字母标签 → schema 格式
      if (q.type === 'judge') {
        base.answer = q.answer.includes('T');
      } else if (q.type === 'single') {
        const idx = q.answer.length > 0 ? labelToIndex(q.answer[0]) : 0;
        base.answer = idx;
      } else {
        // multiple / indeterminate
        base.answer = q.answer.map((label) => labelToIndex(label));
      }

      return base;
    }),
  };
}

async function handleExport(entry: BankMetaEntry) {
  exportingId.value = entry.bankId;
  try {
    const bank: Bank | undefined = await loadBank(entry.bankId);
    if (!bank) return;
    const exportData = {
      ...toSchemaFormat(bank),
      $schema: EXPORT_SCHEMA_URL,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${entry.meta.course || 'bank'}.json`;
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
            {{ entry.meta.name }}
          </div>
          <div class="block text-sm text-muted mt-0.5">
            {{ entry.meta.course }}
          </div>
          <div class="block text-[13px] text-muted/70 mt-0.5">
            {{ entry.meta.total ?? '?' }} 题 ·
            {{ entry.meta.author || '未知作者' }} ·
            {{ new Date(entry.importedAt).toLocaleString('zh-CN') }}
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
