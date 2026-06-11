<script setup lang="ts">
import {
  mdiBroom,
  mdiCardTextOutline,
  mdiCheckCircleOutline,
  mdiClipboardTextOutline,
  mdiFileDocumentMultipleOutline,
} from '@mdi/js';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import FullPaperView from '../components/FullPaperView.vue';
import SingleQuestionView from '../components/SingleQuestionView.vue';
import TimerChip from '../components/TimerChip.vue';
import AppButton from '../components/ui/AppButton.vue';
import { useAttemptStore } from '../stores/attempt';
import { usePaperStore } from '../stores/paper';

const paperStore = usePaperStore();
const attemptStore = useAttemptStore();
const router = useRouter();
const route = useRoute();

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

const viewToggleLabel = computed(() =>
  attempt.value?.view === 'paper' ? '单题视图' : '整卷视图',
);
const viewToggleIcon = computed(() =>
  attempt.value?.view === 'paper'
    ? mdiCardTextOutline
    : mdiFileDocumentMultipleOutline,
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
  await router.push(
    `/review/${paper.value?.id}/attempt/${attempt.value?.id}`,
  );
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

function toggleView() {
  if (!attempt.value) return;
  const next = attempt.value.view === 'paper' ? 'single' : 'paper';
  attemptStore.setView(next);
}
</script>

<template>
  <div v-if="paper && attempt" class="page">
    <section
      class="flex items-end justify-between gap-[26px] max-sm:flex-col max-sm:items-start"
    >
      <div>
        <div class="text-2xl">
          {{ isExam ? '考试模式' : '练习模式' }}
        </div>
        <div class="text-muted text-sm" v-if="isExam">
          {{ paper.title }} · 未作答 {{ unansweredCount }} 题
        </div>
        <div class="text-muted text-sm" v-else>
          {{ paper.title }} · 已作答 {{ answeredCount }} /
          {{ paper.questions.length }}
        </div>
      </div>
      <div class="flex flex-wrap gap-[8px] sm:gap-[12px]">
        <TimerChip
          v-if="isExam"
          :startAt="attempt.startedAt"
          :endAt="attempt.submittedAt"
        />
        <AppButton
          variant="ghost"
          @click="toggleView"
          :icon-path="viewToggleIcon"
        >
          {{ viewToggleLabel }}
        </AppButton>
        <AppButton
          v-if="!isExam"
          variant="ghost"
          @click="
            router.push(`/review/${paper.id}/attempt/${attempt.id}`)
          "
          :icon-path="mdiClipboardTextOutline"
        >
          查看小结
        </AppButton>
        <AppButton
          v-if="isExam"
          @click="submitExam"
          :icon-path="mdiCheckCircleOutline"
        >
          交卷
        </AppButton>
        <AppButton
          variant="ghost"
          @click="startNewAttempt"
          :icon-path="mdiBroom"
        >
          再做一次
        </AppButton>
      </div>
    </section>

    <SingleQuestionView v-if="attempt.view === 'single'" />
    <FullPaperView v-else />
  </div>
</template>
