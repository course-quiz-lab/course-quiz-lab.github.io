<script setup lang="ts">
import { mdiPlay, mdiPlus } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppCheckbox from '../components/ui/AppCheckbox.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import PageLayout from '../components/ui/PageLayout.vue';
import { useAttemptStore } from '../stores/attempt';
import { useImportStore } from '../stores/import';
import { usePaperStore } from '../stores/paper';
import type { Bank, BankMetaEntry, QuestionItem } from '../types/bank';
import type { Mode, QuestionType } from '../types/core';
import type { Paper } from '../types/quiz';
import { listBankMetas, loadBank, savePaper } from '../utils/idb';

const router = useRouter();
const attemptStore = useAttemptStore();
const importStore = useImportStore();
const paperStore = usePaperStore();

function goToImport() {
  importStore.returnTo = '/papers/create';
  router.push('/import');
}

const metas = ref<BankMetaEntry[]>([]);
const isLoading = ref(true);

const selectedBanks = ref<Record<string, boolean>>({});
const bankWeights = ref<Record<string, number>>({});
const loadedBanks = ref<Record<string, Bank>>({});

const shuffleQuestions = ref(false);
const shuffleOptions = ref(false);
const selectedMode = ref<Mode>('practice');
const paperTitle = ref('自定义试卷');

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

// user target counts
const targetCounts = ref<Record<QuestionType, number>>({
  single: 0,
  multiple: 0,
  judge: 0,
  indeterminate: 0,
});

// Calculate available dynamically based on selected banks
const availableCounts = computed(() => {
  const counts = { single: 0, multiple: 0, judge: 0, indeterminate: 0 };
  for (const bankId of Object.keys(selectedBanks.value)) {
    if (selectedBanks.value[bankId] && loadedBanks.value[bankId]) {
      for (const q of loadedBanks.value[bankId].questions) {
        counts[q.type]++;
      }
    }
  }
  return counts;
});

const maxTotal = computed(() =>
  allTypes.reduce((sum, t) => sum + availableCounts.value[t], 0),
);
const selectedTotal = computed(() =>
  allTypes.reduce((sum, t) => sum + targetCounts.value[t], 0),
);
const hasSelection = computed(() => selectedTotal.value > 0);

onMounted(async () => {
  metas.value = await listBankMetas();
  for (const meta of metas.value) {
    bankWeights.value[meta.bankId] = 1; // default weight 1
  }
  if (metas.value.length === 1) {
    selectedBanks.value[metas.value[0].bankId] = true;
  }
  isLoading.value = false;
});

watch(
  selectedBanks,
  async (newVals) => {
    for (const [bankId, isSelected] of Object.entries(newVals)) {
      if (isSelected && !loadedBanks.value[bankId]) {
        const bank = await loadBank(bankId);
        if (bank) loadedBanks.value[bankId] = bank;
      }
    }
    // Auto clamp target counts so they don't exceed available
    for (const t of allTypes) {
      targetCounts.value[t] = Math.min(
        targetCounts.value[t],
        availableCounts.value[t],
      );
    }
  },
  { deep: true },
);

function updateCount(type: QuestionType, event: Event) {
  const input = event.target as HTMLInputElement;
  const raw = Number(input.value);
  const max = availableCounts.value[type];
  targetCounts.value[type] = Math.max(
    0,
    Math.min(Number.isFinite(raw) ? Math.round(raw) : 0, max),
  );
}

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

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function startQuiz() {
  if (!hasSelection.value) return;

  const selectedBankIds = Object.keys(selectedBanks.value).filter(
    (id) => selectedBanks.value[id] && loadedBanks.value[id],
  );
  if (selectedBankIds.length === 0) return;

  // Generate question distributions based on weights
  const finalQuestions: QuestionItem[] = [];

  for (const type of allTypes) {
    const target = targetCounts.value[type];
    if (target <= 0) continue;

    const banksInfo = selectedBankIds
      .map((id) => {
        const qs = loadedBanks.value[id].questions.filter(
          (q) => q.type === type,
        );
        return { id, qs, weight: bankWeights.value[id] || 1, allocated: 0 };
      })
      .filter((b) => b.qs.length > 0 && b.weight > 0);

    let totalWeight = banksInfo.reduce((sum, b) => sum + b.weight, 0);
    if (totalWeight === 0) continue; // fallback just in case

    let remaining = target;
    // Initial proportional allocation
    const exactAllocations = banksInfo.map((b) => {
      const frac = (b.weight / totalWeight) * target;
      return { ...b, frac, int: Math.floor(frac) };
    });

    for (const b of exactAllocations) {
      b.allocated = Math.min(b.int, b.qs.length);
      remaining -= b.allocated;
    }

    // Distribute remainder by highest fractional remainder that hasn't hit its cap
    while (remaining > 0) {
      let bestIdx = -1;
      let maxRemainder = -1;
      for (let i = 0; i < exactAllocations.length; i++) {
        const b = exactAllocations[i];
        if (b.allocated < b.qs.length) {
          const mod = b.frac - b.int;
          if (mod > maxRemainder) {
            maxRemainder = mod;
            bestIdx = i;
          }
        }
      }
      if (bestIdx !== -1) {
        exactAllocations[bestIdx].allocated++;
        exactAllocations[bestIdx].frac -= 1; // Decrease its priority for further ticks
        remaining--;
      } else {
        break; // All selected banks maxed out for this type
      }
    }

    // Pick and append
    for (const b of exactAllocations) {
      if (b.allocated > 0) {
        finalQuestions.push(...pickRandom(b.qs, b.allocated));
      }
    }
  }

  let finalQs = finalQuestions;
  if (shuffleOptions.value) {
    finalQs = finalQs.map((q) => {
      if (q.type === 'judge' || q.options.length === 0) return q;
      const texts = q.options.map((o) => o.text);
      const shuffledTexts = shuffle(texts);
      const newOptions = q.options.map((o, i) => ({
        ...o,
        text: shuffledTexts[i],
      }));
      const newAnswer = q.answer.map((ansId) => {
        const origText = q.options.find((o) => o.id === ansId)?.text;
        const newSlot = newOptions.find((o) => o.text === origText);
        return newSlot ? newSlot.id : ansId;
      });
      return { ...q, options: newOptions, answer: newAnswer };
    });
  }

  if (shuffleQuestions.value) {
    finalQs = shuffle(finalQs);
  }

  const paper: Paper = {
    id: crypto.randomUUID(),
    title: paperTitle.value || '自定义试卷',
    createdAt: Date.now(),
    questions: finalQs,
  };

  await savePaper(paper);
  paperStore.paper = paper;
  const attemptId = await attemptStore.startAttempt(
    paper.id,
    selectedMode.value,
    paper.questions,
  );
  router.push(`/quiz/${paper.id}/attempt/${attemptId}`);
}
</script>

