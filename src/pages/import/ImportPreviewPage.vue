<script setup lang="ts">
import { mdiCheckCircleOutline } from '@mdi/js';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import ImportStepIndicator from '../../components/import/ImportStepIndicator.vue';
import AppButton from '../../components/ui/AppButton.vue';
import AppCard from '../../components/ui/AppCard.vue';
import { useImportStore } from '../../stores/import';
import type { QuestionItem } from '../../types/quiz';

const router = useRouter();
const importStore = useImportStore();

const typeLabels: Record<string, string> = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
  indeterminate: '不定项',
};

const typeBreakdown = computed(() => {
  if (!importStore.preview) return {};
  const breakdown: Record<string, number> = {};
  for (const q of importStore.preview.questions) {
    breakdown[q.type] = (breakdown[q.type] ?? 0) + 1;
  }
  return breakdown;
});

const sampleQuestions = computed(() => {
  if (!importStore.preview) return [];
  const seen = new Set<string>();
  const samples: QuestionItem[] = [];
  for (const q of importStore.preview.questions) {
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

async function confirmImport() {
  await importStore.confirmImport();
  router.push('/banks');
}
</script>

<template>
  <div class="max-w-[600px] mx-auto px-4 flex flex-col gap-4 sm:gap-5">
    <ImportStepIndicator :current-step="3" />

    <template v-if="importStore.preview">
      <AppCard class="max-sm:p-3">
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
            >3</span
          >
          <h2 class="text-base max-sm:text-sm">确认题库</h2>
        </div>

        <!-- Warning -->
        <div
          v-if="importStore.warning"
          class="mb-3 p-3 rounded-xl border border-[rgba(199,125,26,0.4)] bg-[rgba(199,125,26,0.08)] text-xs"
        >
          <span class="font-semibold">提醒：</span>{{ importStore.warning }}
        </div>

        <!-- Preview card -->
        <div
          class="p-4 rounded-xl border border-[rgba(47,133,90,0.3)] bg-[rgba(47,133,90,0.06)] grid gap-1.5"
        >
          <div class="text-base font-medium">
            {{ importStore.preview.meta.course.name }}
          </div>
          <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            <code>{{ importStore.preview.meta.course.code }}</code>
            <span>{{ importStore.preview.meta.author || '未标注' }}</span>
            <span>{{ importStore.preview.questions.length }} 题</span>
            <span v-if="importStore.preview.meta.source">{{
              importStore.preview.meta.source
            }}</span>
          </div>
        </div>

        <!-- Type Breakdown -->
        <div
          v-if="importStore.selectedMethod === 'xlsx'"
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
          v-if="importStore.unsupportedRows.length > 0"
          class="mt-3 p-3 rounded-xl border border-[rgba(199,125,26,0.4)] bg-[rgba(199,125,26,0.08)] text-xs"
        >
          <details>
            <summary class="cursor-pointer font-medium text-[var(--warn)]">
              {{ importStore.unsupportedRows.length }} 行已跳过
            </summary>
            <ul class="mt-1.5 text-xs text-muted list-disc pl-4 grid gap-0.5">
              <li v-for="(msg, idx) in importStore.unsupportedRows" :key="idx">
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
            :disabled="!importStore.preview"
            :icon-path="mdiCheckCircleOutline"
            :icon-size="18"
            @click="confirmImport"
            class="max-sm:text-[13px] max-sm:px-3 max-sm:py-2"
          >
            导入并使用
          </AppButton>
        </div>
      </AppCard>
    </template>

    <!-- Fallback if no preview data -->
    <AppCard v-else class="max-sm:p-3">
      <p class="text-sm text-muted text-center py-4">
        没有可预览的数据，请先导入题库。
      </p>
    </AppCard>
  </div>
</template>
