<script setup lang="ts">
/**
 * 保留自定义实现：Nuxt UI 没有与“按行虚拟滚动的答题卡网格”对应的组件。
 * 这里需要按 currentIndex 计算可见行、保持 5/8/10 列响应式布局以及逐题状态配色，
 * 用 UButton 逐格包裹反而会丢失紧凑尺寸与状态边框，因此保留原生 button 网格。
 * 列数必须与模板中的 grid-cols-* 断点保持一致，否则虚拟滚动的行窗口会错位。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  total: number;
  statuses: string[];
  currentIndex?: number;
  visibleStart?: number;
  visibleEnd?: number;
  shouldShowCurrent?: boolean;
}>();

const emit = defineEmits<{ (e: 'select', index: number): void }>();

const gridRef = ref<HTMLElement | null>(null);
const showAll = ref(false);

/** 与模板中的 grid-cols-* 断点保持一致（sm=640px、lg=1024px） */
function resolveCols(width: number) {
  // >= lg：桌面右上角固定宽度侧边栏，5 列即可
  // sm ~ lg：答题卡占满整行，用 10 列压缩按钮高度
  // < sm：手机整行，列数更多，避免按钮被拉成大方块
  if (width >= 1024) return 5;
  if (width >= 640) return 10;
  return 8;
}

// 首帧就按真实视口取列数，避免与 CSS 断点不一致导致行窗口错位
const cols = ref(
  resolveCols(typeof window === 'undefined' ? 1024 : window.innerWidth),
);

const statusStyles: Record<string, string> = {
  correct: 'border-success/50 bg-success/10 text-success',
  partial: 'border-warning/50 bg-warning/10 text-warning',
  wrong: 'border-error/50 bg-error/10 text-error',
  answered: 'border-primary/40 bg-primary/10 text-primary',
  unanswered: 'border-default bg-default text-muted',
};

function updateCols() {
  cols.value = resolveCols(window.innerWidth);
}

onMounted(() => {
  updateCols();
  window.addEventListener('resize', updateCols);
});
onUnmounted(() => window.removeEventListener('resize', updateCols));

const totalRows = computed(() => Math.ceil(props.total / cols.value));

const visibleRowRange = computed(() => {
  if (showAll.value) return { start: 0, end: totalRows.value - 1 };

  const currentRow = Math.floor((props.currentIndex ?? 0) / cols.value);
  const rowsAround = 2;
  let start = currentRow - rowsAround;
  let end = currentRow + rowsAround;
  // Shift window to always show 5 rows when possible
  if (start < 0) {
    end += -start;
    start = 0;
  }
  if (end >= totalRows.value) {
    start -= end - (totalRows.value - 1);
    end = totalRows.value - 1;
  }
  return {
    start: Math.max(0, start),
    end: Math.min(totalRows.value - 1, end),
  };
});

/** Flat list of all question indices that should be rendered */
const displayedIndices = computed(() => {
  const indices: number[] = [];
  const { start, end } = visibleRowRange.value;
  for (let row = start; row <= end; row++) {
    const rowStart = row * cols.value;
    const rowEnd = Math.min(rowStart + cols.value, props.total);
    for (let i = rowStart; i < rowEnd; i++) {
      indices.push(i);
    }
  }
  return indices;
});

function gridItemClass(status: string) {
  return statusStyles[status] ?? statusStyles.unanswered;
}

function scrollToCurrent() {
  if (!gridRef.value) return;
  const buttons = gridRef.value.querySelectorAll<HTMLElement>('button');
  const idx = displayedIndices.value.indexOf(props.currentIndex ?? 0);
  const target = buttons[idx];
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

watch(
  () => props.currentIndex,
  () => {
    if (!showAll.value) nextTick(scrollToCurrent);
  },
);

watch(showAll, () => {
  nextTick(scrollToCurrent);
});
</script>

<template>
  <aside
    class="h-fit select-none rounded-xl border border-default bg-default p-4 max-lg:order-first lg:sticky lg:top-20"
  >
    <div class="mb-3 flex items-center justify-between">
      <span class="text-sm font-medium text-highlighted">答题卡</span>
      <span class="text-xs text-muted">{{ total }} 题</span>
    </div>

    <div
      ref="gridRef"
      class="grid max-h-[200px] grid-cols-8 gap-1.5 overflow-y-auto overflow-x-hidden pr-1 sm:grid-cols-10 lg:max-h-[460px] lg:grid-cols-5 lg:gap-2"
    >
      <button
        v-for="i in displayedIndices"
        :key="i"
        type="button"
        class="flex h-9 min-w-0 cursor-pointer items-center justify-center rounded-md border text-xs font-medium leading-none transition-colors duration-150 lg:aspect-square lg:h-auto"
        :class="[
          gridItemClass(statuses[i]),
          i === currentIndex && props.shouldShowCurrent !== false
            ? 'ring-2 ring-primary ring-offset-1 ring-offset-default'
            : '',
        ]"
        @click="emit('select', i)"
      >
        {{ i + 1 }}
      </button>
    </div>

    <UButton
      variant="link"
      color="neutral"
      size="xs"
      class="mt-2 w-full justify-center text-muted"
      :label="showAll ? '收起' : `展开全部（${total} 题）`"
      @click="showAll = !showAll"
    />
  </aside>
</template>
