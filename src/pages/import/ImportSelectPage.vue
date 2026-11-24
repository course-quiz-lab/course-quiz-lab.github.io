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
    id: 'cloud',
    label: '云端题库',
    icon: 'i-lucide-cloud',
    disabled: false,
    description: '从云端拉取题库索引并下载导入',
  },
  {
    id: 'upload',
    label: '导入 JSON',
    icon: 'i-lucide-file-json',
    disabled: false,
    description: '上传本地 JSON 文件，或从在线链接读取',
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
  // 先 reset 再 setMethod：reset() 会把 selectedMethod 重置为 upload
  importStore.reset();
  importStore.setMethod(method);

  // 上传与链接已合并到 /import/json，由该页切换具体方式
  const routes: Partial<Record<ImportMethod, string | null>> = {
    upload: '/import/json',
    link: '/import/json',
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
