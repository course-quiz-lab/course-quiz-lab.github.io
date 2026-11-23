<script setup lang="ts">
import { useRouter } from 'vue-router';
import ExcelMappingPanel from '../../components/ExcelMappingPanel.vue';
import { useImportStore } from '../../stores/import';
import type { Bank, QuestionItem } from '../../types/quiz';
import { buildPreviewData, readExcelFile } from '../../utils/excel';

const router = useRouter();
const importStore = useImportStore();

async function handleExcelFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importStore.fileName = file.name;
  importStore.isLoading = true;
  importStore.errors = [];
  importStore.excelData = null;
  importStore.excelQuestions = [];
  importStore.unsupportedRows = [];
  importStore.preview = null;

  try {
    const result = await readExcelFile(file);
    importStore.excelData = result;
  } catch (err) {
    importStore.errors = [(err as Error).message];
  } finally {
    importStore.isLoading = false;
  }
}

function handleExcelParsed(result: ReturnType<typeof buildPreviewData>) {
  importStore.errors = result.errors;
  importStore.unsupportedRows = result.unsupportedRows;
}

function handleExcelQuestions(questions: QuestionItem[]) {
  importStore.excelQuestions = questions;
}

function confirmExcelPreview() {
  if (importStore.excelQuestions.length === 0) return;

  const bankName =
    importStore.fileName.replace(/\.(xlsx|xls)$/i, '').trim() || 'Excel 导入';

  const bank: Bank = {
    meta: {
      name: bankName,
      course: bankName,
      author: 'Excel 导入',
      source: importStore.fileName,
      total: importStore.excelQuestions.length,
    },
    questions: importStore.excelQuestions,
  };

  importStore.preview = bank;
  if (importStore.unsupportedRows.length > 0) {
    importStore.warning = `${importStore.unsupportedRows.length} 行因格式问题已跳过`;
  }
  router.push('/import/preview');
}
</script>

<template>
  <div class="mx-auto w-full max-w-2xl">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <span
            class="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white"
          >
            2
          </span>
          <h2 class="text-sm font-semibold text-highlighted">
            导入 Excel 题库
          </h2>
        </div>
      </template>

      <!-- Upload -->
      <div
        v-if="!importStore.excelData"
        class="rounded-xl border border-dashed border-default bg-elevated px-4 py-8 text-center"
      >
        <UIcon
          name="i-lucide-file-spreadsheet"
          class="mx-auto size-8 text-muted"
        />
        <p class="mt-3 text-sm font-medium text-highlighted">选择 Excel 文件</p>
        <p class="mt-1 text-xs text-muted">支持 .xlsx 和 .xls 格式</p>

        <!-- 保留原生 file input：UFileUpload 会改变为拖拽/受控模型交互 -->
        <input
          type="file"
          accept=".xlsx,.xls"
          class="mt-4 w-full max-w-full cursor-pointer text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
          @change="handleExcelFileChange"
        />

        <p v-if="importStore.isLoading" class="mt-2 text-xs text-muted">
          解析中…
        </p>
        <p v-else-if="importStore.fileName" class="mt-2 text-xs text-muted">
          {{ importStore.fileName }}
        </p>
      </div>

      <!-- Excel Mapping Panel -->
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between gap-2">
          <span class="min-w-0 flex-1 truncate text-xs text-muted">
            {{ importStore.fileName }}
          </span>
          <UButton
            variant="link"
            color="neutral"
            size="xs"
            class="shrink-0 px-0 text-muted"
            label="重新选择"
            @click="
              importStore.excelData = null;
              importStore.excelQuestions = [];
              importStore.unsupportedRows = [];
              importStore.preview = null;
            "
          />
        </div>

        <ExcelMappingPanel
          :excel-data="importStore.excelData"
          @parsed="handleExcelParsed"
          @questions="handleExcelQuestions"
        />

        <div
          v-if="importStore.excelQuestions.length > 0"
          class="flex justify-center"
        >
          <UButton
            icon="i-lucide-circle-check"
            :label="`确认预览（${importStore.excelQuestions.length} 题）`"
            @click="confirmExcelPreview"
          />
        </div>
      </div>

      <UAlert
        v-if="importStore.errors.length"
        color="error"
        variant="soft"
        class="mt-4"
        title="校验失败"
      >
        <template #description>
          <ul class="grid gap-1 text-xs">
            <li v-for="(item, index) in importStore.errors" :key="index">
              {{ item }}
            </li>
          </ul>
        </template>
      </UAlert>
    </UCard>
  </div>
</template>
