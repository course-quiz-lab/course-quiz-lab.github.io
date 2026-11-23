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
  <UBadge color="warning" variant="soft" size="md" class="tabular-nums">
    <UIcon name="i-lucide-timer" class="mr-1 size-3.5" />
    已用时 {{ formatted }}
  </UBadge>
</template>
