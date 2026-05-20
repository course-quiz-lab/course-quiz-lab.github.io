import { defineStore } from 'pinia';
import type {
  AttemptState,
  Mode,
  QuestionItem,
  UserAnswer,
  ViewMode,
} from '../types/quiz';
import { loadAttempt, saveAttempt } from '../utils/idb';

interface AttemptStoreState {
  attempt: AttemptState | null;
  _pendingShuffleQuestions: boolean;
  _pendingShuffleOptions: boolean;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
    _pendingShuffleQuestions: false,
    _pendingShuffleOptions: false,
  }),
  getters: {
    hasAttempt: (state) => !!state.attempt,
    isSubmitted: (state) => !!state.attempt?.submittedAt,
  },
  actions: {
    /** Load the latest saved attempt. Returns true if found. */
    async loadSavedAttempt() {
      const saved = await loadAttempt();
      if (saved) {
        this.attempt = saved;
        return true;
      }
      return false;
    },
    async startAttempt(
      bankId: string,
      mode: Mode,
      questions: QuestionItem[],
      shuffleQuestions = false,
      shuffleOptions = false,
    ) {
      let questionOrder: string[] | undefined;
      let shuffledQuestions: Record<string, QuestionItem> | undefined;

      if (shuffleQuestions) {
        questionOrder = shuffle(questions.map((q) => q.id));
      }
      if (shuffleOptions) {
        shuffledQuestions = {};
        for (const q of questions) {
          if (q.type !== 'judge' && q.options.length > 0) {
            // Shuffle option texts but keep IDs (A, B, C…) in original order
            const texts = q.options.map((o) => o.text);
            const shuffledTexts = shuffle(texts);
            const newOptions = q.options.map((o, i) => ({
              ...o,
              text: shuffledTexts[i],
            }));
            // Remap answer IDs: find where each correct answer's text moved to
            const newAnswer = q.answer.map((answerId) => {
              const originalText = q.options.find((o) => o.id === answerId)?.text;
              if (!originalText) return answerId;
              const newSlot = newOptions.find((o) => o.text === originalText);
              return newSlot ? newSlot.id : answerId;
            });
            shuffledQuestions[q.id] = { ...q, options: newOptions, answer: newAnswer };
          }
        }
      }

      const attempt: AttemptState = {
        bankId,
        mode,
        view: 'single',
        currentIndex: 0,
        startedAt: Date.now(),
        answers: buildEmptyAnswers(questions),
        questionOrder,
        shuffledQuestions,
      };
      this.attempt = attempt;
      await saveAttempt(attempt);
    },
    async resetAttempt(bankId: string, mode: Mode, questions: QuestionItem[]) {
      // Preserve shuffle order from current attempt
      const existingOrder = this.attempt?.questionOrder;
      const existingShuffledQuestions = this.attempt?.shuffledQuestions;
      const attempt: AttemptState = {
        bankId,
        mode,
        view: 'single',
        currentIndex: 0,
        startedAt: Date.now(),
        answers: buildEmptyAnswers(questions),
        questionOrder: existingOrder,
        shuffledQuestions: existingShuffledQuestions,
      };
      this.attempt = attempt;
      await saveAttempt(attempt);
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
