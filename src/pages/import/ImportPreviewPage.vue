<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useImportStore } from '../../stores/import';
import type { QuestionItem } from '../../types/quiz';
import { formatAnswerText } from '../../utils/answer';

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

function typePillColor(
  type: string,
): 'primary' | 'warning' | 'success' | 'error' | 'neutral' {
  const map: Record<string, 'primary' | 'warning' | 'success' | 'error'> = {
    single: 'primary',
    multiple: 'warning',
    judge: 'success',
    indeterminate: 'error',
  };
  return map[type] || 'neutral';
}

async function confirmImport() {
  const redirect = await importStore.confirmImport();
  router.push(redirect ?? '/papers');
}
</script>

<template>
  <div class="mx-auto w-full max-w-xl">
    <UCard v-if="importStore.preview">
      <template #header>
        <div class="flex items-center gap-2">
          <span
            class="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white"
          >
            3
          </span>
          <h2 class="text-sm font-semibold text-highlighted">确认题库</h2>
        </div>
      </template>

      <div class="space-y-4">
        <UAlert
          v-if="importStore.warning"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="提醒"
          :description="importStore.warning"
        />

        <!-- Preview card -->
        <div class="rounded-lg border border-default bg-elevated p-4">
          <p class="text-base font-medium text-highlighted">
            {{ importStore.preview.meta.name }}
          </p>
          <div
            class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted"
          >
            <UBadge color="neutral" variant="soft" size="md">
              {{ importStore.preview.meta.course }}
            </UBadge>
            <span>{{ importStore.preview.meta.author || '未标注作者' }}</span>
            <span class="text-dimmed">·</span>
            <span>{{ importStore.preview.questions.length }} 题</span>
            <template v-if="importStore.preview.meta.source">
              <span class="text-dimmed">·</span>
              <span class="truncate">{{
                importStore.preview.meta.source
              }}</span>
            </template>
          </div>
        </div>

        <!-- Type Breakdown -->
        <div v-if="importStore.selectedMethod === 'xlsx'">
          <p class="mb-2 text-xs font-medium text-muted">题型分布</p>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="(count, type) in typeBreakdown"
              :key="type"
              :color="typePillColor(String(type))"
              variant="soft"
              size="md"
            >
              {{ typeLabels[type as keyof typeof typeLabels] || type }}:
              {{ count }}
            </UBadge>
          </div>
        </div>

        <!-- Unsupported rows info -->
        <div
          v-if="importStore.unsupportedRows.length > 0"
          class="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs"
        >
          <UCollapsible>
            <template #default="{ open }">
              <UButton variant="link" color="warning" size="xs" class="px-0">
                {{ importStore.unsupportedRows.length }} 行已跳过
                <UIcon
                  :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-3.5"
                />
              </UButton>
            </template>
            <template #content>
              <ul class="mt-2 grid list-disc gap-1 pl-4 text-xs text-muted">
                <li
                  v-for="(msg, idx) in importStore.unsupportedRows"
                  :key="idx"
                >
                  {{ msg }}
                </li>
              </ul>
            </template>
          </UCollapsible>
        </div>

        <!-- Sample Questions per Type -->
        <div v-if="sampleQuestions.length > 0">
          <p class="mb-2 text-xs font-medium text-muted">
            样题预览（每种题型展示第 1 题）
          </p>
          <div class="grid gap-2">
            <div
              v-for="sq in sampleQuestions"
              :key="sq.id"
              class="rounded-lg border border-default p-3"
            >
              <div class="flex items-start gap-2">
                <UBadge
                  :color="typePillColor(sq.type)"
                  variant="soft"
                  size="md"
                  class="mt-0.5 shrink-0"
                >
                  {{ typeLabels[sq.type] || sq.type }}
                </UBadge>
                <span
                  class="line-clamp-3 min-w-0 text-xs leading-relaxed text-default"
                >
                  {{ sq.stem }}
                </span>
              </div>

              <div v-if="sq.options.length > 0" class="mt-2 grid gap-1 pl-1">
                <div
                  v-for="opt in sq.options"
                  :key="opt.id"
                  class="flex items-center gap-1.5 text-xs text-muted"
                >
                  <span
                    class="grid size-4 shrink-0 place-items-center rounded text-xs font-medium"
                    :class="
                      sq.answer.includes(opt.id)
                        ? 'bg-primary text-inverted'
                        : 'bg-elevated text-default'
                    "
                  >
                    {{ opt.id }}
                  </span>
                  <span class="truncate">{{ opt.text }}</span>
                </div>
              </div>

              <p class="mt-2 text-xs text-muted">
                答案：
                <span class="font-medium text-primary">
                  {{ formatAnswerText(sq, sq.answer, '、') }}
                </span>
              </p>
            </div>
          </div>
        </div>

        <UButton
          block
          size="lg"
          icon="i-lucide-circle-check"
          label="导入并使用"
          :disabled="!importStore.preview"
          @click="confirmImport"
        />
      </div>
    </UCard>

    <!-- Fallback if no preview data -->
    <UCard v-else>
      <UEmpty
        icon="i-lucide-file-question"
        title="没有可预览的数据"
        description="请先导入题库文件。"
        variant="naked"
        class="py-10"
      >
        <template #actions>
          <UButton
            to="/import/select"
            color="neutral"
            variant="outline"
            label="返回选择导入方式"
          />
        </template>
      </UEmpty>
    </UCard>
  </div>
</template>
