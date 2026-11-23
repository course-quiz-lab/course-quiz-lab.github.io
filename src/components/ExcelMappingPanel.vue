<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { QuestionItem } from '../types/bank';
import type {
  ColumnMapping,
  ExcelParseResult,
  ExcelSheetData,
} from '../types/excel';
import {
  autoDetectMapping,
  buildPreviewData,
  parseQuestionsWithMapping,
} from '../utils/excel';

const props = defineProps<{
  excelData: ExcelParseResult;
}>();

const emit = defineEmits<{
  parsed: [data: ReturnType<typeof buildPreviewData>];
  questions: [questions: QuestionItem[]];
  errors: [errors: string[]];
}>();

// ── State ───────────────────────────────────────────────

const selectedSheet = ref(props.excelData.sheetNames[0] ?? '');
const hasHeader = ref(true);
const typeCol = ref<number | null>(null);
const stemCol = ref(0);
const optionCols = ref<number[]>([]);
const answerCol = ref(0);
const analysisCol = ref<number | null>(null);
const difficultyCol = ref<number | null>(null);
const isParsing = ref(false);
const parseResult = ref<ReturnType<typeof buildPreviewData> | null>(null);
const parseErrors = ref<string[]>([]);

// ── Computed ────────────────────────────────────────────

const currentSheet = computed<ExcelSheetData>(() => {
  return (
    props.excelData.sheets[selectedSheet.value] ?? { headers: [], rows: [] }
  );
});

const displayHeaders = computed<string[]>(() => {
  if (hasHeader.value) return currentSheet.value.headers;
  return currentSheet.value.headers.map((_, i) => `列 ${i + 1}`);
});

const dataRows = computed<string[][]>(() => {
  return hasHeader.value
    ? currentSheet.value.rows
    : currentSheet.value.rows.length > 0
      ? currentSheet.value.rows
      : currentSheet.value.headers.length > 0
        ? [currentSheet.value.headers]
        : [];
});

const columnOptions = computed(() => {
  return displayHeaders.value.map((header, index) => ({
    value: index,
    label: `列 ${index + 1}${header ? '：' + header : ''}`,
  }));
});

const typeColumnOptions = computed(() => {
  return [{ value: null, label: '无（智能推断题型）' }, ...columnOptions.value];
});

const optionalColumnOptions = computed(() => {
  return [{ value: null, label: '无（不导入）' }, ...columnOptions.value];
});

const typeSelectItems = computed(() =>
  typeColumnOptions.value.map((o) => ({
    label: o.label,
    value: o.value === null ? 'none' : String(o.value),
  })),
);

const otherSelectItems = computed(() =>
  columnOptions.value.map((o) => ({
    label: o.label,
    value: String(o.value),
  })),
);

const optionalSelectItems = computed(() =>
  optionalColumnOptions.value.map((o) => ({
    label: o.label,
    value: o.value === null ? 'none' : String(o.value),
  })),
);

const previewRows = computed(() => dataRows.value.slice(0, 5));

const currentMapping = computed<ColumnMapping>(() => ({
  typeCol: typeCol.value,
  stemCol: stemCol.value,
  optionCols: [...optionCols.value],
  answerCol: answerCol.value,
  analysisCol: analysisCol.value,
  difficultyCol: difficultyCol.value,
  hasHeader: hasHeader.value,
}));

const sheetHasData = computed(() => dataRows.value.length > 0);

const sheetItems = computed(() =>
  props.excelData.sheetNames.map((name) => ({ label: name, value: name })),
);

// ── Watch sheet change ──────────────────────────────────

watch(selectedSheet, () => {
  runAutoDetect();
});

watch(hasHeader, () => {
  runAutoDetect();
});

// ── Actions ─────────────────────────────────────────────

function runAutoDetect() {
  const headers = hasHeader.value
    ? currentSheet.value.headers
    : currentSheet.value.headers.map((_, i) => `列 ${i + 1}`);
  const detected = autoDetectMapping(headers);
  typeCol.value = detected.typeCol ?? null;
  stemCol.value = detected.stemCol ?? 0;
  optionCols.value = [...(detected.optionCols ?? [])];
  answerCol.value = detected.answerCol ?? headers.length - 1;
  analysisCol.value = detected.analysisCol ?? null;
  difficultyCol.value = detected.difficultyCol ?? null;
  parseResult.value = null;
  parseErrors.value = [];
}

function toggleOptionCol(colIndex: number) {
  const idx = optionCols.value.indexOf(colIndex);
  if (idx >= 0) {
    optionCols.value = optionCols.value.filter((c) => c !== colIndex);
  } else {
    optionCols.value = [...optionCols.value, colIndex].sort((a, b) => a - b);
  }
  parseResult.value = null;
  parseErrors.value = [];
}

