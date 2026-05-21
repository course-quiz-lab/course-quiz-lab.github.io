<script setup lang="ts">
import {
  mdiCheckCircleOutline,
  mdiFileDocumentOutline,
  mdiLinkVariant,
  mdiMicrosoftExcel,
} from '@mdi/js';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ExcelMappingPanel from '../components/ExcelMappingPanel.vue';
import type { ImportMethod } from '../components/ImportMethodSelect.vue';
import ImportMethodSelect from '../components/ImportMethodSelect.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { useBankStore } from '../stores/bank';
import type { Bank, ExcelParseResult, QuestionItem } from '../types/quiz';
import { buildPreviewData, readExcelFile } from '../utils/excel';
import { clearAttempt, loadAttempt } from '../utils/idb';
import { validateBankSchema } from '../utils/validation';

const bankStore = useBankStore();
const router = useRouter();

const currentStep = ref(1);
const selectedMethod = ref<ImportMethod>('upload');
const importUrl = ref('');
const fileName = ref('');
const isLoading = ref(false);
const errors = ref<string[]>([]);
const warning = ref<string | null>(null);
const preview = ref<Bank | null>(null);

const excelData = ref<ExcelParseResult | null>(null);
const excelQuestions = ref<QuestionItem[]>([]);
const unsupportedRows = ref<string[]>([]);

function resetState() {
  errors.value = [];
  warning.value = null;
  preview.value = null;
  fileName.value = '';
  isLoading.value = false;
}

function selectMethod(method: ImportMethod) {
  selectedMethod.value = method;
  resetState();
}

function goToStep2() {
  currentStep.value = 2;
}

function goToStep3() {
  currentStep.value = 3;
}

function goToStep(step: number) {
  if (step < 1 || step > 3) return;
  if (step === currentStep.value) return;
  // Allow going back to completed steps without resetting
  if (step < currentStep.value) {
    currentStep.value = step;
  }
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  isLoading.value = true;
  errors.value = [];
  warning.value = null;
  preview.value = null;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const result = validateBankSchema(parsed);
    errors.value = result.errors;
    warning.value = result.warning ?? null;
    preview.value = result.bank ?? null;
    if (!errors.value.length) {
      goToStep3();
    }
  } catch {
    errors.value = ['文件解析失败，请确认是有效的 JSON 格式。'];
  } finally {
    isLoading.value = false;
  }
}

async function handleExcelFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  isLoading.value = true;
  errors.value = [];
  excelData.value = null;
  excelQuestions.value = [];
  unsupportedRows.value = [];
  preview.value = null;

  try {
    const result = await readExcelFile(file);
    excelData.value = result;
  } catch (err) {
    errors.value = [(err as Error).message];
  } finally {
    isLoading.value = false;
  }
}

function handleExcelParsed(result: ReturnType<typeof buildPreviewData>) {
  errors.value = result.errors;
  unsupportedRows.value = result.unsupportedRows;
}

function handleExcelQuestions(questions: QuestionItem[]) {
  excelQuestions.value = questions;
}

function confirmExcelPreview() {
  if (excelQuestions.value.length === 0) return;

  // Generate a bank name from the file name
  const bankName =
    fileName.value.replace(/\.(xlsx|xls)$/i, '').trim() || 'Excel 导入';

  const bank: Bank = {
    meta: {
      course: {
        code: bankName,
        name: bankName,
      },
      author: 'Excel 导入',
      source: fileName.value,
      total: excelQuestions.value.length,
    },
    questions: excelQuestions.value,
  };

  preview.value = bank;
  if (unsupportedRows.value.length > 0) {
    warning.value = `${unsupportedRows.value.length} 行因格式问题已跳过`;
  }
  goToStep3();
}

async function importFromUrl() {
  if (!importUrl.value.trim()) return;
  isLoading.value = true;
  errors.value = [];
  warning.value = null;
  preview.value = null;

  try {
    const response = await fetch(importUrl.value.trim());
    if (!response.ok) {
      throw new Error('FETCH_FAILED');
    }
    const text = await response.text();
    const parsed = JSON.parse(text);
    const result = validateBankSchema(parsed);
    errors.value = result.errors;
    warning.value = result.warning ?? null;
    preview.value = result.bank ?? null;
    if (!errors.value.length) {
      goToStep3();
    }
  } catch {
    errors.value = ['链接解析失败，请确认链接可访问且为有效 JSON。'];
  } finally {
    isLoading.value = false;
  }
}

