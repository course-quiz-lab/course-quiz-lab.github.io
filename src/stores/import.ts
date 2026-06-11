import { defineStore } from 'pinia';
import type { Bank, CloudBankEntry, QuestionItem } from '../types/bank';
import type { ImportMethod, Mode, QuestionType } from '../types/core';
import type { ExcelParseResult } from '../types/excel';
import { clearAttempt, loadAttempt } from '../utils/idb';
import { useBankStore } from './bank';

export type DownloadStatus = 'pending' | 'downloading' | 'success' | 'fail' | 'cancelled';

export interface DownloadQueueItem {
  entry: CloudBankEntry;
  status: DownloadStatus;
  error?: string;
}

interface PaperCreateDraft {
  selectedBanks: Record<string, boolean>;
  bankWeights: Record<string, number>;
  loadedBankIds: string[];
  targetCounts: Record<QuestionType, number>;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  selectedMode: Mode;
  paperTitle: string;
}

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
  returnTo: string | null;
  paperCreateDraft: PaperCreateDraft | null;
  downloadQueue: DownloadQueueItem[];
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
    returnTo: null,
    paperCreateDraft: null,
    downloadQueue: [],
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

    resetDownloadQueue() {
      this.downloadQueue = [];
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
      if (!this.preview) return null;
      await bankStore.setBank(this.preview, this.warning ?? undefined);
      if (bankStore.bankId) {
        const saved = await loadAttempt(bankStore.bankId);
        if (saved) {
          await clearAttempt(bankStore.bankId);
        }
      }
      const redirect = this.returnTo;
      this.reset();
      return redirect;
    },
  },
});
