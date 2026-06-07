import { defineStore } from 'pinia';
import type { Paper } from '../types/quiz';
import { loadPaper } from '../utils/idb';

interface PaperStoreState {
  paper: Paper | null;
  loading: boolean;
}

export const usePaperStore = defineStore('paper', {
  state: (): PaperStoreState => ({
    paper: null,
    loading: false,
  }),
  getters: {
    hasPaper: (state) => !!state.paper,
  },
  actions: {
    async loadPaper(paperId: string) {
      this.loading = true;
      try {
        const paper = await loadPaper(paperId);
        if (paper) {
          this.paper = paper;
          return true;
        }
        this.paper = null;
        return false;
      } finally {
        this.loading = false;
      }
    },
    clearPaper() {
      this.paper = null;
    },
  },
});
