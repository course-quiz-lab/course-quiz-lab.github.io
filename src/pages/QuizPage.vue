<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import type { Mode } from '../types/quiz';
import {
  mdiCardTextOutline,
  mdiFileDocumentMultipleOutline,
  mdiClipboardTextOutline,
  mdiCheckCircleOutline,
  mdiBroom,
} from '@mdi/js';
import FullPaperView from '../components/FullPaperView.vue';
import SingleQuestionView from '../components/SingleQuestionView.vue';
import AppButton from '../components/ui/AppButton.vue';
import TimerChip from '../components/TimerChip.vue';

const bankStore = useBankStore();
const attemptStore = useAttemptStore();
const router = useRouter();
const route = useRoute();

const bank = computed(() => bankStore.bank);
const attempt = computed(() => attemptStore.attempt);

const mode = computed<Mode>(() =>
  route.params.mode === 'exam' ? 'exam' : 'practice',
);
const isExam = computed(() => mode.value === 'exam');

const answeredCount = computed(() => {
  if (!bank.value || !attempt.value) return 0;
  return bank.value.questions.filter((question) => {
    const length = attempt.value?.answers[question.id]?.selected.length ?? 0;
    return length > 0;
  }).length;
});

const unansweredCount = computed(() => {
  if (!bank.value || !attempt.value) return 0;
  return bank.value.questions.filter((question) => {
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

async function ensureAttempt(nextMode: Mode) {
  if (!bankStore.bank || !bankStore.bankId) {
    await router.replace('/import');
    return;
  }
  const loaded = await attemptStore.loadSavedAttempt(
    bankStore.bankId,
    nextMode,
  );
  if (!loaded) {
    await attemptStore.startAttempt(
      bankStore.bankId,
      nextMode,
      bankStore.bank.questions,
    );
  }
}

watch(
  () => route.name,
  async () => {
    await ensureAttempt(mode.value);
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
  await router.push('/review');
}

async function resetProgress() {
  if (!bankStore.bank || !bankStore.bankId) return;
  const label = isExam.value ? '考试' : '练习';
  if (!confirm(`确认清空${label}进度？`)) return;
  await attemptStore.resetAttempt(
    bankStore.bankId,
    mode.value,
    bankStore.bank.questions,
  );
}

function toggleView() {
  if (!attempt.value) return;
  const next = attempt.value.view === 'paper' ? 'single' : 'paper';
  attemptStore.setView(next);
}
</script>

<template>
  <div v-if="bank && attempt" class="page">
    <section
      class="flex items-end justify-between gap-[26px] max-sm:flex-col max-sm:items-start"
    >
      <div>
        <div
          class="text-2xl font-['Noto_Serif_SC','Source_Han_Serif_SC','Songti_SC','PingFang_SC','Microsoft_YaHei',serif]"
        >
          {{ isExam ? '考试模式' : '练习模式' }}
        </div>
        <div class="text-muted text-sm" v-if="isExam">
          {{ bank.meta.course?.name ?? '未命名课程' }} · 未作答
          {{ unansweredCount }} 题
        </div>
        <div class="text-muted text-sm" v-else>
          {{ bank.meta.course?.name ?? '未命名课程' }} · 已作答
          {{ answeredCount }} /
          {{ bank.questions.length }}
        </div>
      </div>
      <div class="flex flex-wrap gap-[12px]">
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
          @click="router.push('/review')"
          :icon-path="mdiClipboardTextOutline"
        >
          查看回顾
        </AppButton>
        <AppButton v-if="isExam" @click="submitExam" :icon-path="mdiCheckCircleOutline">
          交卷
        </AppButton>
        <AppButton variant="ghost" @click="resetProgress" :icon-path="mdiBroom">
          清空进度
        </AppButton>
      </div>
    </section>
    <SingleQuestionView v-if="attempt.view === 'single'" />
    <FullPaperView v-else />
  </div>
</template>
