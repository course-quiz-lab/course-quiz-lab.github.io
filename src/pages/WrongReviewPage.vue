<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import StatusPill from '../components/StatusPill.vue';
import Pagination from '../components/ui/Pagination.vue';
import type { BankMetaEntry, QuestionItem, QuestionType } from '../types/quiz';
import {
  listAttemptBankIds,
  listBankMetas,
  loadAttempt,
  loadBank,
} from '../utils/idb';
import { evaluateStatus } from '../utils/scoring';

const PAGE_SIZE = 10;

const bankMetas = ref<BankMetaEntry[]>([]);
const selectedIds = ref<Set<string>>(new Set());
const isLoading = ref(true);
const attemptedBankIds = ref<Set<string>>(new Set());

onMounted(async () => {
  bankMetas.value = await listBankMetas();
  attemptedBankIds.value = new Set(await listAttemptBankIds());
  for (const entry of bankMetas.value) {
    if (attemptedBankIds.value.has(entry.bankId)) {
      selectedIds.value.add(entry.bankId);
    }
  }
  isLoading.value = false;
});

function toggleBank(bankId: string) {
  const next = new Set(selectedIds.value);
  if (next.has(bankId)) next.delete(bankId);
  else next.add(bankId);
  selectedIds.value = next;
  currentPage.value = 1;
}

// ── 收集错题 ────────────────────────────────────────────

interface WrongItem {
  bankName: string;
  question: QuestionItem;
  yourAnswer: string[];
}

const wrongList = ref<WrongItem[]>([]);
const loadingWrong = ref(false);

async function collectWrong() {
  loadingWrong.value = true;
  const result: WrongItem[] = [];

  for (const bankId of selectedIds.value) {
    const bank = await loadBank(bankId);
    const attempt = await loadAttempt(bankId);
    if (!bank || !attempt) continue;

    const questions = attempt.questionOrder
      ? attempt.questionOrder
          .map((id) => bank.questions.find((q) => q.id === id))
          .filter((q): q is QuestionItem => !!q)
      : bank.questions;

    const shuffled = attempt.shuffledQuestions ?? {};

    for (const q of questions) {
      const answer = attempt.answers[q.id];
      if (!answer || answer.selected.length === 0) continue;

      const evalQ = shuffled[q.id] ?? q;
      const status = evaluateStatus(evalQ, answer.selected);
      if (status === 'wrong' || status === 'partial') {
        result.push({
          bankName: bank.meta.name,
          question: q,
          yourAnswer: answer.selected,
        });
      }
    }
  }

  wrongList.value = result;
  loadingWrong.value = false;
  currentPage.value = 1;
}

// ── 分页 ────────────────────────────────────────────────

const currentPage = ref(1);
const totalPages = computed(() =>
  Math.ceil(wrongList.value.length / PAGE_SIZE),
);
const pagedWrong = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return wrongList.value.slice(start, start + PAGE_SIZE);
});

function typeLabel(type: QuestionType) {
  if (type === 'single') return '单选';
  if (type === 'multiple') return '多选';
  if (type === 'indeterminate') return '不定项';
  return '判断';
}

function answerLabel(question: QuestionItem) {
  if (question.type === 'judge') {
    return question.answer
      .map((id) => (id === 'T' ? '正确' : '错误'))
      .join(' / ');
  }
  return question.answer.join(' / ');
}

function yourLabel(question: QuestionItem, your: string[]) {
  if (question.type === 'judge') {
    return your.map((id) => (id === 'T' ? '正确' : '错误')).join(' / ');
  }
  return your.join(' / ');
}
</script>

<template>
  <div class="page">
    <div class="flex items-center gap-3 mb-6">
      <h1 class="text-3xl max-sm:text-2xl m-0">错题回顾</h1>
    </div>

    <div v-if="isLoading" class="text-muted text-sm">加载中…</div>

    <template v-else>
      <!-- 题库选择 -->
      <section
        v-if="wrongList.length === 0"
        class="bg-surface rounded-2xl p-[26px] max-sm:p-4 border border-[color:var(--border)] grid gap-4 mb-6"
      >
        <div class="text-sm text-muted tracking-wide uppercase">选择题库</div>
        <p v-if="bankMetas.length === 0" class="text-sm text-muted">
          还没有导入过题库，导入并答题后可以在这里集中复习错题。
        </p>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="entry in bankMetas"
            :key="entry.bankId"
            class="px-4 py-2 rounded-xl border text-sm cursor-pointer transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            :class="
              selectedIds.has(entry.bankId)
                ? 'border-brand bg-brand text-white'
                : 'border-[color:var(--border)] bg-surface-soft text-muted hover:border-brand'
            "
            :disabled="!attemptedBankIds.has(entry.bankId)"
            @click="toggleBank(entry.bankId)"
          >
            {{ entry.meta.name }}
            <span class="text-[10px] opacity-70 ml-1">
              {{ attemptedBankIds.has(entry.bankId) ? '有记录' : '无记录' }}
            </span>
          </button>
        </div>
        <div v-if="bankMetas.length > 0">
          <button
            class="select-none inline-flex items-center gap-2 border-none rounded-full px-[18px] py-[10px] text-sm cursor-pointer bg-brand text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="selectedIds.size === 0"
            @click="collectWrong"
          >
            {{ loadingWrong ? '收集中…' : '开始回顾' }}
          </button>
        </div>
      </section>

      <!-- 错题列表 -->
      <section
        v-if="wrongList.length > 0"
        class="bg-surface rounded-2xl p-[26px] max-sm:p-4 border border-[color:var(--border)] grid gap-4"
      >
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted tracking-wide uppercase">
            错题与部分正确
            <span class="ml-1 font-normal">（{{ wrongList.length }} 题）</span>
          </div>
          <button
            class="text-sm text-brand bg-transparent border-none cursor-pointer hover:underline"
            @click="wrongList = []"
          >
            重新选择
          </button>
        </div>

        <ul
          v-if="pagedWrong.length > 0"
          class="list-none m-0 p-0 grid gap-[12px]"
        >
          <li
            v-for="(item, idx) in pagedWrong"
            :key="idx"
            class="p-4 rounded-xl border border-[color:var(--border)] bg-surface-review"
          >
            <div class="text-[11px] text-muted mb-1">{{ item.bankName }}</div>
            <div class="mb-[6px]">{{ item.question.stem }}</div>
            <div class="flex gap-[12px] flex-wrap items-center">
              <StatusPill status="wrong" />
              <span
                class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted"
              >
                题型：{{ typeLabel(item.question.type) }}
              </span>
              <span
                class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted"
              >
                你的答案：{{ yourLabel(item.question, item.yourAnswer) }}
              </span>
              <span
                class="bg-surface-chip rounded-full px-2.5 py-1 text-xs text-muted"
              >
                参考答案：{{ answerLabel(item.question) }}
              </span>
            </div>
          </li>
        </ul>

        <Pagination
          v-if="totalPages > 1"
          :current="currentPage"
          :total="totalPages"
          @update:current="currentPage = $event"
        />
      </section>
    </template>
  </div>
</template>
