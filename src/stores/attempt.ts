import { defineStore } from 'pinia';
import type {
  AttemptState,
  Mode,
  QuestionItem,
  UserAnswer,
  ViewMode,
} from '../types/quiz';
import { clearAttempt, loadAttempt, saveAttempt } from '../utils/idb';

interface AttemptStoreState {
  attempt: AttemptState | null;
}

function buildEmptyAnswers(
  questions: QuestionItem[],
): Record<string, UserAnswer> {
  const now = Date.now();
  return questions.reduce<Record<string, UserAnswer>>((acc, question) => {
    acc[question.id] = {
      selected: [],
      submitted: false,
      flagged: false,
      updatedAt: now,
    };
    return acc;
  }, {});
}

export const useAttemptStore = defineStore('attempt', {
  state: (): AttemptStoreState => ({
    attempt: null,
  }),
  getters: {
    hasAttempt: (state) => !!state.attempt,
    isSubmitted: (state) => !!state.attempt?.submittedAt,
  },
  actions: {
    async loadSavedAttempt(bankId: string, mode: Mode) {
      const saved = await loadAttempt(bankId, mode);
      if (saved) {
        this.attempt = saved;
        return true;
      }
      return false;
    },
    async startAttempt(bankId: string, mode: Mode, questions: QuestionItem[]) {
      const attempt: AttemptState = {
        bankId,
        mode,
        view: 'single',
        currentIndex: 0,
        startedAt: Date.now(),
        answers: buildEmptyAnswers(questions),
      };
      this.attempt = attempt;
      await saveAttempt(attempt);
    },
    async resetAttempt(bankId: string, mode: Mode, questions: QuestionItem[]) {
      await clearAttempt(bankId, mode);
      await this.startAttempt(bankId, mode, questions);
    },
    async updateSelection(questionId: string, selected: string[]) {
      if (!this.attempt) return;
      const entry = this.attempt.answers[questionId];
      if (!entry) return;
      entry.selected = selected;
      entry.updatedAt = Date.now();
      await saveAttempt(this.attempt);
    },
    async submitQuestion(questionId: string) {
      if (!this.attempt) return;
      const entry = this.attempt.answers[questionId];
      if (!entry) return;
      entry.submitted = true;
      entry.updatedAt = Date.now();
      await saveAttempt(this.attempt);
    },
    async submitExam() {
      if (!this.attempt) return;
      this.attempt.submittedAt = Date.now();
      await saveAttempt(this.attempt);
    },
    async setView(view: ViewMode) {
      if (!this.attempt) return;
      this.attempt.view = view;
      await saveAttempt(this.attempt);
    },
    async setCurrentIndex(index: number, total: number) {
      if (!this.attempt) return;
      const next = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
      this.attempt.currentIndex = next;
      await saveAttempt(this.attempt);
    },
    async nextQuestion(total: number) {
      if (!this.attempt) return;
      await this.setCurrentIndex(this.attempt.currentIndex + 1, total);
    },
    async prevQuestion(total: number) {
      if (!this.attempt) return;
      await this.setCurrentIndex(this.attempt.currentIndex - 1, total);
    },
  },
});