function isOptionSelected(colIndex: number): boolean {
  return optionCols.value.includes(colIndex);
}

function updateTypeCol(value: string) {
  typeCol.value = value === 'none' ? null : Number(value);
  parseResult.value = null;
}

function updateStemCol(value: string) {
  stemCol.value = Number(value);
  parseResult.value = null;
}

function updateAnswerCol(value: string) {
  answerCol.value = Number(value);
  parseResult.value = null;
}

function updateAnalysisCol(value: string) {
  analysisCol.value = value === 'none' ? null : Number(value);
  parseResult.value = null;
}

function updateDifficultyCol(value: string) {
  difficultyCol.value = value === 'none' ? null : Number(value);
  parseResult.value = null;
}

function handleParse() {
  isParsing.value = true;
  parseResult.value = null;
  parseErrors.value = [];

  try {
    const mapping = currentMapping.value;
    const { questions, errors, unsupportedRows } = parseQuestionsWithMapping(
      dataRows.value,
      mapping,
    );
    const preview = buildPreviewData(questions, errors, unsupportedRows);
    parseResult.value = preview;
    parseErrors.value = errors;
    emit('parsed', preview);
    emit('questions', questions);
    emit('errors', errors);
  } catch (err) {
    parseErrors.value = ['解析出错：' + (err as Error).message];
  } finally {
    isParsing.value = false;
  }
}

