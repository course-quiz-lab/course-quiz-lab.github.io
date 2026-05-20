<script setup lang="ts">
import {
  mdiArrowLeft,
  mdiCheckCircleOutline,
  mdiCloudOutline,
  mdiFileDocumentOutline,
  mdiLinkVariant,
  mdiMicrosoftExcel,
  mdiMicrosoftWord,
} from '@mdi/js';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { useBankStore } from '../stores/bank';
import type { Bank } from '../types/quiz';
import { clearAttempt, loadAttempt } from '../utils/idb';
import { validateBankSchema } from '../utils/validation';

const bankStore = useBankStore();
const router = useRouter();

type ImportMethod = 'upload' | 'link' | 'cloud' | 'xlsx' | 'word';

interface MethodItem {
  id: ImportMethod;
  label: string;
  icon: string;
  disabled: boolean;
  description: string;
}

const methods: MethodItem[] = [
  {
    id: 'upload',
    label: '上传 JSON',
    icon: mdiFileDocumentOutline,
    disabled: false,
    description: '从本地选择 JSON 格式的题库文件',
  },
  {
    id: 'link',
    label: '链接导入',
    icon: mdiLinkVariant,
    disabled: false,
    description: '通过可公开访问的链接导入 JSON 题库',
  },
  {
    id: 'cloud',
    label: '云端题库',
    icon: mdiCloudOutline,
    disabled: true,
    description: '预留：从云端拉取题库索引并下载',
  },
  {
    id: 'word',
    label: '导入 Word',
    icon: mdiMicrosoftWord,
    disabled: true,
    description: '预留：后续支持解析 Word 题库',
  },
  {
    id: 'xlsx',
    label: '导入 XLSX',
    icon: mdiMicrosoftExcel,
    disabled: true,
    description: '预留：后续支持解析 Excel 题库',
  },
];

const currentStep = ref(1);
const selectedMethod = ref<ImportMethod>('upload');
const importUrl = ref('');
const fileName = ref('');
const isLoading = ref(false);
const errors = ref<string[]>([]);
const warning = ref<string | null>(null);
const preview = ref<Bank | null>(null);

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

function goToBanks() {
  router.push('/banks');
}

const canProceed = computed(() => {
  if (selectedMethod.value === 'upload') return !!preview.value;
  if (selectedMethod.value === 'link') return !!preview.value;
  return false;
});
</script>

