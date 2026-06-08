<script setup lang="ts">
import { mdiBookOpenOutline, mdiDownload } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../../components/ui/AppButton.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
import { useBankStore } from '../../stores/bank';
import type { QuestionItem, QuestionType } from '../../types/quiz';
import { deduplicateQuestions } from '../../utils/dedup';
import { evaluateStatus } from '../../utils/scoring';
import { listPaperAttempts, listPapers, saveBank } from '../../utils/idb';

const router = useRouter();
const bankStore = useBankStore();

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
  <div class="max-w-[576px] mx-auto">
    <AppCard class="max-sm:p-3">
      <div class="flex items-center gap-2 mb-3">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
          >2</span
        >
        <h2 class="text-base max-sm:text-sm">导入错题本</h2>
      </div>

      <div v-if="isLoading" class="text-muted text-sm py-8 text-center">
        正在收集错题…
      </div>

      <template v-else>
        <div v-if="wrongQuestions.length === 0" class="text-center py-8">
          <div class="text-4xl mb-3 select-none">🎉</div>
          <p class="text-muted text-sm mb-4">错题本为空，没有可导入的题目</p>
          <AppButton variant="secondary" @click="router.push('/papers')">
            去做题
          </AppButton>
        </div>

        <div v-else>
          <div
            class="bg-surface-soft rounded-xl p-4 mb-4 grid gap-2 text-sm"
          >
            <div class="flex items-center justify-between">
              <span class="text-muted">错题出现总次数</span>
              <span class="font-semibold">{{ totalOccurrences }} 次</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">去重后题目数</span>
              <span class="font-semibold text-brand"
                >{{ wrongQuestions.length }} 题</span
              >
            </div>
            <div class="border-t border-[color:var(--border)] pt-2 mt-1 grid gap-1">
              <div
                v-for="[type, count] in typeStats"
                :key="type"
                class="flex items-center justify-between text-xs"
              >
                <span class="text-muted">{{ typeLabels[type] }}</span>
                <span>{{ count }} 题</span>
              </div>
            </div>
          </div>

          <AppButton
            :icon-path="mdiDownload"
            :icon-size="18"
            @click="importAsBank"
          >
            导入为题库
          </AppButton>
        </div>
      </template>
    </AppCard>
  </div>
</template>