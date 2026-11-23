<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import moment from 'moment';
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
  // Save current form state as draft
  importStore.paperCreateDraft = {
    selectedBanks: { ...selectedBanks.value },
    bankWeights: { ...bankWeights.value },
    loadedBankIds: Object.keys(loadedBanks.value),
    targetCounts: { ...targetCounts.value },
    typeOrder: [...typeOrder.value],
    shuffleQuestions: shuffleQuestions.value,
    shuffleOptions: shuffleOptions.value,
    selectedMode: selectedMode.value,
    paperTitle: paperTitle.value,
  };
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
const paperTitle = ref('自定义试卷 - ' + moment().format('YYYY-MM-DD HH:mm'));

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

/** 题型在试卷中的呈现顺序，始终是 allTypes 的一个全排列 */
const typeOrder = ref<QuestionType[]>([...allTypes]);

/** 校验草稿里的题型顺序是否仍是合法全排列（缺项/重复/多项都视为非法） */
function isValidTypeOrder(order: QuestionType[]) {
  if (order.length !== allTypes.length) return false;
  const unique = new Set(order);
  return (
    unique.size === allTypes.length && allTypes.every((t) => unique.has(t))
  );
}

/** 把第 from 个题型移动到 to 位置，其余题型顺次补位 */
function moveTypeTo(from: number, to: number) {
  const next = [...typeOrder.value];
  if (from === to) return;
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  typeOrder.value = next;
}

/** 正在拖动的题型在 typeOrder 中的下标 */
const draggingIndex = ref<number | null>(null);

function onTypeDragStart(index: number, event: DragEvent) {
  draggingIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    // Firefox 必须写入数据才会真正开始拖动
    event.dataTransfer.setData('text/plain', String(index));
  }
}

/** 悬停到另一个题型时就地换位，拖动过程中即可看到最终顺序 */
function onTypeDragOver(index: number, event: DragEvent) {
  if (draggingIndex.value === null) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  if (index === draggingIndex.value) return;
  moveTypeTo(draggingIndex.value, index);
  draggingIndex.value = index;
}

function onTypeDrop(event: DragEvent) {
  event.preventDefault();
  draggingIndex.value = null;
}

function onTypeDragEnd() {
  draggingIndex.value = null;
}

/**
 * 移动端长按拖动：原生 HTML5 拖拽在触屏上不生效，
 * 这里在手柄上用 Pointer Events 实现「长按 → 拖动 → 松手落下」。
 * 手柄带 touch-none，长按开始后页面不会再跟着滚动。
 */
const LONG_PRESS_MS = 320;
const LONG_PRESS_MOVE_TOLERANCE = 10;

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let pressStartX = 0;
let pressStartY = 0;
const touchDragging = ref(false);

function clearLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

/** 通过坐标找到手指下方的题型行 */
function findTypeRowIndexAt(x: number, y: number): number | null {
  const element = document.elementFromPoint(x, y);
  const row = element?.closest<HTMLElement>('[data-type-row]');
  if (!row) return null;
  const raw = Number(row.dataset.typeIndex);
  return Number.isNaN(raw) ? null : raw;
}

function onHandlePointerDown(index: number, event: PointerEvent) {
  // 鼠标继续走原生拖拽，避免两套逻辑互相干扰
  if (event.pointerType === 'mouse') return;
  pressStartX = event.clientX;
  pressStartY = event.clientY;
  clearLongPress();
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    touchDragging.value = true;
    draggingIndex.value = index;
    // Android 上给一点触觉反馈（不支持则忽略）
    navigator.vibrate?.(15);
  }, LONG_PRESS_MS);
}

function onHandlePointerMove(event: PointerEvent) {
  if (touchDragging.value) {
    event.preventDefault();
    const target = findTypeRowIndexAt(event.clientX, event.clientY);
    if (
      target === null ||
      draggingIndex.value === null ||
      target === draggingIndex.value
    ) {
      return;
    }
    moveTypeTo(draggingIndex.value, target);
    draggingIndex.value = target;
    return;
  }

  if (longPressTimer === null) return;
  // 长按触发前就开始滑动，说明用户想滚动页面
  const dx = event.clientX - pressStartX;
  const dy = event.clientY - pressStartY;
  if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) clearLongPress();
}

