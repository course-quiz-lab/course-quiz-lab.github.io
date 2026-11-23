<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useImportStore } from '../../stores/import';
import type { ImportMethod } from '../../types/quiz';

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
    icon: 'i-lucide-file-text',
    disabled: false,
    description: '从本地选择 JSON 格式的题库文件',
  },
  {
    id: 'cloud',
    label: '云端题库',
    icon: 'i-lucide-cloud',
    disabled: false,
    description: '从云端拉取题库索引并下载导入',
  },
  {
    id: 'link',
    label: '链接导入',
    icon: 'i-lucide-link',
    disabled: false,
    description: '通过可公开访问的链接导入 JSON 题库',
  },
  {
    id: 'wrongbook',
    label: '导入错题',
    icon: 'i-lucide-book-open',
    disabled: false,
    description: '将错题本中的题目导入为新的题库',
  },
  {
    id: 'xlsx',
    label: '导入 XLSX',
    icon: 'i-lucide-file-spreadsheet',
    disabled: false,
    description: '从本地选择 Excel 格式的题库文件',
  },
  {
    id: 'word',
    label: '导入 Word',
    icon: 'i-lucide-file-type',
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
    wrongbook: '/import/wrong',
    word: null,
  };

  const route = routes[method];
  if (route) {
    router.push(route);
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 text-sm font-medium text-highlighted">
      选择导入方式
      <UBadge color="neutral" variant="soft" size="md">第 1 步</UBadge>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UPageCard
        v-for="method in methods"
        :key="method.id"
        :icon="method.icon"
        :title="method.label"
        :description="method.description"
        variant="outline"
        :on-click="method.disabled ? undefined : () => handleSelect(method.id)"
        :ui="{
          root: method.disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:border-primary/40',
          leadingIcon: 'size-6 text-primary',
        }"
      >
        <template #footer>
          <UBadge
            v-if="method.disabled"
            color="neutral"
            variant="soft"
            size="md"
          >
            即将支持
          </UBadge>
          <span
            v-else
            class="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            选择
            <UIcon name="i-lucide-arrow-right" class="size-3.5" />
          </span>
        </template>
      </UPageCard>
    </div>
  </div>
</template>
