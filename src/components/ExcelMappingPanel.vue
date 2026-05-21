<script setup lang="ts">
import { mdiAutoFix, mdiTable } from '@mdi/js';
import { computed, ref, watch } from 'vue';
import type {
  ColumnMapping,
  ExcelParseResult,
  ExcelSheetData,
  QuestionItem,
} from '../types/quiz';
import {
  autoDetectMapping,
  buildPreviewData,
  parseQuestionsWithMapping,
} from '../utils/excel';
import AppButton from './ui/AppButton.vue';
import AppCheckbox from './ui/AppCheckbox.vue';
import AppIcon from './ui/AppIcon.vue';

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
const mappingChanged = ref(false);

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
  mappingChanged.value = true;
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
  mappingChanged.value = true;
}

function isOptionSelected(colIndex: number): boolean {
  return optionCols.value.includes(colIndex);
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
  <div class="grid gap-4 min-w-0">
    <!-- Sheet Selection -->
    <div v-if="excelData.sheetNames.length > 1" class="min-w-0">
      <label class="block text-sm font-medium mb-1.5">选择工作表</label>
      <select
        v-model="selectedSheet"
        class="w-full min-w-0 px-3 py-2 rounded-lg border border-[color:var(--border)] bg-surface text-sm"
      >
        <option v-for="name in excelData.sheetNames" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
    </div>

    <!-- Header Toggle -->
    <AppCheckbox v-model="hasHeader"> 首行为表头 </AppCheckbox>

    <!-- Column Mapping -->
    <div class="grid gap-2.5 min-w-0">
      <label class="text-sm font-medium">列映射配置</label>

      <!-- Type Column -->
      <div class="flex items-center gap-2 max-w-full">
        <span class="text-sm text-muted shrink-0 w-12">题型</span>
        <select
          :value="typeCol"
          @input="
            typeCol =
              $event.target.value === '' ? null : Number($event.target.value);
            parseResult = null;
          "
          class="flex-1 min-w-0 max-w-full px-2.5 py-2 rounded-lg border border-[color:var(--border)] bg-surface text-sm"
        >
          <option
            v-for="opt in typeColumnOptions"
            :key="opt.value"
            :value="opt.value ?? ''"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Stem Column -->
      <div class="flex items-center gap-2 max-w-full">
        <span class="text-sm text-muted shrink-0 w-12">题干</span>
        <select
          :value="stemCol"
          @input="
            stemCol = Number($event.target.value);
            parseResult = null;
          "
          class="flex-1 min-w-0 max-w-full px-2.5 py-2 rounded-lg border border-[color:var(--border)] bg-surface text-sm"
        >
          <option
            v-for="opt in columnOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Option Columns -->
      <div class="flex items-start gap-2 max-w-full">
        <span class="text-sm text-muted shrink-0 w-12 pt-2">选项</span>
        <div class="flex-1 min-w-0 flex flex-wrap gap-1.5">
          <button
            v-for="opt in columnOptions"
            :key="opt.value"
            class="px-2 py-1 text-[11px] leading-tight rounded-md border cursor-pointer transition-all duration-150 truncate shrink-0"
            :class="
              isOptionSelected(opt.value)
                ? 'border-brand bg-brand text-white'
                : 'border-[color:var(--border)] bg-surface-soft text-muted hover:border-brand'
            "
            :title="opt.label"
            @click="toggleOptionCol(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Answer Column -->
      <div class="flex items-center gap-2 max-w-full">
        <span class="text-sm text-muted shrink-0 w-12">答案</span>
        <select
          :value="answerCol"
          @input="
            answerCol = Number($event.target.value);
            parseResult = null;
          "
          class="flex-1 min-w-0 max-w-full px-2.5 py-2 rounded-lg border border-[color:var(--border)] bg-surface text-sm"
        >
          <option
            v-for="opt in columnOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Analysis Column (optional) -->
      <div class="flex items-center gap-2 max-w-full">
        <span class="text-sm text-muted shrink-0 w-12">解析</span>
        <select
          :value="analysisCol"
          @input="
            analysisCol =
              $event.target.value === '' ? null : Number($event.target.value);
            parseResult = null;
          "
          class="flex-1 min-w-0 max-w-full px-2.5 py-2 rounded-lg border border-[color:var(--border)] bg-surface text-sm"
        >
          <option
            v-for="opt in optionalColumnOptions"
            :key="opt.value"
            :value="opt.value ?? ''"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Difficulty Column (optional) -->
      <div class="flex items-center gap-2 max-w-full">
        <span class="text-sm text-muted shrink-0 w-12">难度</span>
        <select
          :value="difficultyCol"
          @input="
            difficultyCol =
              $event.target.value === '' ? null : Number($event.target.value);
            parseResult = null;
          "
          class="flex-1 min-w-0 max-w-full px-2.5 py-2 rounded-lg border border-[color:var(--border)] bg-surface text-sm"
        >
          <option
            v-for="opt in optionalColumnOptions"
            :key="opt.value"
            :value="opt.value ?? ''"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Smart inference hint -->
      <div
        v-if="typeCol === null"
        class="text-[11px] leading-relaxed text-[var(--warn)] bg-[rgba(199,125,26,0.08)] rounded-lg px-2.5 py-1.5"
      >
        <AppIcon
          :path="mdiAutoFix"
          :size="12"
          class="inline mr-1 align-middle"
        />
        智能推断：含分隔符→多选，对/错→判断，其余→单选
      </div>
    </div>

    <!-- Auto Detect Button -->
    <div class="flex gap-3">
      <AppButton
        variant="ghost"
        :icon-path="mdiAutoFix"
        :icon-size="16"
        @click="runAutoDetect"
      >
        自动检测
      </AppButton>
    </div>

    <!-- Data Preview Table -->
    <div v-if="dataRows.length > 0" class="min-w-0">
      <div
        class="flex items-center gap-1.5 text-xs font-medium mb-1.5 text-muted"
      >
        <AppIcon :path="mdiTable" :size="14" />
        前 {{ Math.min(5, dataRows.length) }} / {{ dataRows.length }} 行
      </div>
      <div
        class="overflow-x-auto rounded-xl border border-[color:var(--border)]"
      >
        <table class="text-xs min-w-[500px] w-full">
          <thead>
            <tr class="bg-surface-soft">
              <th class="px-2 py-1.5 text-left font-medium text-muted w-8">
                #
              </th>
              <th
                v-for="(header, idx) in displayHeaders"
                :key="idx"
                class="px-2 py-1.5 text-left font-medium min-w-[80px]"
                :class="{
                  'text-brand':
                    idx === stemCol ||
                    idx === answerCol ||
                    isOptionSelected(idx),
                  'text-muted':
                    idx !== stemCol &&
                    idx !== answerCol &&
                    !isOptionSelected(idx),
                }"
                :title="header || `列 ${idx + 1}`"
              >
                <span v-if="idx === stemCol" class="mr-0.5">📝</span>
                <span
                  v-else-if="idx === answerCol"
                  class="mr-0.5 text-brand font-bold"
                  >✓</span
                >
                <span
                  v-else-if="isOptionSelected(idx)"
                  class="mr-0.5 text-brand"
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
              class="border-t border-[color:var(--border)]"
              :class="{ 'bg-[rgba(47,111,107,0.04)]': rowIdx % 2 === 0 }"
            >
              <td class="px-2 py-1.5 text-muted">{{ rowIdx + 1 }}</td>
              <td
                v-for="(cell, cellIdx) in displayHeaders.map(
                  (_, idx) => row[idx] ?? '',
                )"
                :key="cellIdx"
                class="px-2 py-1.5 leading-snug min-w-[80px]"
                :class="{ 'font-medium': cellIdx === stemCol }"
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
      class="text-center py-8 text-sm text-muted bg-surface-soft rounded-xl border border-dashed border-[color:var(--border)]"
    >
      该工作表没有数据
    </div>

    <!-- Parse Button -->
    <div class="flex gap-3 justify-center pt-2">
      <AppButton :disabled="!sheetHasData || isParsing" @click="handleParse">
        {{ isParsing ? '解析中…' : '解析并预览' }}
      </AppButton>
    </div>

    <!-- Parse Errors -->
    <div
      v-if="parseErrors.length > 0"
      class="p-4 rounded-xl border border-[rgba(185,74,60,0.4)] bg-[rgba(185,74,60,0.08)]"
    >
      <div class="font-semibold text-sm mb-2">解析问题</div>
      <ul class="text-xs text-muted">
        <li v-for="(item, index) in parseErrors" :key="index">{{ item }}</li>
      </ul>
    </div>

    <!-- Parse Result Preview -->
    <div
      v-if="parseResult"
      class="p-4 rounded-xl border border-[rgba(47,133,90,0.3)] bg-[rgba(47,133,90,0.06)]"
    >
      <div class="font-semibold text-sm mb-2">解析结果</div>
      <div class="grid gap-1 text-sm">
        <div>
          成功解析：
          <span class="font-semibold text-brand"
            >{{ parseResult.totalRows }} 题</span
          >
        </div>
        <div
          v-if="Object.keys(parseResult.typeBreakdown).length"
          class="flex flex-wrap gap-x-4 gap-y-1"
        >
          <span
            v-for="(count, type) in parseResult.typeBreakdown"
            :key="type"
            class="text-xs bg-surface-soft px-2 py-0.5 rounded-full"
          >
            {{
              {
                single: '单选',
                multiple: '多选',
                judge: '判断',
                indeterminate: '不定项',
              }[type] || type
            }}: {{ count }}
          </span>
        </div>
        <div v-if="parseResult.unsupportedRows.length > 0" class="mt-2">
          <details>
            <summary class="text-xs text-[var(--warn)] cursor-pointer">
              {{ parseResult.unsupportedRows.length }} 行跳过（点击查看详情）
            </summary>
            <ul class="mt-1 text-xs text-muted list-disc pl-4">
              <li v-for="(msg, idx) in parseResult.unsupportedRows" :key="idx">
                {{ msg }}
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>