<template>
  <PageLayout title="新建试卷" max-width="700px">
    <div v-if="isLoading" class="text-muted text-sm pb-[100px]">加载中…</div>
    <div
      v-else-if="metas.length === 0"
      class="pb-[100px] flex flex-col items-center gap-4"
    >
      <p class="text-muted text-sm">还没有导入过题库，请先导入</p>
      <AppButton :icon-path="mdiPlus" :icon-size="18" @click="goToImport">
        导入题库
      </AppButton>
    </div>

    <template v-else>
      <AppCard class="max-sm:p-4">
        <div class="grid gap-3 mb-4">
          <label class="text-sm font-bold">试卷名称</label>
          <input
            v-model="paperTitle"
            type="text"
            placeholder="如：物理期末复习"
            class="px-3 py-2 text-sm rounded-lg border border-[color:var(--border)] bg-surface focus:border-brand focus:outline-none"
          />
        </div>
      </AppCard>

      <AppCard class="max-sm:p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm font-bold">选择来源题库并分配权重</div>
          <button
            class="inline-flex items-center gap-1 text-sm text-brand border-none bg-transparent cursor-pointer p-1 rounded-lg hover:bg-surface-soft transition-colors duration-150"
            @click="goToImport"
          >
            <AppIcon :path="mdiPlus" :size="16" />
            <span>导入题库</span>
          </button>
        </div>
        <div class="grid gap-4">
          <div
            v-for="meta in metas"
            :key="meta.bankId"
            class="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-[color:var(--border)] rounded-lg"
          >
            <AppCheckbox
              v-model="selectedBanks[meta.bankId]"
              class="flex-1 overflow-hidden"
            >
              <span class="truncate block">{{ meta.meta.name }}</span>
            </AppCheckbox>
            <div
              v-if="selectedBanks[meta.bankId]"
              class="flex flex-row items-center gap-2 max-sm:pl-6 text-sm"
            >
              <label class="text-muted text-xs shrink-0">抽取权重系数</label>
              <input
                v-model.number="bankWeights[meta.bankId]"
                type="number"
                min="0"
                step="0.1"
                class="w-[72px] px-2 py-1 text-sm text-center rounded focus:border-brand focus:outline-none border border-[color:var(--border)] bg-surface"
              />
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard
        class="max-sm:p-4"
        :class="{
          'opacity-50 pointer-events-none':
            !Object.values(selectedBanks).some(Boolean),
        }"
      >
        <div class="text-sm font-bold mb-4">题目与题型分配</div>
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
                :value="targetCounts[type]"
                :disabled="availableCounts[type] === 0"
                @input="updateCount(type, $event)"
                class="w-[72px] px-2.5 py-1.5 text-sm text-center rounded-lg border border-[color:var(--border)] bg-surface [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-brand focus:outline-none"
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
      </AppCard>

      <AppCard class="max-sm:p-4">
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
      <div class="flex gap-3 justify-center pb-[100px]">
        <AppButton
          :disabled="!hasSelection"
          :icon-path="mdiPlay"
          :icon-size="18"
          @click="startQuiz"
        >
          生成试卷并开始
        </AppButton>
      </div>
    </template>
  </PageLayout>
</template>
