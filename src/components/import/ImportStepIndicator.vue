<script setup lang="ts">
/**
 * 保留自定义实现：UStepper 默认将标题放在指示器下方，并内置前进/后退语义，
 * 无法复现当前“数字 + 文案同行、连接线撑满、仅允许回到已完成步骤”的紧凑布局。
 */
import { useRouter } from 'vue-router';

const props = defineProps<{
  currentStep: 1 | 2 | 3;
}>();

const router = useRouter();

const steps = [
  { step: 1, label: '选择方式' },
  { step: 2, label: '输入内容' },
  { step: 3, label: '预览与确认' },
];

function getRoute(step: number): string {
  switch (step) {
    case 1:
      return '/import/select';
    case 3:
      return '/import/preview';
    default:
      return '';
  }
}

function navigate(step: number) {
  if (step >= props.currentStep) return;
  const route = getRoute(step);
  if (route) {
    router.push(route);
  }
}
</script>

<template>
  <div class="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
    <template v-for="(s, idx) in steps" :key="s.step">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-full py-1 transition-colors"
        :class="[
          currentStep === s.step ? 'font-medium text-primary' : 'text-muted',
          s.step < currentStep
            ? 'cursor-pointer hover:text-primary'
            : 'cursor-default',
        ]"
        :disabled="s.step >= currentStep"
        @click="navigate(s.step)"
      >
        <span
          class="grid size-5 place-items-center rounded-full text-xs font-semibold sm:size-6"
          :class="
            currentStep === s.step
              ? 'bg-primary text-white'
              : s.step < currentStep
                ? 'bg-primary/10 text-primary'
                : 'bg-elevated text-muted'
          "
        >
          {{ s.step }}
        </span>
        <span class="hidden sm:inline">{{ s.label }}</span>
      </button>
      <div v-if="idx < steps.length - 1" class="h-px flex-1 bg-accented" />
    </template>
  </div>
</template>