function endTouchDrag() {
  clearLongPress();
  if (!touchDragging.value) return;
  touchDragging.value = false;
  draggingIndex.value = null;
}

function resetTypeOrder() {
  typeOrder.value = [...allTypes];
}

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
const hasSelectedBank = computed(() =>
  Object.values(selectedBanks.value).some(Boolean),
);

onMounted(async () => {
  metas.value = await listBankMetas();
  for (const meta of metas.value) {
    bankWeights.value[meta.bankId] = 1;
  }

  // Restore draft from import store if returning from import flow
  const draft = importStore.paperCreateDraft;
  if (draft) {
    selectedBanks.value = draft.selectedBanks;
    bankWeights.value = draft.bankWeights;
    targetCounts.value = draft.targetCounts;
    if (draft.typeOrder && isValidTypeOrder(draft.typeOrder)) {
      typeOrder.value = [...draft.typeOrder];
    }
    shuffleQuestions.value = draft.shuffleQuestions;
    shuffleOptions.value = draft.shuffleOptions;
    selectedMode.value = draft.selectedMode;
    paperTitle.value = draft.paperTitle;
    // Pre-load banks that were previously loaded
    await Promise.all(
      draft.loadedBankIds.map((id) =>
        loadBank(id).then((b) => {
          if (b) loadedBanks.value[id] = b;
        }),
      ),
    );
    importStore.paperCreateDraft = null;
  } else if (metas.value.length === 1) {
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

function updateCount(type: QuestionType, value: number | string | null) {
  const raw = Number(value);
  const max = availableCounts.value[type];
  targetCounts.value[type] = Math.max(
    0,
    Math.min(Number.isFinite(raw) ? Math.round(raw) : 0, max),
  );
}

function randomizeDistribution() {
  const total = maxTotal.value;
  if (total === 0) return;

  // Random percentage between 70% and 90%
  const percent = 0.7 + Math.random() * 0.2;
  const pool = Math.floor(total * percent);
  if (pool === 0) return;

  const typesWithAvailable = allTypes.filter(
    (t) => availableCounts.value[t] > 0,
  );
  if (typesWithAvailable.length === 0) return;

  // Reset all targets to 0 first
  for (const t of allTypes) {
    targetCounts.value[t] = 0;
  }

  let remaining = pool;

  // Randomly assign each unit from the pool to a type that still has capacity
  while (remaining > 0) {
    // Pick a random type among those with remaining capacity
    const candidates = typesWithAvailable.filter(
      (t) => targetCounts.value[t] < availableCounts.value[t],
    );
    if (candidates.length === 0) break;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    targetCounts.value[picked]++;
    remaining--;
  }
}

function maximizeDistribution() {
  for (const t of allTypes) {
    targetCounts.value[t] = availableCounts.value[t];
  }
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

/**
 * 组卷规则：
 * 1. 先按题型分别抽题（题库权重与配额逻辑不变），结果按题型分组保存；
 * 2.「打乱题目顺序」只在每个题型内部洗牌，题型块之间的先后不受影响；
 *    未开启时保持题库中的原始顺序（`pickRandom` 的抽取顺序本身是随机的，需要还原）；
 * 3. 最后按用户设定的 `typeOrder` 依次拼接，未分配数量或库存为 0 的题型自动跳过；
 * 4.「打乱选项顺序」逐题处理选项文本，不改变任何题目顺序。
 */
async function startQuiz() {
  if (!hasSelection.value) return;

  const selectedBankIds = Object.keys(selectedBanks.value).filter(
    (id) => selectedBanks.value[id] && loadedBanks.value[id],
  );
  if (selectedBankIds.length === 0) return;

  // 按题型分组抽题
  const pickedByType: Record<QuestionType, QuestionItem[]> = {
    single: [],
    multiple: [],
    judge: [],
    indeterminate: [],
  };

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
      if (b.allocated === 0) continue;
      const picked = pickRandom(b.qs, b.allocated);
      if (!shuffleQuestions.value) {
        // 关闭乱序时还原题库内的原始顺序
        const originalOrder = new Map(b.qs.map((q, index) => [q.id, index]));
        picked.sort(
          (a, c) =>
            (originalOrder.get(a.id) ?? 0) - (originalOrder.get(c.id) ?? 0),
        );
      }
      pickedByType[type].push(...picked);
    }
  }

  // 题型内部乱序（题型之间的顺序不受影响）
  if (shuffleQuestions.value) {
    for (const type of allTypes) {
      pickedByType[type] = shuffle(pickedByType[type]);
    }
  }

  // 按用户设定的题型顺序拼接
  let finalQs: QuestionItem[] = typeOrder.value.flatMap(
    (type) => pickedByType[type],
  );

  // 选项乱序（逐题处理，不改变题目顺序）
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

  const paper: Paper = {
    id: crypto.randomUUID(),
    title: paperTitle.value || '自定义试卷',
    createdAt: Date.now(),
    questions: finalQs,
    bankNames: selectedBankIds
      .map((id) => metas.value.find((m) => m.bankId === id)?.meta.name)
      .filter((n): n is string => !!n),
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
  <PageLayout
    title="新建试卷"
    description="从已导入的题库中按题型与数量自由组卷。"
    max-width="820px"
    show-back
  >
    <div v-if="isLoading" class="text-sm text-muted">加载中…</div>

    <UEmpty
      v-else-if="metas.length === 0"
      icon="i-lucide-database"
      title="还没有导入过题库"
      description="先导入题库，才能按题型生成试卷。"
      variant="naked"
      class="rounded-xl border border-dashed border-default py-16"
    >
      <template #actions>
        <UButton icon="i-lucide-download" label="导入题库" @click="goToImport" />
      </template>
    </UEmpty>

    <template v-else>
      <div class="space-y-6">
        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-semibold text-highlighted">试卷名称</h2>
                <p class="mt-0.5 text-xs text-muted">
                  生成后将以此名称保存在试卷列表中。
                </p>
              </div>
            </div>
          </template>

          <UInput
            v-model="paperTitle"
            size="lg"
            placeholder="如：物理期末复习"
            aria-label="试卷名称"
            class="w-full"
          />
        </UCard>

        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-semibold text-highlighted">
                  来源题库与权重
                </h2>
                <p class="mt-0.5 text-xs text-muted">
                  勾选参与组卷的题库，权重越高抽到的题目越多。
                </p>
              </div>
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                icon="i-lucide-plus"
                label="导入题库"
                @click="goToImport"
              />
            </div>
          </template>

          <div class="space-y-2">
            <div
              v-for="meta in metas"
              :key="meta.bankId"
              class="flex flex-col gap-3 rounded-lg border border-default px-3 py-2.5 sm:flex-row sm:items-center"
            >
              <UCheckbox
                v-model="selectedBanks[meta.bankId]"
                :label="meta.meta.name"
                class="min-w-0 flex-1"
              />
              <div
                v-if="selectedBanks[meta.bankId]"
                class="flex items-center gap-2 pl-6 sm:pl-0"
              >
                <span class="shrink-0 text-xs text-muted">权重</span>
                <UInput
                  v-model.number="bankWeights[meta.bankId]"
                  type="number"
                  min="0"
                  step="0.1"
                  size="sm"
                  class="w-20"
                  :ui="{ base: 'text-center' }"
                />
              </div>
            </div>
          </div>
        </UCard>

        <UCard
          :ui="{ body: 'p-5 sm:p-6' }"
          :class="{
            'pointer-events-none opacity-50': !hasSelectedBank,
          }"
        >
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-semibold text-highlighted">
                  题目与题型分配
                </h2>
                <p class="mt-0.5 text-xs text-muted">
                  当前题库可用 {{ maxTotal }} 题。
                  你可以拖动左侧手柄调整题型顺序。
                </p>
              </div>
              <div class="flex items-center gap-1">
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  icon="i-lucide-shuffle"
                  label="随机分配"
                  @click="randomizeDistribution"
                />
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  icon="i-lucide-check-check"
                  label="全选"
                  @click="maximizeDistribution"
                />
                <UTooltip text="恢复默认题型顺序">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    icon="i-lucide-rotate-ccw"
                    square
                    aria-label="恢复默认题型顺序"
                    @click="resetTypeOrder"
                  />
                </UTooltip>
              </div>
            </div>
          </template>

          <div class="space-y-2">
            <div
              v-for="(type, index) in typeOrder"
              :key="type"
              data-type-row
              :data-type-index="index"
              class="flex items-center gap-2 rounded-lg border border-default bg-default px-2 py-2 transition-colors"
              :class="[
                availableCounts[type] === 0 ? 'opacity-40' : '',
                draggingIndex === index
                  ? 'border-primary ring-1 ring-primary/40'
                  : '',
              ]"
              @dragover="onTypeDragOver(index, $event)"
              @drop="onTypeDrop"
            >
              <!-- 手柄：鼠标走 HTML5 拖拽，触屏走长按（320ms）拖动 -->
              <span
                draggable="true"
                class="grid size-8 shrink-0 cursor-grab touch-none select-none place-items-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-highlighted active:cursor-grabbing sm:size-7"
                title="拖动或长按调整题型顺序"
                aria-hidden="true"
                @dragstart="onTypeDragStart(index, $event)"
                @dragend="onTypeDragEnd"
                @pointerdown="onHandlePointerDown(index, $event)"
                @pointermove="onHandlePointerMove"
                @pointerup="endTouchDrag"
                @pointercancel="endTouchDrag"
                @contextmenu.prevent
              >
                <UIcon name="i-lucide-grip-vertical" class="size-4" />
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-highlighted">
                  {{ typeLabels[type] }}
                </p>
                <p class="text-xs text-muted">
                  可用 {{ availableCounts[type] }} 题
                </p>
              </div>

              <UInput
                type="number"
                min="0"
                :max="availableCounts[type]"
                :model-value="targetCounts[type]"
                :disabled="availableCounts[type] === 0"
                size="sm"
                class="w-16 shrink-0 sm:w-20"
                :ui="{ base: 'text-center' }"
                @update:model-value="updateCount(type, $event)"
              />
            </div>
          </div>

          <div
            class="mt-3 flex items-center justify-between border-t border-default pt-3 text-sm"
          >
            <span class="font-medium">选题总计</span>
            <span
              class="font-semibold"
              :class="hasSelection ? 'text-primary' : 'text-error'"
            >
              {{ selectedTotal }} / {{ maxTotal }} 题
            </span>
          </div>
        </UCard>

        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <div class="space-y-3">
            <UCheckbox
              v-model="shuffleQuestions"
              label="打乱题目顺序"
              description="仅在各题型内部乱序，题型之间的先后按上面的设定保持不变。"
            />
            <UCheckbox
              v-model="shuffleOptions"
              label="打乱选项顺序"
              description="逐题重排选项文本，答案编号同步重映射。"
            />
          </div>

          <div class="mt-5">
            <p class="mb-2 text-sm font-medium text-highlighted">答题模式</p>
            <UFieldGroup>
              <UButton
                :variant="selectedMode === 'practice' ? 'solid' : 'outline'"
                :color="selectedMode === 'practice' ? 'primary' : 'neutral'"
                icon="i-lucide-play"
                label="练习模式"
                @click="selectedMode = 'practice'"
              />
              <UButton
                :variant="selectedMode === 'exam' ? 'solid' : 'outline'"
                :color="selectedMode === 'exam' ? 'primary' : 'neutral'"
                icon="i-lucide-square-pen"
                label="考试模式"
                @click="selectedMode = 'exam'"
              />
            </UFieldGroup>
          </div>
        </UCard>
      </div>

      <div
        class="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default bg-default/85 p-3 backdrop-blur-sm"
      >
        <div class="text-sm">
          <span class="text-muted">已选 </span>
          <span class="font-semibold text-highlighted">
            {{ selectedTotal }}
          </span>
          <span class="text-muted"> 题 · </span>
          <span class="text-muted">
            {{ selectedMode === 'exam' ? '考试' : '练习' }}模式
          </span>
        </div>
        <UButton
          :disabled="!hasSelection"
          icon="i-lucide-play"
          label="生成试卷并开始"
          @click="startQuiz"
        />
      </div>
    </template>
  </PageLayout>
</template>
