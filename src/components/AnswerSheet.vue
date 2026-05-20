<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = withDefaults(
  defineProps<{
    total: number;
    statuses: string[];
    currentIndex?: number;
    visibleStart?: number;
    visibleEnd?: number;
  }>(),
  {
    visibleStart: 0,
    visibleEnd: 0,
  },
);

const emit = defineEmits<{ (e: 'select', index: number): void }>();

const gridRef = ref<HTMLElement | null>(null);

const statusStyles: Record<string, string> = {
  correct: '!border-[rgba(47,133,90,0.6)] !bg-[rgba(47,133,90,0.12)]',
  partial: '!border-[rgba(226,181,109,0.8)] !bg-[rgba(226,181,109,0.18)]',
  wrong: '!border-[rgba(185,74,60,0.6)] !bg-[rgba(185,74,60,0.1)]',
  unanswered: '',
  answered: '!border-[rgba(47,111,107,0.4)] !bg-[rgba(47,111,107,0.08)]',
};

function gridItemClass(status: string) {
  return statusStyles[status] ?? '';
}

function scrollToVisible() {
  if (!gridRef.value) return;
  const buttons = gridRef.value.querySelectorAll<HTMLElement>('button');
  const target = buttons[props.visibleStart];
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

watch(
  () => [props.visibleStart, props.visibleEnd],
  () => {
    nextTick(scrollToVisible);
  },
  { immediate: true },
);
</script>

<template>
  <aside
    class="sticky top-[100px] p-4 rounded-2xl bg-surface border border-[rgba(43,34,24,0.12)] self-start max-lg:!static max-lg:order-first"
  >
    <div class="text-sm mb-[12px] text-muted">答题卡</div>
    <div
      ref="gridRef"
      class="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-5 gap-[12px] max-sm:gap-2 max-h-[200px] lg:max-h-[460px] overflow-y-auto overflow-x-hidden"
    >
      <button
        v-for="index in total"
        :key="index"
        class="border border-[rgba(43,34,24,0.12)] bg-surface-grid rounded-[8px] px-1 py-1.5 text-[11px] leading-none cursor-pointer transition-all duration-200 min-w-0"
        :class="[gridItemClass(statuses[index - 1])]"
        @click="emit('select', index - 1)"
      >
        {{ index }}
      </button>
    </div>
  </aside>
</template>
