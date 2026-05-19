<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{ startAt: number; endAt?: number }>();

const now = ref(Date.now());
let timer: number | null = null;

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});

const elapsed = computed(() => {
  const end = props.endAt ?? now.value;
  return Math.max(end - props.startAt, 0);
});

const formatted = computed(() => {
  const totalSeconds = Math.floor(elapsed.value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}时${String(minutes).padStart(2, '0')}分${String(seconds).padStart(2, '0')}秒`;
  }
  return `${minutes}分${String(seconds).padStart(2, '0')}秒`;
});
</script>

<template>
  <span
    class="px-3.5 py-2 rounded-full bg-surface-soft border border-[rgba(43,34,24,0.12)] text-sm"
    >已用时 {{ formatted }}</span
  >
</template>
