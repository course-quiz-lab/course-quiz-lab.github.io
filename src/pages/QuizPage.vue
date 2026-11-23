<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import FullPaperView from '../components/FullPaperView.vue';
import SingleQuestionView from '../components/SingleQuestionView.vue';
import TimerChip from '../components/TimerChip.vue';
import { useImmersiveMode } from '../composables/useImmersiveMode';
import { useAttemptStore } from '../stores/attempt';
import { usePaperStore } from '../stores/paper';
import { evaluateStatus } from '../utils/scoring';

const paperStore = usePaperStore();
const attemptStore = useAttemptStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const { isImmersive, enterImmersive, exitImmersive, resetImmersive } =
  useImmersiveMode();

const paper = computed(() => paperStore.paper);
const attempt = computed(() => attemptStore.attempt);

const isExam = computed(() => attempt.value?.mode === 'exam');

const answeredCount = computed(() => {
  if (!paper.value || !attempt.value) return 0;
  return paper.value.questions.filter((question) => {
    const length = attempt.value?.answers[question.id]?.selected.length ?? 0;
    return length > 0;
  }).length;
});

const unansweredCount = computed(() => {
  if (!paper.value || !attempt.value) return 0;
  return paper.value.questions.filter((question) => {
    return attempt.value?.answers[question.id]?.selected.length === 0;
  }).length;
});

const progressPercent = computed(() => {
  const total = paper.value?.questions.length ?? 0;
  if (!total) return 0;
  return Math.round((answeredCount.value / total) * 100);
});

/** 已提交（真正做过并判分）的题目数，用于练习模式正确率分母 */
const gradedCount = computed(() => {
  if (!paper.value || !attempt.value) return 0;
  return paper.value.questions.filter(
    (question) => attempt.value?.answers[question.id]?.submitted,
  ).length;
});

/** 练习模式正确题数：多选少选（partial）不计入正确 */
const correctCount = computed(() => {
  if (!paper.value || !attempt.value) return 0;
  return paper.value.questions.filter((question) => {
    const entry = attempt.value?.answers[question.id];
    if (!entry?.submitted) return false;
    return evaluateStatus(question, entry.selected) === 'correct';
  }).length;
});

const accuracyText = computed(() => {
  if (gradedCount.value === 0) return '—';
  const percent = Math.round((correctCount.value / gradedCount.value) * 100);
  return `${percent}%`;
});

const viewToggleLabel = computed(() =>
  attempt.value?.view === 'paper' ? '单题视图' : '整卷视图',
);
const viewToggleIcon = computed(() =>
  attempt.value?.view === 'paper' ? 'i-lucide-file-text' : 'i-lucide-files',
);

async function ensureAttempt() {
  const paperId = route.params.paperId as string;
  const attemptId = route.params.attemptId as string;

  if (!paperId || !attemptId) {
    await router.replace('/papers');
    return;
  }

  if (!paperStore.paper || paperStore.paper.id !== paperId) {
    const loadedPaper = await paperStore.loadPaper(paperId);
    if (!loadedPaper) {
      await router.replace('/papers');
      return;
    }
  }

  if (!attemptStore.attempt || attemptStore.attempt.id !== attemptId) {
    const loadedAttempt = await attemptStore.loadSavedAttempt(attemptId);
    if (!loadedAttempt) {
      await router.replace('/papers');
      return;
    }
  }
}

watch(
  () => [route.params.paperId, route.params.attemptId],
  async () => {
    if (route.name === 'quiz') {
      await ensureAttempt();
    }
  },
  { immediate: true },
);

async function submitExam() {
  if (!attempt.value) return;
  if (unansweredCount.value > 0) {
    const ok = confirm(`还有 ${unansweredCount.value} 题未作答，确定交卷吗？`);
    if (!ok) return;
  }
  await attemptStore.submitExam();
  await router.push(`/review/${paper.value?.id}/attempt/${attempt.value?.id}`);
}

async function startNewAttempt() {
  if (!paper.value) return;
  const label = isExam.value ? '考试' : '练习';
  if (!confirm(`确认重新生成一次${label}作答？这不会覆盖您之前的作答记录。`))
    return;
  const newAttemptId = await attemptStore.resetAttempt(
    paper.value.id,
    attempt.value!.mode,
    paper.value.questions,
  );
  await router.push(`/quiz/${paper.value.id}/attempt/${newAttemptId}`);
}

/** 工具条按钮点击后焦点会停留在按钮上，此时空格 / Enter 会再次触发按钮，
 *  因此把焦点交回答题区域，保证快捷键提交始终指向当前题目。 */
