<script setup lang="ts">
import {
  mdiCloudOutline,
  mdiFileDocumentOutline,
  mdiLinkVariant,
  mdiMicrosoftExcel,
  mdiMicrosoftWord,
} from '@mdi/js';
import AppIcon from './ui/AppIcon.vue';

export type ImportMethod = 'upload' | 'link' | 'cloud' | 'xlsx' | 'word';

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
  {
    id: 'cloud',
    label: '云端题库',
    icon: mdiCloudOutline,
    disabled: true,
    description: '预留：从云端拉取题库索引并下载',
  },
];

const emit = defineEmits<{
  select: [method: ImportMethod];
}>();
</script>

<template>
  <div class="grid gap-2">
    <button
      v-for="method in methods"
      :key="method.id"
      class="flex items-center gap-2.5 p-2.5 rounded-xl border border-[color:var(--border)] bg-surface-soft text-left cursor-pointer transition-all duration-150 hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="method.disabled"
      @click="!method.disabled && emit('select', method.id)"
    >
      <span
        class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-surface"
      >
        <AppIcon :path="method.icon" :size="18" />
      </span>
      <span class="flex-1 min-w-0">
        <span class="block font-medium text-sm">{{ method.label }}</span>
        <span class="block text-xs text-muted mt-0.5 truncate">{{
          method.description
        }}</span>
      </span>
      <span
        v-if="method.disabled"
        class="shrink-0 text-[10px] text-muted bg-surface-soft px-2 py-0.5 rounded-full whitespace-nowrap"
      >
        即将支持
      </span>
    </button>
  </div>
</template>
