import { defineStore } from 'pinia';
import type {
  Bank,
  ExcelParseResult,
  ImportMethod,
  QuestionItem,
} from '../types/quiz';
import { clearAttempt, loadAttempt } from '../utils/idb';
import { useBankStore } from './bank';

interface ImportState {
  selectedMethod: ImportMethod;
  importUrl: string;
  fileName: string;
  isLoading: boolean;
  errors: string[];
  warning: string | null;
  preview: Bank | null;
  excelData: ExcelParseResult | null;
  excelQuestions: QuestionItem[];
  unsupportedRows: string[];
}

export const useImportStore = defineStore('import', {
  state: (): ImportState => ({
    selectedMethod: 'upload',
    importUrl: '',
    fileName: '',
    isLoading: false,
    errors: [],
    warning: null,
    preview: null,
    excelData: null,
    excelQuestions: [],
    unsupportedRows: [],
  }),

  getters: {
    canProceed: (state) => {
      if (state.selectedMethod === 'upload') return !!state.preview;
      if (state.selectedMethod === 'link') return !!state.preview;
      if (state.selectedMethod === 'xlsx') return !!state.preview;
      return false;
    },
    totalQuestions: (state) => state.preview?.questions.length ?? 0,
  },

  actions: {
    reset() {
      this.selectedMethod = 'upload';
      this.importUrl = '';
      this.fileName = '';
      this.isLoading = false;
      this.errors = [];
      this.warning = null;
      this.preview = null;
      this.excelData = null;
      this.excelQuestions = [];
      this.unsupportedRows = [];
    },

    resetState() {
      this.errors = [];
      this.warning = null;
      this.preview = null;
      this.fileName = '';
      this.isLoading = false;
    },

    setMethod(method: ImportMethod) {
      this.selectedMethod = method;
      this.resetState();
    },

    setPreview(bank: Bank, warning?: string) {
      this.preview = bank;
      this.warning = warning ?? null;
    },

    async confirmImport() {
      const bankStore = useBankStore();
      if (!this.preview) return;
      await bankStore.setBank(this.preview, this.warning ?? undefined);
      if (bankStore.bankId) {
        const saved = await loadAttempt(bankStore.bankId);
        if (saved) {
          await clearAttempt(bankStore.bankId);
        }
      }
      this.reset();
    },
  },
});
