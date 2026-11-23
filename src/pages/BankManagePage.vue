<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageLayout from '../components/ui/PageLayout.vue';
import type { Bank, BankMetaEntry } from '../types/bank';
import { clearBank, listBankMetas, loadBank } from '../utils/idb';

const bankMetas = ref<BankMetaEntry[]>([]);
const isLoading = ref(true);
const deletingId = ref<string | null>(null);
const exportingId = ref<string | null>(null);

const totalQuestions = computed(() =>
  bankMetas.value.reduce((sum, entry) => sum + (entry.meta.total ?? 0), 0),
);

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
  <PageLayout
    title="管理题库"
    :description="
      bankMetas.length
        ? `共 ${bankMetas.length} 个题库 · ${totalQuestions} 道题目`
        : '查看、导出或删除已导入的题库。'
    "
  >
    <template #header-actions>
      <UButton to="/import" icon="i-lucide-download" label="导入题库" size="sm" />
    </template>

    <div v-if="isLoading" class="grid gap-4 md:grid-cols-2">
      <USkeleton v-for="i in 4" :key="i" class="h-36 w-full rounded-xl" />
    </div>

    <UEmpty
      v-else-if="bankMetas.length === 0"
      icon="i-lucide-database"
      title="还没有导入过题库"
      description="支持 JSON、Excel、链接与云端导入，数据保存在本地浏览器。"
      variant="naked"
      class="rounded-xl border border-dashed border-default py-16"
    >
      <template #actions>
        <UButton to="/import" icon="i-lucide-download" label="去导入" />
      </template>
    </UEmpty>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <UCard
        v-for="entry in bankMetas"
        :key="entry.bankId"
        :ui="{ body: 'p-5' }"
        class="transition duration-200 hover:border-primary/40"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
          >
            <UIcon name="i-lucide-book-open" class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-medium text-highlighted">
              {{ entry.meta.name }}
            </p>
            <p class="mt-0.5 truncate text-sm text-muted">
              {{ entry.meta.course }}
            </p>
            <p class="mt-1 text-xs text-dimmed">
              {{ entry.meta.total ?? '?' }} 题 ·
              {{ entry.meta.author || '未知作者' }} ·
              {{ new Date(entry.importedAt).toLocaleString('zh-CN') }}
            </p>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-end gap-2">
          <UButton
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-lucide-download"
            :loading="exportingId === entry.bankId"
            label="导出"
            @click="handleExport(entry)"
          />
          <UButton
            size="sm"
            variant="ghost"
            color="error"
            icon="i-lucide-trash"
            :loading="deletingId === entry.bankId"
            label="删除"
            @click="handleDelete(entry)"
          />
        </div>
      </UCard>
    </div>
  </PageLayout>
</template>
