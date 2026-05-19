import { defineStore } from 'pinia';
import type { Bank } from '../types/quiz';
import { buildBankId } from '../utils/validation';
import { clearBank, getLastBankId, loadBank, saveBank } from '../utils/idb';

interface BankState {
  bank: Bank | null;
  bankId: string | null;
  warning: string | null;
  ready: boolean;
}

export const useBankStore = defineStore('bank', {
  state: (): BankState => ({
    bank: null,
    bankId: null,
    warning: null,
    ready: false,
  }),
  getters: {
    hasBank: (state) => !!state.bank,
  },
  actions: {
    async hydrate() {
      const lastId = await getLastBankId();
      if (!lastId) {
        this.ready = true;
        return;
      }
      const bank = await loadBank(lastId);
      if (bank) {
        this.bank = bank;
        this.bankId = lastId;
      }
      this.ready = true;
    },
    async setBank(bank: Bank, warning?: string) {
      const bankId = buildBankId(bank);
      this.bank = bank;
      this.bankId = bankId;
      this.warning = warning ?? null;
      await saveBank(bankId, bank);
    },
    async resetBank() {
      if (this.bankId) {
        await clearBank(this.bankId);
      }
      this.bank = null;
      this.bankId = null;
      this.warning = null;
    },
    setWarning(warning?: string) {
      this.warning = warning ?? null;
    },
  },
});
