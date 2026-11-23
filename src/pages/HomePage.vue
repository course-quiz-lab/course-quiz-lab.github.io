<script setup lang="ts">
interface ActionCard {
  key: string;
  icon: string;
  title: string;
  description: string;
  to: string;
  target?: string;
}

const actions: ActionCard[] = [
  {
    key: 'start',
    icon: 'i-lucide-play',
    title: '开始练习',
    description: '选择或创建试卷，开始新的刷题之旅',
    to: '/papers',
  },
  {
    key: 'wrong-review',
    icon: 'i-lucide-book-open',
    title: '错题本',
    description: '汇总所有试卷的错题，集中复习巩固',
    to: '/wrong-questions',
  },
  {
    key: 'import',
    icon: 'i-lucide-download',
    title: '导入题库',
    description: '支持 JSON、Excel、云端与链接导入',
    to: '/import',
  },
  {
    key: 'manage',
    icon: 'i-lucide-database',
    title: '管理题库',
    description: '查看、导出或删除已有的题库',
    to: '/banks/manage',
  },
  {
    key: 'feedback',
    icon: 'i-lucide-message-circle',
    title: '反馈与建议',
    description: '题目纠错、功能建议等，欢迎随时反馈',
    to: 'https://github.com/course-quiz-lab/course-quiz-lab.github.io/issues',
    target: '_blank',
  },
];

const steps = [
  {
    icon: 'i-lucide-download',
    title: '导入题库',
    description: '从 JSON、Excel、链接或云端导入，自动校验格式。',
  },
  {
    icon: 'i-lucide-file-text',
    title: '生成试卷',
    description: '按题型与数量自由组卷，支持打乱选项与限时考试。',
  },
  {
    icon: 'i-lucide-book-open',
    title: '刷题回顾',
    description: '练习或考试模式作答，结束后查看解析与错题统计。',
  },
];
</script>

<template>
  <div class="space-y-16 lg:space-y-20">
    <section
      class="relative overflow-hidden rounded-2xl border border-default bg-elevated px-6 py-14 sm:px-10 sm:py-20"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div class="relative max-w-2xl">
        <UBadge color="primary" variant="soft" icon="i-lucide-sparkles">
          本地优先 · 无需登录
        </UBadge>

        <h1
          class="mt-5 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl"
        >
          低头是题海，<br class="sm:hidden" />抬头是未来。
        </h1>
        <p class="mt-4 text-base text-muted sm:text-lg">
          刷题小站支持导入多种格式题库，让刷题更清晰、更从容。
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <UButton
            to="/papers"
            size="lg"
            icon="i-lucide-play"
            label="开始练习"
          />
          <UButton
            to="/import"
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-lucide-download"
            label="导入题库"
          />
        </div>

        <div
          class="mt-10 grid grid-cols-3 gap-4 border-t border-default pt-6 text-sm"
        >
          <div>
            <p class="text-lg font-semibold text-highlighted">4+</p>
            <p class="mt-0.5 text-muted">种导入方式</p>
          </div>
          <div>
            <p class="text-lg font-semibold text-highlighted">2</p>
            <p class="mt-0.5 text-muted">种答题模式</p>
          </div>
          <div>
            <p class="text-lg font-semibold text-highlighted">100%</p>
            <p class="mt-0.5 text-muted">数据本地保存</p>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-6">
      <div>
        <h2 class="text-xl font-semibold text-highlighted">常用功能</h2>
        <p class="mt-1 text-sm text-muted">从这里快速进入常用入口</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UPageCard
          v-for="act in actions"
          :key="act.key"
          :icon="act.icon"
          :title="act.title"
          :description="act.description"
          :to="act.to"
          :target="act.target"
          variant="outline"
          spotlight
          :ui="{
            root: 'transition duration-200 hover:-translate-y-0.5 hover:border-primary/40',
          }"
        />
      </div>
    </section>

    <section class="space-y-6">
      <div>
        <h2 class="text-xl font-semibold text-highlighted">三步开始刷题</h2>
        <p class="mt-1 text-sm text-muted">导入一次，随时练习</p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div
          v-for="(step, index) in steps"
          :key="step.title"
          class="rounded-xl border border-default bg-default p-6"
        >
          <div class="flex items-center gap-3">
            <span
              class="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"
            >
              <UIcon :name="step.icon" class="size-5" />
            </span>
            <span class="text-sm font-medium text-dimmed">
              0{{ index + 1 }}
            </span>
          </div>
          <h3 class="mt-4 text-base font-semibold text-highlighted">
            {{ step.title }}
          </h3>
          <p class="mt-1.5 text-sm text-muted">{{ step.description }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