// Auto-run detect on mount
runAutoDetect();
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <!-- Sheet Selection -->
    <UFormField v-if="excelData.sheetNames.length > 1" label="选择工作表">
      <USelect v-model="selectedSheet" :items="sheetItems" class="w-full" />
    </UFormField>

    <!-- Header Toggle -->
    <UCheckbox v-model="hasHeader" label="首行为表头" />

    <!-- Column Mapping -->
    <div class="grid min-w-0 gap-3">
      <p class="text-sm font-medium text-highlighted">列映射配置</p>

      <!-- Type Column -->
      <div class="flex max-w-full items-center gap-2">
        <span class="w-12 shrink-0 text-xs text-muted">题型</span>
        <USelect
          :model-value="typeCol === null ? 'none' : String(typeCol)"
          :items="typeSelectItems"
          size="sm"
          class="min-w-0 max-w-full flex-1"
          @update:model-value="updateTypeCol"
        />
      </div>

      <!-- Stem Column -->
      <div class="flex max-w-full items-center gap-2">
        <span class="w-12 shrink-0 text-xs text-muted">题干</span>
        <USelect
          :model-value="String(stemCol)"
          :items="otherSelectItems"
          size="sm"
          class="min-w-0 max-w-full flex-1"
          @update:model-value="updateStemCol"
        />
      </div>

      <!-- Option Columns -->
      <div class="flex max-w-full items-start gap-2">
        <span class="w-12 shrink-0 pt-1 text-xs text-muted">选项</span>
        <div class="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <UButton
            v-for="opt in columnOptions"
            :key="opt.value"
            :variant="isOptionSelected(opt.value) ? 'solid' : 'outline'"
            :color="isOptionSelected(opt.value) ? 'primary' : 'neutral'"
            size="xs"
            class="max-w-full truncate"
            :title="opt.label"
            @click="toggleOptionCol(opt.value)"
          >
            {{ opt.label }}
          </UButton>
        </div>
      </div>

      <!-- Answer Column -->
      <div class="flex max-w-full items-center gap-2">
        <span class="w-12 shrink-0 text-xs text-muted">答案</span>
        <USelect
          :model-value="String(answerCol)"
          :items="otherSelectItems"
          size="sm"
          class="min-w-0 max-w-full flex-1"
          @update:model-value="updateAnswerCol"
        />
      </div>

      <!-- Analysis Column (optional) -->
      <div class="flex max-w-full items-center gap-2">
        <span class="w-12 shrink-0 text-xs text-muted">解析</span>
        <USelect
          :model-value="analysisCol === null ? 'none' : String(analysisCol)"
          :items="optionalSelectItems"
          size="sm"
          class="min-w-0 max-w-full flex-1"
          @update:model-value="updateAnalysisCol"
        />
      </div>

      <!-- Difficulty Column (optional) -->
      <div class="flex max-w-full items-center gap-2">
        <span class="w-12 shrink-0 text-xs text-muted">难度</span>
        <USelect
          :model-value="difficultyCol === null ? 'none' : String(difficultyCol)"
          :items="optionalSelectItems"
          size="sm"
          class="min-w-0 max-w-full flex-1"
          @update:model-value="updateDifficultyCol"
        />
      </div>

      <!-- Smart inference hint -->
      <div
        v-if="typeCol === null"
        class="flex items-start gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs leading-relaxed text-warning"
      >
        <UIcon name="i-lucide-wand-sparkles" class="mt-0.5 size-3 shrink-0" />
        智能推断：含分隔符→多选，对/错→判断，其余→单选
      </div>
    </div>

    <!-- Auto Detect Button -->
    <div class="flex gap-3">
      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        icon="i-lucide-wand-sparkles"
        label="自动检测"
        @click="runAutoDetect"
      />
    </div>

    <!-- Data Preview Table（保留原生 table：列由 Excel 动态决定，且表头需按映射高亮） -->
    <div v-if="dataRows.length > 0" class="min-w-0">
      <div
        class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted"
      >
        <UIcon name="i-lucide-table" class="size-3.5" />
        前 {{ Math.min(5, dataRows.length) }} / {{ dataRows.length }} 行
      </div>
      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full min-w-[500px] text-xs">
          <thead>
            <tr class="bg-elevated">
              <th class="w-8 px-2 py-1.5 text-left font-medium text-muted">
                #
              </th>
              <th
                v-for="(header, idx) in displayHeaders"
                :key="idx"
                class="min-w-[80px] px-2 py-1.5 text-left font-medium"
                :class="
                  idx === stemCol || idx === answerCol || isOptionSelected(idx)
                    ? 'text-primary'
                    : 'text-muted'
                "
                :title="header || `列 ${idx + 1}`"
              >
                <span v-if="idx === stemCol" class="mr-0.5">📝</span>
                <span
                  v-else-if="idx === answerCol"
                  class="mr-0.5 font-bold text-primary"
                  >✓</span
                >
                <span
                  v-else-if="isOptionSelected(idx)"
                  class="mr-0.5 text-primary"
                  >◯</span
                >
                {{ header || `列${idx + 1}` }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIdx) in previewRows"
              :key="rowIdx"
              class="border-t border-default"
              :class="{ 'bg-elevated/40': rowIdx % 2 === 0 }"
            >
              <td class="px-2 py-1.5 text-muted">{{ rowIdx + 1 }}</td>
              <td
                v-for="(cell, cellIdx) in displayHeaders.map(
                  (_, idx) => row[idx] ?? '',
                )"
                :key="cellIdx"
                class="min-w-[80px] px-2 py-1.5 leading-snug"
                :class="
                  cellIdx === stemCol ? 'font-medium text-highlighted' : ''
                "
              >
                {{ cell || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="rounded-lg border border-dashed border-default bg-elevated py-8 text-center text-sm text-muted"
    >
      该工作表没有数据
    </div>

    <!-- Parse Button -->
    <div class="flex justify-center gap-3 pt-2">
      <UButton
        :disabled="!sheetHasData || isParsing"
        :loading="isParsing"
        :label="isParsing ? '解析中…' : '解析并预览'"
        @click="handleParse"
      />
    </div>

    <!-- Parse Errors -->
    <UAlert
      v-if="parseErrors.length > 0"
      color="error"
      variant="soft"
      title="解析问题"
    >
      <template #description>
        <ul class="grid gap-1 text-xs">
          <li v-for="(item, index) in parseErrors" :key="index">{{ item }}</li>
        </ul>
      </template>
    </UAlert>

    <!-- Parse Result Preview -->
    <UCard
      v-if="parseResult"
      class="border-success/30 bg-success/5"
      :ui="{ body: 'p-4' }"
    >
      <p class="mb-2 text-sm font-semibold text-highlighted">解析结果</p>
      <div class="grid gap-2 text-sm">
        <div>
          成功解析：
          <span class="font-semibold text-primary">
            {{ parseResult.totalRows }} 题
          </span>
        </div>
        <div
          v-if="Object.keys(parseResult.typeBreakdown).length"
          class="flex flex-wrap gap-1.5"
        >
          <UBadge
            v-for="(count, type) in parseResult.typeBreakdown"
            :key="type"
            color="neutral"
            variant="soft"
            size="md"
          >
            {{
              {
                single: '单选',
                multiple: '多选',
                judge: '判断',
                indeterminate: '不定项',
              }[type] || type
            }}: {{ count }}
          </UBadge>
        </div>
        <div v-if="parseResult.unsupportedRows.length > 0">
          <UCollapsible>
            <template #default="{ open }">
              <UButton variant="link" color="warning" size="xs" class="px-0">
                {{ parseResult.unsupportedRows.length }} 行跳过（点击查看详情）
                <UIcon
                  :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-3.5"
                />
              </UButton>
            </template>
            <template #content>
              <ul class="mt-1 grid list-disc gap-0.5 pl-4 text-xs text-muted">
                <li
                  v-for="(msg, idx) in parseResult.unsupportedRows"
                  :key="idx"
                >
                  {{ msg }}
                </li>
              </ul>
            </template>
          </UCollapsible>
        </div>
      </div>
    </UCard>
  </div>
</template>