async function confirmImport() {
  if (!preview.value) return;
  await bankStore.setBank(preview.value, warning.value ?? undefined);
  // Clear saved attempt if it belongs to the same bank being re-imported
  if (bankStore.bankId) {
    const saved = await loadAttempt();
    if (saved?.bankId === bankStore.bankId) {
      await clearAttempt();
    }
  }
  await router.push('/banks');
}

const canProceed = computed(() => {
  if (selectedMethod.value === 'upload') return !!preview.value;
  if (selectedMethod.value === 'link') return !!preview.value;
  if (selectedMethod.value === 'xlsx') return !!preview.value;
  return false;
});

// ── Excel Preview Helpers ───────────────────────────────

const typeLabels: Record<string, string> = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
  indeterminate: '不定项',
};

const typeBreakdown = computed(() => {
  if (!preview.value) return {};
  const breakdown: Record<string, number> = {};
  for (const q of preview.value.questions) {
    breakdown[q.type] = (breakdown[q.type] ?? 0) + 1;
  }
  return breakdown;
});

const sampleQuestions = computed(() => {
  if (!preview.value) return [];
  const seen = new Set<string>();
  const samples: QuestionItem[] = [];
  for (const q of preview.value.questions) {
    if (!seen.has(q.type)) {
      seen.add(q.type);
      samples.push(q);
    }
  }
  return samples;
});

function typePillClass(type: string): string {
  const map: Record<string, string> = {
    single: 'bg-[rgba(47,111,107,0.12)] text-[var(--brand)]',
    multiple: 'bg-[rgba(226,181,109,0.2)] text-[var(--accent)]',
    judge: 'bg-[rgba(47,133,90,0.12)] text-[var(--ok)]',
    indeterminate: 'bg-[rgba(185,74,60,0.1)] text-[var(--danger)]',
  };
  return map[type] || 'bg-surface-soft text-muted';
}
</script>

