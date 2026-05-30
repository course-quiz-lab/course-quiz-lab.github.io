<script setup lang="ts">
import { mdiCheckCircleOutline, mdiMicrosoftExcel } from '@mdi/js';
import { useRouter } from 'vue-router';
import ExcelMappingPanel from '../../components/ExcelMappingPanel.vue';
import AppButton from '../../components/ui/AppButton.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
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
  <div class="max-w-[576px] mx-auto">
    <AppCard class="!p-4 sm:!p-5 overflow-hidden">
      <div class="flex items-center gap-2 mb-3">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
          >2</span
        >
        <h2 class="text-base max-sm:text-sm">导入 Excel 题库</h2>
      </div>

      <!-- Upload -->
      <div
        v-if="!importStore.excelData"
        class="p-4 rounded-xl border border-dashed border-[color:var(--border)] bg-surface-soft"
      >
        <div class="flex flex-col items-center gap-2 text-center">
          <AppIcon :path="mdiMicrosoftExcel" :size="28" class="text-muted" />
          <div>
            <p class="text-sm font-medium">选择 Excel 文件</p>
            <p class="text-xs text-muted mt-0.5">支持 .xlsx 和 .xls 格式</p>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            @change="handleExcelFileChange"
            class="text-xs max-w-full file:mr-2 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:bg-brand file:text-white file:cursor-pointer"
          />
          <span v-if="importStore.isLoading" class="text-xs text-muted"
            >解析中…</span
          >
          <span v-else-if="importStore.fileName" class="text-xs text-muted">{{
            importStore.fileName
          }}</span>
        </div>
      </div>

      <!-- Excel Mapping Panel -->
      <div v-else-if="importStore.excelData" class="grid gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted truncate flex-1 min-w-0 mr-2">{{
            importStore.fileName
          }}</span>
          <button
            class="shrink-0 text-xs text-muted border-none bg-transparent cursor-pointer hover:text-brand"
            @click="
              importStore.excelData = null;
              importStore.excelQuestions = [];
              importStore.unsupportedRows = [];
              importStore.preview = null;
            "
          >
            重新选择
          </button>
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
          <AppButton
            :icon-path="mdiCheckCircleOutline"
            :icon-size="16"
            @click="confirmExcelPreview"
            class="max-sm:text-[13px] max-sm:px-3 max-sm:py-2"
          >
            确认预览（{{ importStore.excelQuestions.length }} 题）
          </AppButton>
        </div>
      </div>

      <!-- Errors -->
      <div
        v-if="importStore.errors.length"
        class="mt-3 p-3 rounded-xl border border-[rgba(185,74,60,0.4)] bg-[rgba(185,74,60,0.08)]"
      >
        <div class="font-semibold text-xs mb-1">校验失败</div>
        <ul class="text-xs text-muted grid gap-0.5">
          <li v-for="(item, index) in importStore.errors" :key="index">
            {{ item }}
          </li>
        </ul>
      </div>
    </AppCard>
  </div>
</template>
