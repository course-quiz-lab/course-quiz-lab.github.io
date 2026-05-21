<script setup lang="ts">
import { mdiPlay } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppCheckbox from '../components/ui/AppCheckbox.vue';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import type { Bank, Mode, QuestionType } from '../types/quiz';
import { loadBank } from '../utils/idb';

const route = useRoute();
const router = useRouter();
const bankStore = useBankStore();
const attemptStore = useAttemptStore();

const bankId = computed(() => route.params.bankId as string);
const bank = ref<Bank | null>(null);
const isLoading = ref(true);

const shuffleQuestions = ref(false);
const shuffleOptions = ref(false);
const selectedMode = ref<Mode>('practice');

const typeLabels: Record<QuestionType, string> = {
  single: '单项选择题',
  multiple: '多项选择题',
  judge: '判断题',
  indeterminate: '不定项选择题',
};

const allTypes: QuestionType[] = [
  'single',
  'multiple',
  'judge',
  'indeterminate',
];

/** { type → available count in bank } */
const availableCounts = ref<Record<QuestionType, number>>({
  single: 0,
  multiple: 0,
  judge: 0,
  indeterminate: 0,
});

/** { type → user-selected count } */
const selectedCounts = ref<Record<QuestionType, number>>({
  single: 0,
  multiple: 0,
  judge: 0,
  indeterminate: 0,
});

const maxTotal = computed(() =>
  allTypes.reduce((sum, t) => sum + availableCounts.value[t], 0),
);

const selectedTotal = computed(() =>
  allTypes.reduce((sum, t) => sum + selectedCounts.value[t], 0),
);

const hasSelection = computed(() => selectedTotal.value > 0);

onMounted(async () => {
  const full = await loadBank(bankId.value);
  if (!full) {
    router.replace('/banks');
    return;
  }
  bank.value = full;

  // Count available questions per type
  const counts: Record<QuestionType, number> = {
    single: 0,
    multiple: 0,
    judge: 0,
    indeterminate: 0,
  };
  for (const q of full.questions) {
    if (counts[q.type] !== undefined) counts[q.type]++;
  }
  availableCounts.value = { ...counts };
  selectedCounts.value = { ...counts };

  isLoading.value = false;
});

function clampCount(type: QuestionType, raw: number) {
  const max = availableCounts.value[type];
  const val = Number.isFinite(raw) ? Math.round(raw) : 0;
  return Math.max(0, Math.min(val, max));
}

function updateCount(type: QuestionType, event: Event) {
  const input = event.target as HTMLInputElement;
  selectedCounts.value[type] = clampCount(type, Number(input.value));
}

/** Pick `n` random items from an array — returns a new array */
function pickRandom<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return [...arr];
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

async function startQuiz() {
  if (!bank.value || !hasSelection.value) return;

  // 1. Group questions by type
  const byType: Record<QuestionType, typeof bank.value.questions> = {
    single: [],
    multiple: [],
    judge: [],
    indeterminate: [],
  };
  for (const q of bank.value.questions) {
    if (byType[q.type]) byType[q.type].push(q);
  }

  // 2. Pick selected number per type
  const picked = allTypes.flatMap((t) =>
    pickRandom(byType[t], selectedCounts.value[t]),
  );

  // 3. Build a sub-bank with only picked questions
  const subBank: Bank = {
    meta: { ...bank.value.meta, total: picked.length },
    questions: picked,
  };

  // 4. Set as current bank & configure attempt
  await bankStore.setBank(subBank);
  attemptStore._pendingShuffleQuestions = shuffleQuestions.value;
  attemptStore._pendingShuffleOptions = shuffleOptions.value;
  await router.push(`/${selectedMode.value}`);
}
</script>

<template>
  <div class="page max-w-[700px] mx-auto">
    <h1 class="text-[28px] max-sm:text-[22px] mb-2">答题配置</h1>
    <p v-if="bank" class="text-muted text-sm mb-6">
      {{ bank.meta.course.name }} · <code>{{ bank.meta.course.code }}</code>
    </p>

    <div v-if="isLoading" class="text-muted text-sm">加载中…</div>

    <template v-else-if="bank">
      <!-- Question count selection -->
      <AppCard class="mb-5 max-sm:p-4">
        <div class="text-sm font-medium mb-4">选择题型与数量</div>
        <div class="grid gap-3">
          <div
            v-for="type in allTypes"
            :key="type"
            class="flex items-center justify-between gap-3"
            :class="{ 'opacity-30': availableCounts[type] === 0 }"
          >
            <span class="text-sm text-muted shrink-0">{{
              typeLabels[type]
            }}</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted"
                >共 {{ availableCounts[type] }} 题</span
              >
              <input
                type="number"
                min="0"
                :max="availableCounts[type]"
                :value="selectedCounts[type]"
                :disabled="availableCounts[type] === 0"
                @input="updateCount(type, $event)"
                class="w-[72px] px-2.5 py-1.5 text-sm text-center rounded-lg border border-[color:var(--border)] bg-surface [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>
        <div
          class="border-t border-[color:var(--border)] pt-3 mt-3 flex items-center justify-between text-sm"
        >
          <span class="font-medium">选题总计</span>
          <span
            :class="hasSelection ? 'text-brand font-semibold' : 'text-danger'"
          >
            {{ selectedTotal }} / {{ maxTotal }} 题
          </span>
        </div>
        <div v-if="!hasSelection" class="text-xs text-danger mt-2">
          请至少选择 1 道题目
        </div>
      </AppCard>

      <!-- Shuffle & mode -->
      <AppCard class="mb-5 max-sm:p-4">
        <div class="grid gap-3 mb-4">
          <AppCheckbox v-model="shuffleQuestions">打乱题目顺序</AppCheckbox>
          <AppCheckbox v-model="shuffleOptions">打乱选项顺序</AppCheckbox>
        </div>

        <div class="text-sm text-muted mb-3">选择答题模式</div>
        <div
          class="inline-flex border border-[color:var(--border)] rounded-full overflow-hidden mb-2"
        >
          <button
            class="border-none px-5 py-[10px] text-sm cursor-pointer bg-transparent text-muted transition-all duration-200"
            :class="{ '!bg-brand !text-white': selectedMode === 'practice' }"
            @click="selectedMode = 'practice'"
          >
            练习模式
          </button>
          <button
            class="border-none px-5 py-[10px] text-sm cursor-pointer bg-transparent text-muted transition-all duration-200"
            :class="{ '!bg-brand !text-white': selectedMode === 'exam' }"
            @click="selectedMode = 'exam'"
          >
            考试模式
          </button>
        </div>
      </AppCard>

      <!-- Action -->
      <div class="flex gap-3 justify-center">
        <AppButton
          :disabled="!hasSelection"
          :icon-path="mdiPlay"
          :icon-size="18"
          @click="startQuiz"
        >
          开始答题
        </AppButton>
      </div>
    </template>
  </div>
</template>