<template>
  <div class="max-w-[600px] mx-auto px-4 flex flex-col gap-4 sm:gap-5">
    <div
      class="flex items-center gap-1.5 sm:gap-2 mb-5 sm:mb-6 text-xs sm:text-sm"
    >
      <button
        class="flex items-center gap-1 border-none bg-transparent transition-opacity"
        :class="[
          currentStep === 1 ? 'text-brand font-semibold' : 'text-muted',
          currentStep > 1
            ? 'cursor-pointer hover:opacity-70'
            : 'cursor-default',
        ]"
        @click="goToStep(1)"
      >
        <span
          class="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[9px] sm:text-[11px] font-bold"
          :class="currentStep === 1 ? 'bg-brand text-white' : 'bg-surface-soft'"
        >
          1
        </span>
        <span class="hidden sm:inline">选择方式</span>
      </button>
      <div class="flex-1 h-px bg-[color:var(--border)]" />
      <button
        class="flex items-center gap-1 border-none bg-transparent transition-opacity"
        :class="[
          currentStep === 2 ? 'text-brand font-semibold' : 'text-muted',
          currentStep > 2
            ? 'cursor-pointer hover:opacity-70'
            : 'cursor-default',
        ]"
        @click="goToStep(2)"
      >
        <span
          class="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[9px] sm:text-[11px] font-bold"
          :class="currentStep === 2 ? 'bg-brand text-white' : 'bg-surface-soft'"
        >
          2
        </span>
        <span class="hidden sm:inline">输入内容</span>
      </button>
      <div class="flex-1 h-px bg-[color:var(--border)]" />
      <button
        class="flex items-center gap-1 border-none bg-transparent transition-opacity"
        :class="[
          currentStep === 3 ? 'text-brand font-semibold' : 'text-muted',
          currentStep > 3
            ? 'cursor-pointer hover:opacity-70'
            : 'cursor-default',
        ]"
        @click="goToStep(3)"
      >
        <span
          class="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[9px] sm:text-[11px] font-bold"
          :class="currentStep === 3 ? 'bg-brand text-white' : 'bg-surface-soft'"
        >
          3
        </span>
        <span class="hidden sm:inline">预览与确认</span>
      </button>
    </div>

    <!-- Step 1: Method Selection -->
    <AppCard v-if="currentStep === 1" class="max-sm:p-3">
      <div class="flex items-center gap-2 mb-3">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
          >1</span
        >
        <h2 class="text-base max-sm:text-sm">选择导入方式</h2>
      </div>
      <ImportMethodSelect
        @select="
          selectMethod($event);
          goToStep2();
        "
      />
    </AppCard>

    <!-- Step 2: Input content (upload / link / xlsx) -->
    <AppCard v-if="currentStep === 2" class="!p-4 sm:!p-5 overflow-hidden">
      <div class="flex items-center gap-2 mb-3">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
          >2</span
        >
        <h2 class="text-base max-sm:text-sm">输入题库内容</h2>
      </div>

      <!-- Upload method -->
      <div v-if="selectedMethod === 'upload'">
        <div
          class="p-4 rounded-xl border border-dashed border-[color:var(--border)] bg-surface-soft"
        >
          <div class="flex flex-col items-center gap-2 text-center">
            <AppIcon
              :path="mdiFileDocumentOutline"
              :size="28"
              class="text-muted"
            />
            <div>
              <p class="text-sm font-medium">选择 JSON 文件</p>
              <p class="text-xs text-muted mt-0.5">支持 JSON 格式的题库文件</p>
            </div>
            <input
              type="file"
              accept="application/json"
              @change="handleFileChange"
              class="text-xs file:mr-2 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:bg-brand file:text-white file:cursor-pointer"
            />
            <span v-if="isLoading" class="text-xs text-muted">解析中…</span>
            <span v-else-if="fileName" class="text-xs text-muted">{{
              fileName
            }}</span>
          </div>
        </div>
        <details class="mt-3 px-2">
          <summary class="cursor-pointer text-xs text-muted">格式说明</summary>
          <pre
            class="mt-2 bg-[color:var(--surface-code)] rounded-xl p-3 font-['Cascadia_Mono','Courier_New',monospace] text-[10px] overflow-x-auto leading-relaxed"
          >
{
  "metadata": {
    "course": { "code": "MATH101", "name": "高等数学" },
    "author": "张三"
  },
  "questions": [
    { "type": "single", "stem": "题干…",
      "options": ["A","B","C"], "answer": 0 },
    { "type": "multiple", "stem": "题干…",
      "options": ["A","B","C"], "answer": [0,2] },
    { "type": "judge", "stem": "题干…", "answer": true }
  ]
}</pre
          >
        </details>
      </div>

      <!-- Link method -->
      <div v-if="selectedMethod === 'link'">
        <div
          class="p-4 rounded-xl border border-[color:var(--border)] bg-surface-soft"
        >
          <div class="flex flex-col items-center gap-2 text-center">
            <AppIcon :path="mdiLinkVariant" :size="28" class="text-muted" />
            <div>
              <p class="text-sm font-medium">粘贴题库链接</p>
              <p class="text-xs text-muted mt-0.5">
                链接需可直接访问 JSON 文件，支持 CORS
              </p>
            </div>
            <input
              v-model="importUrl"
              type="url"
              placeholder="https://example.com/questions.json"
              class="w-full max-w-[360px] px-3 py-1.5 rounded-lg border border-[color:var(--border)] bg-surface text-xs"
            />
            <AppButton
              :disabled="!importUrl.trim() || isLoading"
              @click="importFromUrl"
            >
              {{ isLoading ? '解析中…' : '解析链接' }}
            </AppButton>
          </div>
        </div>
      </div>

      <!-- XLSX method -->
      <div v-if="selectedMethod === 'xlsx'">
        <!-- Upload -->
        <div
          v-if="!excelData"
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
              class="text-xs file:mr-2 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:bg-brand file:text-white file:cursor-pointer"
            />
            <span v-if="isLoading" class="text-xs text-muted">解析中…</span>
            <span v-else-if="fileName" class="text-xs text-muted">{{
              fileName
            }}</span>
          </div>
        </div>

        <!-- Excel Mapping Panel -->
        <div v-else-if="excelData" class="grid gap-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted truncate flex-1 min-w-0 mr-2">{{
              fileName
            }}</span>
            <button
              class="shrink-0 text-xs text-muted border-none bg-transparent cursor-pointer hover:text-brand"
              @click="
                excelData = null;
                excelQuestions = [];
                unsupportedRows = [];
                preview = null;
              "
            >
              重新选择
            </button>
          </div>
          <ExcelMappingPanel
            :excel-data="excelData"
            @parsed="handleExcelParsed"
            @questions="handleExcelQuestions"
          />
          <div v-if="excelQuestions.length > 0" class="flex justify-center">
            <AppButton
              :icon-path="mdiCheckCircleOutline"
              :icon-size="16"
              @click="confirmExcelPreview"
            >
              确认预览（{{ excelQuestions.length }} 题）
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Errors on step 2 -->
      <div
        v-if="errors.length"
        class="mt-3 p-3 rounded-xl border border-[rgba(185,74,60,0.4)] bg-[rgba(185,74,60,0.08)]"
      >
        <div class="font-semibold text-xs mb-1">校验失败</div>
        <ul class="text-xs text-muted grid gap-0.5">
          <li v-for="(item, index) in errors" :key="index">{{ item }}</li>
        </ul>
      </div>
    </AppCard>

    <!-- Step 3: Preview & Confirm -->
    <AppCard v-if="currentStep === 3 && preview" class="max-sm:p-3">
      <div class="flex items-center gap-2 mb-3">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
          >3</span
        >
        <h2 class="text-base max-sm:text-sm">确认题库</h2>
      </div>

      <!-- Warning -->
      <div
        v-if="warning"
        class="mb-3 p-3 rounded-xl border border-[rgba(199,125,26,0.4)] bg-[rgba(199,125,26,0.08)] text-xs"
      >
        <span class="font-semibold">提醒：</span>{{ warning }}
      </div>

      <!-- Preview card -->
      <div
        class="p-4 rounded-xl border border-[rgba(47,133,90,0.3)] bg-[rgba(47,133,90,0.06)] grid gap-1.5"
      >
        <div class="text-base font-medium">
          {{ preview.meta.course.name }}
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
          <code>{{ preview.meta.course.code }}</code>
          <span>{{ preview.meta.author || '未标注' }}</span>
          <span>{{ preview.questions.length }} 题</span>
          <span v-if="preview.meta.source">{{ preview.meta.source }}</span>
        </div>
      </div>

      <!-- Type Breakdown -->
      <div
        v-if="selectedMethod === 'xlsx'"
        class="mt-3 p-3 rounded-xl border border-[color:var(--border)] bg-surface-soft"
      >
        <div class="text-xs font-medium mb-1.5 text-muted">题型分布</div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(count, type) in typeBreakdown"
            :key="type"
            class="text-[11px] bg-surface px-2 py-0.5 rounded-full"
          >
            {{ typeLabels[type as keyof typeof typeLabels] || type }}:
            {{ count }}
          </span>
        </div>
      </div>

      <!-- Unsupported rows info -->
      <div
        v-if="unsupportedRows.length > 0"
        class="mt-3 p-3 rounded-xl border border-[rgba(199,125,26,0.4)] bg-[rgba(199,125,26,0.08)] text-xs"
      >
        <details>
          <summary class="cursor-pointer font-medium text-[var(--warn)]">
            {{ unsupportedRows.length }} 行已跳过
          </summary>
          <ul class="mt-1.5 text-xs text-muted list-disc pl-4 grid gap-0.5">
            <li v-for="(msg, idx) in unsupportedRows" :key="idx">
              {{ msg }}
            </li>
          </ul>
        </details>
      </div>

      <!-- Sample Questions per Type -->
      <div v-if="sampleQuestions.length > 0" class="mt-4">
        <div class="text-xs font-medium text-muted mb-2">
          样题预览（每种题型展示第 1 题）
        </div>
        <div class="grid gap-2">
          <div
            v-for="sq in sampleQuestions"
            :key="sq.id"
            class="p-3 rounded-xl border border-[color:var(--border)] bg-surface-soft grid gap-1.5"
          >
            <div class="flex items-start gap-2">
              <span
                class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none mt-0.5"
                :class="typePillClass(sq.type)"
              >
                {{ typeLabels[sq.type] || sq.type }}
              </span>
              <span class="text-xs leading-relaxed min-w-0 line-clamp-3">{{
                sq.stem
              }}</span>
            </div>
            <div v-if="sq.options.length > 0" class="grid gap-0.5 pl-1">
              <div
                v-for="opt in sq.options"
                :key="opt.id"
                class="flex items-center gap-1.5 text-[11px] text-muted"
              >
                <span
                  class="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[9px] font-medium shrink-0"
                  :class="
                    sq.answer.includes(opt.id)
                      ? 'bg-brand text-white'
                      : 'bg-surface text-muted'
                  "
                >
                  {{ opt.id }}
                </span>
                <span class="truncate">{{ opt.text }}</span>
              </div>
            </div>
            <div class="text-[11px] text-muted">
              答案：
              <span class="text-brand font-medium">
                {{ sq.answer.join('、') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-3 justify-center">
        <AppButton
          :disabled="!canProceed"
          :icon-path="mdiCheckCircleOutline"
          :icon-size="18"
          @click="confirmImport"
        >
          导入并使用
        </AppButton>
      </div>
    </AppCard>
  </div>
</template>
