<script setup lang="ts">
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
  <div
    class="flex items-center gap-1.5 sm:gap-2 mb-5 sm:mb-6 text-xs sm:text-sm"
  >
    <template v-for="(s, idx) in steps" :key="s.step">
      <button
        class="flex items-center gap-1 border-none bg-transparent transition-opacity"
        :class="[
          currentStep === s.step ? 'text-brand font-semibold' : 'text-muted',
          s.step < currentStep
            ? 'cursor-pointer hover:opacity-70'
            : 'cursor-default',
        ]"
        :disabled="s.step >= currentStep"
        @click="navigate(s.step)"
      >
        <span
          class="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[9px] sm:text-[11px] font-bold"
          :class="
            currentStep === s.step ? 'bg-brand text-white' : 'bg-surface-soft'
          "
        >
          {{ s.step }}
        </span>
        <span class="hidden sm:inline">{{ s.label }}</span>
      </button>
      <div
        v-if="idx < steps.length - 1"
        class="flex-1 h-px bg-[color:var(--border)]"
      />
    </template>
  </div>
</template>