<template>
  <div class="page max-w-[600px] mx-auto px-4">
    <!-- Step Indicator (3 steps, clickable) -->
    <div class="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
      <button
        class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm border-none bg-transparent transition-opacity"
        :class="[
          currentStep === 1 ? 'text-brand font-semibold' : 'text-muted',
          currentStep > 1
            ? 'cursor-pointer hover:opacity-70'
            : 'cursor-default',
        ]"
        @click="goToStep(1)"
      >
        <span
          class="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs font-bold"
          :class="currentStep === 1 ? 'bg-brand text-white' : 'bg-surface-soft'"
        >
          1
        </span>
        <span>选择方式</span>
      </button>
      <div class="flex-1 h-px bg-[color:var(--border)]" />
      <button
        class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm border-none bg-transparent transition-opacity"
        :class="[
          currentStep === 2 ? 'text-brand font-semibold' : 'text-muted',
          currentStep > 2
            ? 'cursor-pointer hover:opacity-70'
            : 'cursor-default',
        ]"
        @click="goToStep(2)"
      >
        <span
          class="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs font-bold"
          :class="currentStep === 2 ? 'bg-brand text-white' : 'bg-surface-soft'"
        >
          2
        </span>
        <span>输入内容</span>
      </button>
      <div class="flex-1 h-px bg-[color:var(--border)]" />
      <button
        class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm border-none bg-transparent transition-opacity"
        :class="[
          currentStep === 3 ? 'text-brand font-semibold' : 'text-muted',
          currentStep > 3
            ? 'cursor-pointer hover:opacity-70'
            : 'cursor-default',
        ]"
        @click="goToStep(3)"
      >
        <span
          class="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs font-bold"
          :class="currentStep === 3 ? 'bg-brand text-white' : 'bg-surface-soft'"
        >
          3
        </span>
        <span>预览与确认</span>
      </button>
    </div>

    <!-- Step 1: Method Selection -->
    <AppCard v-if="currentStep === 1" class="max-sm:p-4">
      <div class="flex items-center gap-3 mb-4">
        <span
          class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand text-white text-sm font-bold shrink-0"
        >
          1
        </span>
        <h2 class="text-xl max-sm:text-base">选择导入方式</h2>
      </div>

      <div class="grid gap-3">
        <button
          v-for="method in methods"
          :key="method.id"
          class="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl border border-[color:var(--border)] bg-surface-soft text-left cursor-pointer transition-all duration-150 hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed"
          :class="{
            '!border-brand !bg-[rgba(47,133,90,0.06)]':
              selectedMethod === method.id && !method.disabled,
          }"
          :disabled="method.disabled"
          @click="!method.disabled && (selectMethod(method.id), goToStep2())"
        >
          <span
            class="shrink-0 w-9 h-9 max-sm:w-8 max-sm:h-8 flex items-center justify-center rounded-lg bg-surface"
          >
            <AppIcon :path="method.icon" :size="20" />
          </span>
          <span class="flex-1">
            <span class="block font-medium text-sm">{{ method.label }}</span>
            <span class="block text-xs text-muted mt-0.5">
              {{ method.description }}
            </span>
          </span>
          <span
            v-if="method.disabled"
            class="text-xs text-muted bg-surface-soft px-2 py-0.5 rounded-full whitespace-nowrap"
          >
            即将支持
          </span>
        </button>
      </div>
    </AppCard>

    <!-- Step 2: Input content (upload / link) -->
    <AppCard v-if="currentStep === 2" class="max-sm:p-4">
      <div class="flex items-center gap-3 mb-4">
        <span
          class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand text-white text-sm font-bold shrink-0"
        >
          2
        </span>
        <h2 class="text-xl max-sm:text-base">输入题库内容</h2>
      </div>

      <!-- Upload method -->
      <div v-if="selectedMethod === 'upload'">
        <div
          class="p-5 rounded-xl border border-dashed border-[color:var(--border)] bg-surface-soft"
        >
          <div class="flex flex-col items-center gap-3 text-center">
            <AppIcon
              :path="mdiFileDocumentOutline"
              :size="36"
              class="text-muted"
            />
            <div>
              <p class="text-sm font-medium mb-1">选择 JSON 文件</p>
              <p class="text-xs text-muted">支持 JSON 格式的题库文件</p>
            </div>
            <input
              type="file"
              accept="application/json"
              @change="handleFileChange"
              class="text-sm file:mr-3 file:py-2 file:px-5 file:rounded-lg file:border-0 file:text-sm file:bg-brand file:text-white file:cursor-pointer"
            />
            <span v-if="isLoading" class="text-sm text-muted">解析中…</span>
            <span v-else-if="fileName" class="text-sm text-muted">
              {{ fileName }}
            </span>
          </div>
        </div>
        <details class="mt-4 px-3">
          <summary class="cursor-pointer text-sm text-muted">格式说明</summary>
          <pre
            class="mt-3 bg-[color:var(--surface-code)] rounded-xl p-4 font-['Cascadia_Mono','Courier_New',monospace] text-xs overflow-x-auto"
          >
{
  "metadata": {
    "course": { "code": "MATH101", "name": "高等数学" },
    "author": "张三",
    "source": "期中题库",
    "publishedAt": "2026-05-20T08:00:00Z"
  },
  "questions": [
    {
      "id": "q-1",
      "type": "single",
      "stem": "题干…",
      "options": ["选项A", "选项B", "选项C"],
      "answer": 0
    },
    {
      "id": "q-2",
      "type": "multiple",
      "stem": "题干…",
      "options": ["选项A", "选项B", "选项C"],
      "answer": [0, 2]
    },
    { "id": "q-3", "type": "judge", "stem": "题干…", "answer": true }
  ]
}
          </pre>
        </details>
      </div>

      <!-- Link method -->
      <div v-if="selectedMethod === 'link'" class="grid gap-3">
        <div
          class="p-5 rounded-xl border border-[color:var(--border)] bg-surface-soft"
        >
          <div class="flex flex-col items-center gap-3 text-center">
            <AppIcon :path="mdiLinkVariant" :size="36" class="text-muted" />
            <div>
              <p class="text-sm font-medium mb-1">粘贴题库链接</p>
              <p class="text-xs text-muted">
                链接需可直接访问 JSON 文件内容，支持 CORS
              </p>
            </div>
            <input
              v-model="importUrl"
              type="url"
              placeholder="https://example.com/questions.json"
              class="w-full max-w-[400px] px-3 py-2 rounded-lg border border-[color:var(--border)] bg-surface text-sm"
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

      <!-- Errors on step 2 -->
      <div
        v-if="errors.length"
        class="mt-4 p-4 rounded-xl border border-[rgba(185,74,60,0.4)] bg-[rgba(185,74,60,0.08)]"
      >
        <div class="font-semibold mb-2">校验失败</div>
        <ul class="text-sm">
          <li v-for="(item, index) in errors" :key="index">{{ item }}</li>
        </ul>
      </div>
    </AppCard>

    <!-- Step 3: Preview & Confirm -->
    <AppCard v-if="currentStep === 3 && preview" class="max-sm:p-4">
      <div class="flex items-center gap-3 mb-4">
        <span
          class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand text-white text-sm font-bold shrink-0"
        >
          3
        </span>
        <h2 class="text-xl max-sm:text-base">确认题库</h2>
      </div>

      <!-- Warning -->
      <div
        v-if="warning"
        class="mb-4 p-4 rounded-xl border border-[rgba(199,125,26,0.4)] bg-[rgba(199,125,26,0.08)] text-sm"
      >
        <span class="font-semibold">提醒：</span>{{ warning }}
      </div>

      <!-- Preview card -->
      <div
        class="p-6 rounded-xl border border-[rgba(47,133,90,0.3)] bg-[rgba(47,133,90,0.06)] grid gap-2"
      >
        <div class="text-lg">
          {{ preview.meta.course.name }}
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span
            ><code>{{ preview.meta.course.code }}</code></span
          >
          <span>作者：{{ preview.meta.author || '未标注' }}</span>
          <span>题量：{{ preview.questions.length }} 题</span>
          <span v-if="preview.meta.source"
            >来源：{{ preview.meta.source }}</span
          >
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
