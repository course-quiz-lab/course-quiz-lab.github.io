<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBankStore } from '../stores/bank';
import { useAttemptStore } from '../stores/attempt';
import { validateBankSchema } from '../utils/validation';
import { clearAttempt } from '../utils/idb';
import type { Bank, Mode } from '../types/quiz';
import { mdiPlayCircleOutline } from '@mdi/js';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';

const bankStore = useBankStore();
const attemptStore = useAttemptStore();
const router = useRouter();

const bankMeta = computed(() => bankStore.bank?.meta);
const lastMode = computed(() => attemptStore.attempt?.mode);

type ImportMethod = 'link' | 'upload' | 'cloud' | 'xlsx';

const importMethods: Array<{ id: ImportMethod; label: string }> = [
  { id: 'upload', label: '上传 JSON' },
  { id: 'link', label: '链接导入' },
  { id: 'cloud', label: '现有题库' },
  { id: 'xlsx', label: '导入 XLSX' },
];

const errors = ref<string[]>([]);
const warning = ref<string | null>(null);
const preview = ref<Bank | null>(null);
const fileName = ref('');
const isLoading = ref(false);
const selectedMode = ref<Mode>('practice');
const importMethod = ref<ImportMethod>('upload');
const importUrl = ref('');
const shuffleQuestions = ref(false);
const shuffleOptions = ref(false);

function resetImportState() {
  errors.value = [];
  warning.value = null;
  preview.value = null;
  fileName.value = '';
  isLoading.value = false;
}

function selectImportMethod(method: ImportMethod) {
  importMethod.value = method;
  resetImportState();
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
  } catch (error) {
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
  } catch (error) {
    errors.value = ['链接解析失败，请确认链接可访问且为有效 JSON。'];
  } finally {
    isLoading.value = false;
  }
}

async function confirmImport() {
  // TODO: multi-bank merge extension point.
  if (!preview.value) return;
  await bankStore.setBank(preview.value, warning.value ?? undefined);
  // 清除该题库已有的作答记录，避免重新导入后旧进度残留
  if (bankStore.bankId) {
    await clearAttempt(bankStore.bankId, 'practice');
    await clearAttempt(bankStore.bankId, 'exam');
  }
  attemptStore.attempt = null;
  attemptStore._pendingShuffleQuestions = shuffleQuestions.value;
  attemptStore._pendingShuffleOptions = shuffleOptions.value;
  await router.push(`/${selectedMode.value}`);
}
</script>

