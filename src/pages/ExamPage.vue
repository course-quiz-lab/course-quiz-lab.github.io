<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAttemptStore } from '../stores/attempt';
import { useBankStore } from '../stores/bank';
import {
  mdiCardTextOutline,
  mdiFileDocumentMultipleOutline,
  mdiCheckCircleOutline,
  mdiBroom,
} from '@mdi/js';
import AppButton from '../components/ui/AppButton.vue';
import FullPaperView from '../components/FullPaperView.vue';
import SingleQuestionView from '../components/SingleQuestionView.vue';
import TimerChip from '../components/TimerChip.vue';

const bankStore = useBankStore();
const attemptStore = useAttemptStore();
const router = useRouter();

const bank = computed(() => bankStore.bank);
const attempt = computed(() => attemptStore.attempt);

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

onMounted(async () => {
  if (!bankStore.bank || !bankStore.bankId) {
    await router.replace('/import');
    return;
  }
  const loaded = await attemptStore.loadSavedAttempt(bankStore.bankId, 'exam');
  if (!loaded) {
    await attemptStore.startAttempt(
      bankStore.bankId,
      'exam',
      bankStore.bank.questions,
    );
  }
});

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
  if (!confirm('确认清空考试进度？')) return;
  await attemptStore.resetAttempt(
    bankStore.bankId,
    'exam',
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
          考试模式
        </div>
        <div class="text-muted text-sm">
          {{ bank.meta.title }} · 未作答 {{ unansweredCount }} 题
        </div>
      </div>
      <div class="flex flex-wrap gap-[12px]">
        <TimerChip :startAt="attempt.startedAt" :endAt="attempt.submittedAt" />
        <AppButton variant="ghost" @click="toggleView" :icon-path="viewToggleIcon">
          {{ viewToggleLabel }}
        </AppButton>
        <AppButton @click="submitExam" :icon-path="mdiCheckCircleOutline">
          交卷
        </AppButton>
        <AppButton
          variant="ghost"
          @click="resetProgress"
          :icon-path="mdiBroom"
        >
          清空进度
        </AppButton>
      </div>
    </section>
    <SingleQuestionView v-if="attempt.view === 'single'" />
    <FullPaperView v-else />
  </div>
</template>
