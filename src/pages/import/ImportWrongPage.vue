<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { QuestionItem, QuestionType } from '../../types/quiz';
import { deduplicateQuestions } from '../../utils/dedup';
import { evaluateStatus } from '../../utils/scoring';
import { listPaperAttempts, listPapers, saveBank } from '../../utils/idb';

const router = useRouter();

const isLoading = ref(true);
const wrongQuestions = ref<QuestionItem[]>([]);
const totalOccurrences = ref(0);

const typeLabels: Record<QuestionType, string> = {
  single: '单项选择题',
  multiple: '多项选择题',
  judge: '判断题',
  indeterminate: '不定项选择题',
};

onMounted(async () => {
  const papers = await listPapers();
  const allWrong: QuestionItem[] = [];
  let count = 0;

  for (const paper of papers) {
    const attempts = await listPaperAttempts(paper.id);
    for (const attempt of attempts) {
      if (attempt.mode === 'exam' && !attempt.submittedAt) continue;
      for (const q of paper.questions) {
        const entry = attempt.answers[q.id];
        if (!entry || entry.selected.length === 0) continue;
        const status = evaluateStatus(q, entry.selected);
        if (status === 'wrong' || status === 'partial') {
          allWrong.push(q);
          count++;
        }
      }
    }
  }

  totalOccurrences.value = count;
  wrongQuestions.value = deduplicateQuestions(allWrong);
  isLoading.value = false;
});

const typeStats = computed(() => {
  const counts: Record<string, number> = {};
  for (const q of wrongQuestions.value) {
    counts[q.type] = (counts[q.type] || 0) + 1;
  }
  return Object.entries(counts) as [QuestionType, number][];
});

async function importAsBank() {
  const now = Date.now();
  const bank = {
    meta: {
      name: `错题本 - ${new Date(now).toLocaleDateString('zh-CN')}`,
      course: '错题本导入',
      author: '刷题小站',
      total: wrongQuestions.value.length,
    },
    questions: wrongQuestions.value,
  };
  await saveBank(`wrongbook-${now}`, bank as any);
  router.push('/papers');
}
</script>

<template>
  <div class="mx-auto w-full max-w-xl">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <span
            class="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white"
          >
            2
          </span>
          <h2 class="text-sm font-semibold text-highlighted">导入错题本</h2>
        </div>
      </template>

      <div v-if="isLoading" class="space-y-3">
        <USkeleton class="h-24 w-full rounded-lg" />
        <USkeleton class="h-9 w-full rounded-lg" />
      </div>

      <UEmpty
        v-else-if="wrongQuestions.length === 0"
        icon="i-lucide-party-popper"
        title="错题本为空"
        description="没有可导入的题目，先去做几套题吧。"
        variant="naked"
        class="py-8"
      >
        <template #actions>
          <UButton
            color="neutral"
            variant="outline"
            label="去做题"
            @click="router.push('/papers')"
          />
        </template>
      </UEmpty>

      <div v-else class="space-y-4">
        <div class="space-y-2 rounded-lg bg-elevated p-4 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-muted">错题出现总次数</span>
            <span class="font-semibold text-highlighted">
              {{ totalOccurrences }} 次
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">去重后题目数</span>
            <span class="font-semibold text-primary">
              {{ wrongQuestions.length }} 题
            </span>
          </div>
          <div class="grid gap-1 border-t border-default pt-2">
            <div
              v-for="[type, count] in typeStats"
              :key="type"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-muted">{{ typeLabels[type] }}</span>
              <span class="text-default">{{ count }} 题</span>
            </div>
          </div>
        </div>

        <UButton
          block
          size="lg"
          icon="i-lucide-download"
          label="导入为题库"
          @click="importAsBank"
        />
      </div>
    </UCard>
  </div>
</template>
