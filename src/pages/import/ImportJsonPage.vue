<script setup lang="ts">
import { mdiFileDocumentOutline } from '@mdi/js';
import { useRouter } from 'vue-router';
import AppCard from '../../components/ui/AppCard.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
import { useImportStore } from '../../stores/import';
import { validateBankSchema } from '../../utils/validation';

const router = useRouter();
const importStore = useImportStore();

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importStore.fileName = file.name;
  importStore.isLoading = true;
  importStore.errors = [];
  importStore.warning = null;
  importStore.preview = null;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const result = validateBankSchema(parsed);
    importStore.errors = result.errors;
    importStore.warning = result.warning ?? null;
    importStore.preview = result.bank ?? null;
    if (!importStore.errors.length) {
      router.push('/import/preview');
    }
  } catch {
    importStore.errors = ['文件解析失败，请确认是有效的 JSON 格式。'];
  } finally {
    importStore.isLoading = false;
  }
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
        <h2 class="text-base max-sm:text-sm">上传 JSON 文件</h2>
      </div>

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

      <details class="mt-3 px-2">
        <summary class="cursor-pointer text-xs text-muted">格式说明</summary>
        <pre
          class="mt-2 bg-[color:var(--surface-code)] rounded-xl p-3 font-['Cascadia_Mono','Courier_New',monospace] text-[10px] overflow-x-auto leading-relaxed"
        >
{
  "metadata": {
    "name": "高等数学习题集",
    "course": "高等数学",
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
