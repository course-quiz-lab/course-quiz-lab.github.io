<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { listBankMetas, loadBank } from '../utils/idb';
import type { Bank, BankMetaEntry, QuestionType } from '../types/quiz';
import { mdiCogOutline, mdiPlus } from '@mdi/js';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppIcon from '../components/ui/AppIcon.vue';

const router = useRouter();

const bankMetas = ref<BankMetaEntry[]>([]);
const selectedBankId = ref<string | null>(null);
const selectedBank = ref<Bank | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  bankMetas.value = await listBankMetas();
  isLoading.value = false;
});

async function selectBank(entry: BankMetaEntry) {
  selectedBankId.value = entry.bankId;
  const full = await loadBank(entry.bankId);
  selectedBank.value = full ?? null;
}

const currentEntry = computed(() =>
  bankMetas.value.find((e) => e.bankId === selectedBankId.value),
);

const typeLabels: Record<QuestionType, string> = {
  single: '单项选择题',
  multiple: '多项选择题',
  judge: '判断题',
  indeterminate: '不定项选择题',
};

const typeStats = computed(() => {
  if (!selectedBank.value) return [];
  const counts: Record<QuestionType, number> = {
    single: 0,
    multiple: 0,
    judge: 0,
    indeterminate: 0,
  };
  for (const q of selectedBank.value.questions) {
    if (counts[q.type] !== undefined) counts[q.type]++;
  }
  return (Object.entries(counts) as [QuestionType, number][]).filter(
    ([, count]) => count > 0,
  );
});

function goToConfigure() {
  if (!selectedBankId.value) return;
  router.push(`/banks/${selectedBankId.value}/configure`);
}

function goToImport() {
  router.push('/import');
}
</script>

<template>
  <div class="page">
    <h1 class="text-3xl mb-6 max-sm:text-2xl">选择题库</h1>

    <div v-if="isLoading" class="text-muted text-sm">加载中…</div>

    <div v-else class="grid grid-cols-[360px_1fr] gap-6 max-lg:grid-cols-1">
      <div
        class="bg-surface rounded-2xl border border-[color:var(--border)] overflow-hidden max-h-[600px] max-sm:max-h-[280px] flex flex-col"
      >
        <div
          class="p-4 border-b border-[color:var(--border)] flex items-center justify-between"
        >
          <span class="text-sm font-medium text-muted">
            已导入题库（{{ bankMetas.length }}）
          </span>
          <button
            class="inline-flex items-center gap-1 text-sm text-brand border-none bg-transparent cursor-pointer p-1 rounded-lg hover:bg-surface-soft transition-colors duration-150"
            @click="goToImport"
          >
            <AppIcon :path="mdiPlus" :size="16" />
            <span>导入</span>
          </button>
        </div>
        <div
          class="flex-1 overflow-y-auto divide-y divide-[color:var(--border)]"
        >
          <button
            v-for="entry in bankMetas"
            :key="entry.bankId"
            class="w-full text-left p-4 max-sm:p-3 cursor-pointer border-none bg-transparent transition-colors duration-150 hover:bg-surface-soft"
            :class="{
              '!bg-[rgba(47,133,90,0.08)]': selectedBankId === entry.bankId,
            }"
            @click="selectBank(entry)"
          >
            <div class="font-medium text-sm">{{ entry.meta.course.name }}</div>
            <div class="flex gap-3 text-xs text-muted mt-1">
              <code>{{ entry.meta.course.code }}</code>
              <span>{{ entry.meta.total ?? '?' }} 题</span>
              <span>{{ entry.meta.author || '未知作者' }}</span>
            </div>
          </button>
        </div>
      </div>

      <div
        v-if="!selectedBank"
        class="flex items-center justify-center h-[400px] bg-surface rounded-2xl border border-[color:var(--border)] text-muted text-sm"
      >
        请选择一个题库……
      </div>

      <AppCard v-else class="max-sm:p-4">
        <!-- Header: course name + code -->
        <div class="mb-5">
          <div class="text-[22px] max-sm:text-lg mb-1">
            {{ selectedBank.meta.course.name }}
          </div>
          <code class="text-sm text-muted">{{
            selectedBank.meta.course.code
          }}</code>
        </div>

        <!-- Two info cards side by side -->
        <div
          class="grid grid-cols-[1fr_2fr] gap-4 mb-5 max-sm:grid-cols-1 min-w-0"
        >
          <AppCard class="!p-4">
            <div class="text-xs text-muted tracking-wide uppercase mb-3">
              题量统计
            </div>
            <div class="grid gap-2">
              <div
                v-for="[type, count] in typeStats"
                :key="type"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-muted">{{ typeLabels[type] }}</span>
                <span class="font-semibold"
                  >{{ count
                  }}<span class="text-xs text-muted font-normal ml-0.5"
                    >题</span
                  ></span
                >
              </div>
              <div
                class="border-t border-[color:var(--border)] pt-2 mt-1 flex items-center justify-between text-sm font-medium"
              >
                <span>总计</span>
                <span class="text-brand"
                  >{{ selectedBank.questions.length }} 题</span
                >
              </div>
            </div>
          </AppCard>

          <AppCard class="!p-4 min-w-0">
            <div class="text-xs text-muted tracking-wide uppercase mb-3">
              题库信息
            </div>
            <div class="grid gap-2 min-w-0">
              <div class="flex items-center gap-2 text-sm min-w-0">
                <span class="text-muted w-[4.5em] shrink-0">作者</span>
                <span class="truncate">
                  {{ selectedBank.meta.author || '未标注' }}
                </span>
              </div>
              <div
                v-if="selectedBank.meta.source"
                class="flex items-center gap-2 text-sm min-w-0"
              >
                <span class="text-muted w-[4.5em] shrink-0">来源</span>
                <span class="truncate">{{ selectedBank.meta.source }}</span>
              </div>
              <div
                v-if="currentEntry"
                class="flex items-center gap-2 text-sm min-w-0"
              >
                <span class="text-muted w-[4.5em] shrink-0">导入时间</span>
                <span class="truncate">
                  {{
                    new Date(currentEntry.importedAt).toLocaleString('zh-CN')
                  }}
                </span>
              </div>
              <div
                v-if="selectedBank.meta.course.link"
                class="flex items-center gap-2 text-sm text-brand min-w-0"
              >
                <span class="text-muted w-[4.5em] shrink-0">课程链接</span>
                <a
                  class="truncate underline"
                  :href="selectedBank.meta.course.link"
                  target="_blank"
                >
                  {{ selectedBank.meta.course.link }}
                </a>
              </div>
            </div>
          </AppCard>
        </div>

        <!-- Action -->
        <div class="border-t border-[color:var(--border)] pt-5">
          <AppButton
            :icon-path="mdiCogOutline"
            :icon-size="18"
            @click="goToConfigure"
          >
            配置题目并开始
          </AppButton>
        </div>
      </AppCard>
    </div>
  </div>
</template>
