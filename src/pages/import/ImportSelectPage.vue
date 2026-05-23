<script setup lang="ts">
import {
  mdiCloudOutline,
  mdiFileDocumentOutline,
  mdiLinkVariant,
  mdiMicrosoftExcel,
  mdiMicrosoftWord,
} from '@mdi/js';
import { useRouter } from 'vue-router';
import type { ImportMethod } from '../../types/quiz';
import ImportStepIndicator from '../../components/import/ImportStepIndicator.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
import { useImportStore } from '../../stores/import';

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
    id: 'cloud',
    label: '云端题库',
    icon: mdiCloudOutline,
    disabled: false,
    description: '从云端拉取题库索引并下载导入',
  },
  {
    id: 'link',
    label: '链接导入',
    icon: mdiLinkVariant,
    disabled: false,
    description: '通过可公开访问的链接导入 JSON 题库',
  },
  {
    id: 'xlsx',
    label: '导入 XLSX',
    icon: mdiMicrosoftExcel,
    disabled: false,
    description: '从本地选择 Excel 格式的题库文件',
  },
  {
    id: 'word',
    label: '导入 Word',
    icon: mdiMicrosoftWord,
    disabled: true,
    description: '预留：后续支持解析 Word 题库',
  },
];

const router = useRouter();
const importStore = useImportStore();

function handleSelect(method: ImportMethod) {
  importStore.setMethod(method);
  importStore.reset();

  const routes: Record<ImportMethod, string | null> = {
    upload: '/import/json',
    link: '/import/fetch',
    xlsx: '/import/table',
    cloud: '/import/cloud',
    word: null,
  };

  const route = routes[method];
  if (route) {
    router.push(route);
  }
}
</script>

<template>
  <div class="max-w-[600px] mx-auto px-4 flex flex-col gap-4 sm:gap-5">
    <ImportStepIndicator :current-step="1" />
    <AppCard class="max-sm:p-3">
      <div class="flex items-center gap-2 mb-3">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
          >1</span
        >
        <h2 class="text-base max-sm:text-sm">选择导入方式</h2>
      </div>
      <div class="grid gap-2">
        <button
          v-for="method in methods"
          :key="method.id"
          class="min-w-0 flex items-center gap-2.5 p-2.5 rounded-xl border border-[color:var(--border)] bg-surface-soft text-left cursor-pointer transition-all duration-150 hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="method.disabled"
          @click="!method.disabled && handleSelect(method.id)"
        >
          <span
            class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-surface"
          >
            <AppIcon :path="method.icon" :size="18" />
          </span>
          <span class="flex-1 min-w-0">
            <span class="font-medium text-sm flex items-center gap-1">
              <span>
                {{ method.label }}
              </span>
              <span
                v-if="method.disabled"
                class="inline-block text-xs text-muted bg-surface-soft px-2 max-sm:px-1.5 rounded-full ml-1 leading-none whitespace-nowrap"
              >
                即将支持
              </span>
            </span>
            <span class="block text-xs text-muted mt-0.5 truncate">
              {{ method.description }}
            </span>
          </span>
        </button>
      </div>
    </AppCard>
  </div>
</template>