async function focusQuizArea() {
  await nextTick();
  document
    .querySelector<HTMLElement>('[data-quiz-focus-target]')
    ?.focus({ preventScroll: true });
}

async function toggleView() {
  if (!attempt.value) return;
  const next = attempt.value.view === 'paper' ? 'single' : 'paper';
  await attemptStore.setView(next);
  await focusQuizArea();
}

/** 仅 lg 及以上吸顶（窄屏吸顶会遮挡题目内容）；
 *  沉浸模式下站点导航被隐藏，工具条需要贴到视口顶部 */
const toolbarStickyClass = computed(() =>
  isImmersive.value ? 'lg:top-0' : 'lg:top-16',
);

async function toggleImmersiveMode() {
  if (isImmersive.value) {
    await exitImmersive();
    toast.add({
      title: '已退出沉浸模式',
      description: '导航栏与页脚已恢复',
      icon: 'i-lucide-minimize',
      color: 'neutral',
      duration: 2500,
    });
    await focusQuizArea();
    return;
  }

  await enterImmersive();
  toast.add({
    title: '已进入沉浸模式',
    description: '导航栏与页脚已隐藏，按 Esc 或点击「退出沉浸」即可返回',
    icon: 'i-lucide-maximize',
    color: 'neutral',
    duration: 4000,
  });
  await focusQuizArea();
}

// 离开答题页（交卷、切换试卷、返回首页）时恢复常规布局，滚动由路由接管
onBeforeUnmount(() => {
  void resetImmersive();
});
</script>

<template>
  <div v-if="paper && attempt" class="page">
    <section
      class="space-y-3 rounded-xl border border-default bg-default p-3 sm:p-4 lg:sticky lg:z-30 lg:bg-default/85 lg:backdrop-blur-sm"
      :class="toolbarStickyClass"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <UBadge
            :color="isExam ? 'warning' : 'primary'"
            variant="soft"
            :icon="isExam ? 'i-lucide-square-pen' : 'i-lucide-play'"
          >
            {{ isExam ? '考试模式' : '练习模式' }}
          </UBadge>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-highlighted">
              {{ paper.title }}
            </p>
            <p class="text-xs text-muted">
              <template v-if="isExam">
                未作答 {{ unansweredCount }} 题 · 共
                {{ paper.questions.length }} 题
              </template>
              <template v-else>
                已作答 {{ answeredCount }} / {{ paper.questions.length }}
              </template>
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <TimerChip
            v-if="isExam"
            :start-at="attempt.startedAt"
            :end-at="attempt.submittedAt"
          />
          <UTooltip
            :text="
              isImmersive
                ? '退出沉浸模式并恢复导航与页脚（Esc）'
                : '沉浸模式：隐藏导航与页脚并进入全屏'
            "
          >
            <UButton
              :variant="isImmersive ? 'solid' : 'outline'"
              :color="isImmersive ? 'primary' : 'neutral'"
              size="sm"
              :icon="isImmersive ? 'i-lucide-minimize' : 'i-lucide-maximize'"
              :label="isImmersive ? '退出沉浸' : '沉浸模式'"
              :aria-pressed="isImmersive"
              @click="toggleImmersiveMode"
            />
          </UTooltip>
          <UButton
            variant="outline"
            color="neutral"
            size="sm"
            :icon="viewToggleIcon"
            :label="viewToggleLabel"
            @click="toggleView"
          />
          <UButton
            v-if="!isExam"
            variant="outline"
            color="neutral"
            size="sm"
            icon="i-lucide-clipboard-list"
            label="查看小结"
            @click="router.push(`/review/${paper.id}/attempt/${attempt.id}`)"
          />
          <UButton
            v-if="isExam"
            size="sm"
            icon="i-lucide-circle-check"
            label="交卷"
            @click="submitExam"
          />
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-refresh-cw"
            label="再做一次"
            @click="startNewAttempt"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <UProgress
          :model-value="progressPercent"
          size="sm"
          class="min-w-40 flex-1"
        />
        <span class="shrink-0 text-xs tabular-nums text-muted">
          {{ answeredCount }} / {{ paper.questions.length }}
        </span>

        <span v-if="!isExam" class="shrink-0 text-xs tabular-nums text-muted">
          |
        </span>

        <span v-if="!isExam" class="shrink-0 text-xs tabular-nums text-muted">
          正确率
          <span class="font-medium">{{ accuracyText }}</span>
        </span>
      </div>
    </section>

    <SingleQuestionView v-if="attempt.view === 'single'" />
    <FullPaperView v-else />
  </div>
</template>
