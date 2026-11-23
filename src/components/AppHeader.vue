<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTheme } from '../composables/useTheme';
import ThemePicker from './ThemePicker.vue';

const { isDark, toggleDark } = useTheme();

const route = useRoute();
const isMenuOpen = ref(false);

// 路由切换后自动收起移动端菜单
watch(
  () => route.fullPath,
  () => {
    isMenuOpen.value = false;
  },
);

const links = [
  { label: '首页', icon: 'i-lucide-house', to: '/' },
  { label: '开始练习', icon: 'i-lucide-play', to: '/papers' },
  { label: '导入题库', icon: 'i-lucide-download', to: '/import' },
  { label: '错题本', icon: 'i-lucide-book-open', to: '/wrong-questions' },
  { label: '题库管理', icon: 'i-lucide-database', to: '/banks/manage' },
];
</script>

<template>
  <!-- 标题槽默认 items-end（原始两行 logo 的排版），现在只有单行文字，
       需要改为垂直居中对齐，否则文字会贴到徽标底部 -->
  <UHeader title="刷题小站" to="/" :ui="{ title: 'items-center' }">
    <template #title>
      <span
        class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-white shadow-sm"
      >
        Q
      </span>
      <span class="text-sm font-semibold text-highlighted">刷题小站</span>
    </template>

    <UNavigationMenu :items="links" variant="link" />

    <template #right>
      <ThemePicker />
      <UTooltip :text="isDark ? '切换到浅色' : '切换到深色'">
        <UButton
          color="neutral"
          variant="ghost"
          :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
          square
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleDark"
        />
      </UTooltip>
    </template>

    <!-- 移动端菜单：UHeader 默认用全屏 Modal 承载菜单，而 Nuxt UI 弹层本身不设 z-index，
         答题页吸顶工具条(z-30)会浮在菜单上方挡住点击。这里改用 Popover：自带缩放动画、
         轻量不遮页面；弹层层级由 vite.config.ts 的 ui 覆盖统一抬到 z-50 -->
    <template #toggle>
      <UPopover
        v-model:open="isMenuOpen"
        :content="{ align: 'end', sideOffset: 8 }"
        :ui="{ content: 'w-60 p-2' }"
        class="lg:hidden"
      >
        <UButton
          color="neutral"
          variant="ghost"
          :icon="isMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
          square
          :aria-label="isMenuOpen ? '关闭导航菜单' : '打开导航菜单'"
          :aria-expanded="isMenuOpen"
        />

        <template #content>
          <div @click="isMenuOpen = false">
            <UNavigationMenu
              :items="links"
              orientation="vertical"
              variant="link"
              class="w-full"
            />
          </div>
        </template>
      </UPopover>
    </template>
  </UHeader>
</template>
