<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useBankStore } from '../stores/bank';
import { mdiArrowLeft, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js';
import AppButton from './ui/AppButton.vue';
import AppIcon from './ui/AppIcon.vue';

const route = useRoute();
const bankStore = useBankStore();

const theme = ref<'light' | 'dark'>('light');
const THEME_KEY = 'quiz-theme';

const bankTitle = computed(
  () => bankStore.bank?.meta.course?.name ?? '未导入题库',
);
const bankCount = computed(() => bankStore.bank?.questions.length ?? 0);
const isHome = computed(() => route.name === 'home');
const themeLabel = computed(() => (theme.value === 'dark' ? '浅色' : '深色'));

function applyTheme(next: 'light' | 'dark') {
  theme.value = next;
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark');
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
            @click="toggleTheme"
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
          @click="toggleTheme"
          :title="themeLabel + '模式'"
        >
          <AppIcon
            :path="theme === 'dark' ? mdiWeatherSunny : mdiWeatherNight"
            :size="18"
          />
        </AppButton>

        <div
          class="px-3 py-1.5 rounded-[12px] bg-surface-soft border border-[color:var(--border)] text-right max-sm:text-left"
        >
          <div class="text-sm">{{ bankTitle }}</div>
          <div class="text-xs text-muted">共 {{ bankCount }} 题</div>
        </div>
      </div>
    </div>
    <main>
      <slot />
    </main>
  </div>
</template>
