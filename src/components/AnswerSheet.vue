<script setup lang="ts">
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
const cols = ref(5); // default 5 cols

const statusStyles: Record<string, string> = {
  correct: '!border-[rgba(47,133,90,0.6)] !bg-[rgba(47,133,90,0.12)]',
  partial: '!border-[rgba(226,181,109,0.8)] !bg-[rgba(226,181,109,0.18)]',
  wrong: '!border-[rgba(185,74,60,0.6)] !bg-[rgba(185,74,60,0.1)]',
  unanswered: '',
  answered: '!border-[rgba(47,111,107,0.4)] !bg-[rgba(47,111,107,0.08)]',
};

function updateCols() {
  const w = window.innerWidth;
  if (w >= 768 && w < 1024)
    cols.value = 10; // md
  else cols.value = 5; // default / lg
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
  return statusStyles[status] ?? '';
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
    class="sticky top-[100px] p-4 rounded-2xl bg-surface border border-[rgba(43,34,24,0.12)] self-start max-lg:!static max-lg:order-first select-none"
  >
    <div class="text-sm mb-[12px] text-muted">答题卡</div>
    <div
      ref="gridRef"
      class="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-5 gap-[12px] max-sm:gap-2 max-h-[200px] lg:max-h-[460px] overflow-y-auto overflow-x-hidden pr-2"
    >
      <button
        v-for="i in displayedIndices"
        :key="i"
        class="border border-[rgba(43,34,24,0.12)] bg-surface-grid rounded-[8px] px-1 py-1.5 text-[11px] leading-none cursor-pointer transition-all duration-200 min-w-0"
        :class="[
          gridItemClass(statuses[i]),
          i === currentIndex && props.shouldShowCurrent !== false
            ? 'ring-1 ring-inset ring-[color:var(--brand)]'
            : '',
        ]"
        @click="emit('select', i)"
      >
        {{ i + 1 }}
      </button>
    </div>
    <button
      class="mt-3 w-full text-xs text-muted hover:text-brand border-none bg-transparent cursor-pointer transition-colors py-1"
      @click="showAll = !showAll"
    >
      {{ showAll ? '收起' : `展开全部 (${total} 题)` }}
    </button>
  </aside>
</template>
