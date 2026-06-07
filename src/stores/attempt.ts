import { defineStore } from 'pinia';
import type {
  PaperAttempt,
  Mode,
  QuestionItem,
  UserAnswer,
  ViewMode,
} from '../types/quiz';
import { loadPaperAttempt, savePaperAttempt } from '../utils/idb';

interface AttemptStoreState {
  attempt: PaperAttempt | null;
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
    async loadSavedAttempt(attemptId: string) {
      const saved = await loadPaperAttempt(attemptId);
      if (saved) {
        this.attempt = saved;
        return true;
      }
      return false;
    },

    async startAttempt(paperId: string, mode: Mode, questions: QuestionItem[]) {
      const attempt: PaperAttempt = {
        id: crypto.randomUUID(),
        paperId,
        mode,
        view: 'single',
        currentIndex: 0,
        startedAt: Date.now(),
        answers: buildEmptyAnswers(questions),
      };
      this.attempt = attempt;
      await savePaperAttempt(attempt);
      return attempt.id;
    },

    async resetAttempt(paperId: string, mode: Mode, questions: QuestionItem[]) {
      return await this.startAttempt(paperId, mode, questions);
    },

    async updateSelection(questionId: string, selected: string[]) {
      if (!this.attempt) return;
      const entry = this.attempt.answers[questionId];
      if (!entry) return;
      entry.selected = selected;
      entry.updatedAt = Date.now();
      await savePaperAttempt(this.attempt);
    },

    async submitQuestion(questionId: string) {
      if (!this.attempt) return;
      const entry = this.attempt.answers[questionId];
      if (!entry) return;
      entry.submitted = true;
      entry.updatedAt = Date.now();
      await savePaperAttempt(this.attempt);
    },

    async submitExam() {
      if (!this.attempt) return;
      this.attempt.submittedAt = Date.now();
      await savePaperAttempt(this.attempt);
    },

    async setView(view: ViewMode) {
      if (!this.attempt) return;
      this.attempt.view = view;
      await savePaperAttempt(this.attempt);
    },

    async setCurrentIndex(index: number, total: number) {
      if (!this.attempt) return;
      const next = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
      this.attempt.currentIndex = next;
      await savePaperAttempt(this.attempt);
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
