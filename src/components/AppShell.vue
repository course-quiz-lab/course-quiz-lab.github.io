<script setup lang="ts">
import { mdiArrowLeft, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from './ui/AppButton.vue';
import AppIcon from './ui/AppIcon.vue';

const route = useRoute();
const router = useRouter();

const theme = ref<'light' | 'dark'>('light');
const THEME_KEY = 'quiz-theme';

const isHome = computed(() => route.name === 'home');
const themeLabel = computed(() => (theme.value === 'dark' ? '浅色' : '深色'));

function goBack() {
  const back = route.meta?.back as string | undefined;
  if (back) {
    router.push(back);
  } else {
    router.back();
  }
}

function applyTheme(next: 'light' | 'dark') {
  theme.value = next;
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}

const enableTransitions = () =>
  'startViewTransition' in document &&
  window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

async function toggleTheme(e: MouseEvent) {
  const next = theme.value === 'dark' ? 'light' : 'dark';

  if (!enableTransitions()) {
    applyTheme(next);
    return;
  }

  const { clientX: x, clientY: y } = e;
  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    )}px at ${x}px ${y}px)`,
  ];

  await document.startViewTransition(async () => {
    applyTheme(next);
    await (await import('vue')).nextTick();
  }).ready;

  document.documentElement.animate(
    { clipPath: theme.value === 'dark' ? clipPath.reverse() : clipPath },
    {
      duration: 300,
      easing: 'ease-in',
      fill: 'forwards',
      pseudoElement: `::view-transition-${theme.value === 'dark' ? 'old' : 'new'}(root)`,
    },
  );
}

onMounted(() => {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    applyTheme(stored);
    return;
  }
  const prefersDark = window.matchMedia?.(
    '(prefers-color-scheme: dark)',
  )?.matches;
  applyTheme(prefersDark ? 'dark' : 'light');
});
</script>

<template>
  <div
    class="max-w-[1300px] mx-auto px-6 pb-[60px] pt-6 max-sm:px-4 max-sm:pb-6 max-sm:pt-4"
  >
    <header
      v-if="isHome"
      class="px-5 py-3 mb-5 rounded-[16px] bg-surface max-lg:px-4 max-lg:py-3 max-sm:px-4 max-sm:py-2"
    >
      <div class="flex ms:flex-col flex-wrap justify-between py-3">
        <div class="flex items-center gap-[12px]">
          <div
            class="w-9 h-9 rounded-[12px] grid place-items-center bg-gradient-to-br from-[#2f6f6b] to-[#4ba59f] text-white font-bold text-lg"
          >
            Q
          </div>
          <div>
            <div>刷题小站</div>
            <div class="text-xs text-muted">练习 · 考试 · 回顾</div>
          </div>
        </div>
        <div class="flex items-center gap-3 justify-end max-sm:justify-between">
          <AppButton
            variant="ghost"
            class="px-2 py-1 text-sm"
            @click="toggleTheme($event)"
            :title="themeLabel + '模式'"
          >
            <AppIcon
              :path="theme === 'dark' ? mdiWeatherSunny : mdiWeatherNight"
              :size="18"
            />
          </AppButton>
        </div>
      </div>
    </header>
    <div v-else class="flex items-center justify-between mb-5">
      <AppButton
        v-if="route.name !== 'quiz'"
        @click="goBack"
        variant="ghost"
        class="px-3 py-2 text-sm flex items-center gap-2"
        :icon-path="mdiArrowLeft"
      >
        返回上页
      </AppButton>

      <AppButton
        v-else
        to="/"
        variant="ghost"
        class="px-3 py-2 text-sm flex items-center gap-2"
        :icon-path="mdiArrowLeft"
      >
        返回主页
      </AppButton>

      <div class="flex items-center gap-3">
        <AppButton
          variant="ghost"
          class="px-2 py-1 text-sm"
          @click="toggleTheme($event)"
          :title="themeLabel + '模式'"
        >
          <AppIcon
            :path="theme === 'dark' ? mdiWeatherSunny : mdiWeatherNight"
            :size="18"
          />
        </AppButton>
      </div>
    </div>
    <main>
      <slot />
    </main>
  </div>
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root),
html[data-theme='dark']::view-transition-new(root) {
  z-index: 1;
}

::view-transition-new(root),
html[data-theme='dark']::view-transition-old(root) {
  z-index: 9999;
}
</style>