<template>
  <div class="page">
    <section
      class="grid grid-cols-2 gap-[26px] bg-surface rounded-[18px] p-8 max-lg:grid-cols-1 max-sm:p-4"
    >
      <div>
        <h1
          class="font-['Noto_Serif_SC','Source_Han_Serif_SC','Songti_SC','PingFang_SC','Microsoft_YaHei',serif] text-[44px] my-3 max-sm:text-[32px]"
        >
          让刷题更清晰、更从容
        </h1>
        <p class="text-muted mb-[26px]">
          支持单选、多选、判断、不定项四种题型；练习与考试模式分离；可切换单题与整卷视图。
        </p>
        <div class="flex flex-wrap gap-[12px]">
          <AppButton
            v-if="bankStore.hasBank && lastMode"
            :to="`/${lastMode}`"
            variant="ghost"
          >
            继续{{ lastMode === 'practice' ? '练习' : '考试' }}
          </AppButton>
        </div>
      </div>
      <AppCard variant="hero" class="grid gap-[12px]">
        <div class="text-sm text-muted tracking-wide uppercase">当前题库</div>
        <div
          class="text-[22px] font-['Noto_Serif_SC','Source_Han_Serif_SC','Songti_SC','PingFang_SC','Microsoft_YaHei',serif]"
        >
          {{ bankMeta?.course?.name ?? '尚未导入' }}
        </div>
        <div class="flex gap-[12px] text-muted text-sm">
          <code>{{ bankMeta?.course?.code ?? '未标注课程代码' }}</code>
          <span>{{
            bankMeta?.author ? 'by ' + bankMeta?.author : '未标注作者'
          }}</span>
          <span>共 {{ bankMeta?.total ?? 0 }} 题</span>
        </div>
      </AppCard>
    </section>
    <AppCard id="import-section">
      <div class="text-sm text-muted tracking-wide uppercase">导入题库</div>
      <p class="text-muted text-sm mb-3">
        支持 JSON 与 XLSX 格式，单题库导入。题型仅限单选、多选、判断、不定项。
      </p>
      <div
        class="inline-flex flex-wrap gap-2 border border-[color:var(--border)] rounded-full p-1 mb-4"
      >
        <button
          v-for="method in importMethods"
          :key="method.id"
          class="border-none px-4 py-1.5 text-sm cursor-pointer bg-transparent text-muted transition-all duration-200 rounded-full"
          :class="{ '!bg-brand !text-white': importMethod === method.id }"
          @click="selectImportMethod(method.id)"
        >
          {{ method.label }}
        </button>
      </div>
      <div v-if="importMethod === 'link'" class="grid gap-3">
        <div
          class="flex flex-wrap items-center gap-[12px] p-4 rounded-xl border border-[color:var(--border)] bg-surface-soft"
        >
          <input
            v-model="importUrl"
            type="url"
            placeholder="粘贴 JSON 题库链接"
            class="flex-1 px-3 py-2 rounded-lg border border-[color:var(--border)] bg-surface"
          />
          <AppButton
            :disabled="!importUrl.trim() || isLoading"
            @click="importFromUrl"
          >
            解析链接
          </AppButton>
        </div>
        <div class="text-xs text-muted">链接需可直接访问 JSON 文件内容。</div>
      </div>
      <div
        v-if="importMethod === 'upload'"
        class="flex items-center gap-[12px] p-4 rounded-xl border border-dashed border-[color:var(--border)] bg-surface-soft text-sm"
      >
        <input
          type="file"
          accept="application/json"
          @change="handleFileChange"
          class="px-2 py-2"
        />
        <div class="flex gap-[12px] text-muted text-sm">
          <span>{{ fileName || '请选择题库文件' }}</span>
          <span v-if="isLoading">解析中…</span>
        </div>
      </div>
      <details
        v-if="importMethod === 'upload'"
        class="my-3 rounded-xl border border-[color:var(--border)] bg-surface-soft p-4"
      >
        <summary class="cursor-pointer text-sm text-muted">格式说明</summary>
        <pre
          class="mt-3 bg-surface-code rounded-xl p-4 font-['Cascadia_Mono','Courier_New',monospace] text-xs overflow-x-auto"
        >
{
  "metadata": {
    "course": {
      "code": "MATH101",
      "name": "高等数学",
      "link": "https://example.com/course/math101"
    },
    "author": "张三",
    "source": "期中题库",
    "publishedAt": "2026-05-20T08:00:00Z"
  },
  "questions": [
    {
      "id": "q-1",
      "type": "single",
      "stem": "题干...",
      "options": ["选项A", "选项B", "选项C"],
      "answer": 0,
      "analysis": "解析...",
      "difficulty": "中等"
    },
    {
      "id": "q-2",
      "type": "multiple",
      "stem": "题干...",
      "options": ["选项A", "选项B", "选项C"],
      "answer": [0, 2]
    },
    {
      "id": "q-3",
      "type": "judge",
      "stem": "题干...",
      "answer": true
    },
    {
      "id": "q-4",
      "type": "indeterminate",
      "stem": "题干...",
      "options": ["选项A", "选项B", "选项C"],
      "answer": [0, 1]
    }
  ]
}
        </pre>
        <p class="text-muted text-sm mt-2">
          选项使用数组；答案使用选项索引（从 0 开始）；多选/不定项 answer 为数组；
          判断题 answer 为 true/false。选项不超过 26 个时显示 A-Z，超过则显示数字。
        </p>
      </details>
      <div
        v-if="importMethod === 'cloud'"
        class="p-4 rounded-xl border border-[color:var(--border)] bg-surface-soft grid gap-2"
      >
        <div class="text-sm">即将支持云端题库</div>
        <div class="text-xs text-muted">
          预留：从云端拉取题库索引并下载对应文件。
        </div>
        <AppButton variant="ghost" :disabled="true">敬请期待</AppButton>
      </div>
      <div
        v-if="importMethod === 'xlsx'"
        class="p-4 rounded-xl border border-[color:var(--border)] bg-surface-soft grid gap-2"
      >
        <div class="text-sm">导入 XLSX 文档</div>
        <div class="text-xs text-muted">
          预留接口：后续支持解析 Excel 题库。
        </div>
        <AppButton variant="ghost" :disabled="true">等待接入</AppButton>
      </div>
      <div
        v-if="errors.length"
        class="my-6 p-4 rounded-xl border border-[rgba(185,74,60,0.4)] bg-[rgba(185,74,60,0.08)]"
      >
        <div class="font-semibold mb-3">校验失败</div>
        <ul>
          <li v-for="(item, index) in errors" :key="index">{{ item }}</li>
        </ul>
      </div>
      <div
        v-if="warning"
        class="my-6 p-4 rounded-xl border border-[rgba(199,125,26,0.4)] bg-[rgba(199,125,26,0.08)]"
      >
        <div class="font-semibold mb-3">性能提醒</div>
        <p>{{ warning }}</p>
      </div>
      <div
        v-if="preview"
        class="my-6 p-4 rounded-xl border border-[rgba(47,133,90,0.4)] bg-[rgba(47,133,90,0.08)]"
      >
        <div class="font-semibold mb-3">题库就绪</div>
        <p>
          题库：{{ preview.meta.course.name }} ·
          {{ preview.questions.length }} 题
        </p>
      </div>
      <div v-if="preview" class="mt-3">
        <div class="text-sm text-muted mb-[12px]">选择答题模式</div>
        <div
          class="inline-flex border border-[color:var(--border)] rounded-full overflow-hidden"
        >
          <button
            class="border-none px-5 py-2 text-sm cursor-pointer bg-transparent text-muted transition-all duration-200"
            :class="{ '!bg-brand !text-white': selectedMode === 'practice' }"
            @click="selectedMode = 'practice'"
          >
            练习模式
          </button>
          <button
            class="border-none px-5 py-2 text-sm cursor-pointer bg-transparent text-muted transition-all duration-200"
            :class="{ '!bg-brand !text-white': selectedMode === 'exam' }"
            @click="selectedMode = 'exam'"
          >
            考试模式
          </button>
        </div>
      </div>
      <div v-if="preview" class="mt-3 grid gap-[10px]">
        <label class="flex items-center gap-[10px] cursor-pointer text-sm">
          <input type="checkbox" v-model="shuffleQuestions" class="w-4 h-4" />
          <span>打乱题目顺序</span>
        </label>
        <label class="flex items-center gap-[10px] cursor-pointer text-sm">
          <input type="checkbox" v-model="shuffleOptions" class="w-4 h-4" />
          <span>打乱选项顺序</span>
        </label>
      </div>
      <AppButton
        :disabled="!preview"
        @click="confirmImport"
        class="mt-3"
        :icon-path="mdiPlayCircleOutline"
        :icon-size="18"
      >
        开始答题
      </AppButton>
    </AppCard>
  </div>
</template>
