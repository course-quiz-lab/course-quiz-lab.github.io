<script setup lang="ts">
import {
  mdiBookOpenOutline,
  mdiChatOutline,
  mdiCogOutline,
  mdiGithub,
  mdiPlay,
} from '@mdi/js';
import { useRouter } from 'vue-router';
import AppIcon from '../components/ui/AppIcon.vue';

const router = useRouter();

interface ActionCard {
  key: string;
  icon: string;
  title: string;
  description: string;
  handler: () => void;
  visible?: boolean;
  primary?: boolean;
}

const actions: ActionCard[] = [
  {
    key: 'start',
    icon: mdiPlay,
    title: '开始练习',
    description: '从题库中选择练习模式，开始新的刷题之旅',
    handler: () => router.push('/banks'),
    primary: true,
  },
  {
    key: 'wrong-review',
    icon: mdiBookOpenOutline,
    title: '错题回顾',
    description: '查阅过往练习中的错题，集中复习巩固',
    handler: () => router.push('/wrong-review'),
  },
  {
    key: 'manage',
    icon: mdiCogOutline,
    title: '管理题库',
    description: '查看、删除或导出已有的题库',
    handler: () => router.push('/banks/manage'),
  },
  {
    key: 'feedback',
    icon: mdiChatOutline,
    title: '反馈与建议',
    description: '题目纠错、功能建议等',
    handler: () => {
      window.open(
        'https://github.com/course-quiz-lab/course-quiz-lab.github.io/issues',
        '_blank',
      );
    },
  },
];
</script>

<template>
  <div class="page">
    <!-- Hero section -->
    <section class="bg-surface rounded-2xl p-10 mb-4 max-sm:p-6">
      <h1 class="text-3xl mb-3 max-sm:text-2xl font-bold">
        低头是题海，抬头是未来。
      </h1>
      <p class="text-muted max-sm:text-sm">
        刷题小站支持导入多种格式题库，让刷题更清晰、更从容
      </p>
    </section>

    <!-- Action cards -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <button
        v-for="act in actions"
        :key="act.key"
        v-show="act.visible !== false"
        class="group flex flex-col items-start gap-2 max-sm:gap-1.5 bg-surface rounded-2xl p-6 max-sm:py-4 border border-[color:var(--border)] cursor-pointer transition-all duration-200 hover:-translate-y-1 text-left"
        @click="act.handler"
      >
        <span
          class="w-11 h-11 max-sm:w-9 max-sm:h-9 rounded-xl grid place-items-center shrink-0 transition-transform duration-200"
          :class="
            act.primary
              ? 'bg-brand text-white'
              : 'bg-surface-soft text-brand-strong border border-[color:var(--border)]'
          "
        >
          <AppIcon :path="act.icon" :size="24" />
        </span>
        <div>
          <div class="text-base max-sm:text-sm font-semibold">
            {{ act.title }}
          </div>
          <div class="text-sm max-sm:text-xs text-muted mt-1 max-sm:mt-0.5">
            {{ act.description }}
          </div>
        </div>
      </button>
    </section>

    <!-- Footer -->
    <footer
      class="flex items-center justify-center gap-2 pt-8 pb-4 text-sm text-muted"
    >
      <a
        href="https://github.com/course-quiz-lab/course-quiz-lab.github.io"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-muted hover:text-brand transition-colors duration-200 no-underline"
      >
        <AppIcon :path="mdiGithub" :size="18" />
        <span>GitHub</span>
      </a>
      <span class="text-[color:var(--border)] select-none">|</span>
      <span>刷题小站 版权所有</span>
    </footer>
  </div>
</template>
