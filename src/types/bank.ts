import type { OptionItem, QuestionType, ImportMethod } from './core';

export interface BankMeta {
  id?: string;
  name: string;
  course: string;
  author: string;
  source?: string;
  sourceUrl?: string;
  total?: number;
  importMethod?: ImportMethod;
}

export interface QuestionItem {
  id: string;
  type: QuestionType;
  stem: string;
  options: OptionItem[];
  answer: string[];
  analysis?: string;
  difficulty?: string;
}

export interface Bank {
  $schema?: string;
  meta: BankMeta;
  questions: QuestionItem[];
}

/** Lightweight metadata entry stored in `bank-metas` for listing without loading full bank */
export interface BankMetaEntry {
  bankId: string;
  meta: BankMeta;
  importedAt: number;
}

// ── Cloud Bank Types ────────────────────────────────────

export interface CloudBankCounts {
  single: number;
  multiple: number;
  judge: number;
  indeterminate: number;
}

export interface CloudBankEntry {
  metadata: BankMeta;
  count: CloudBankCounts;
  url: string;
}

export interface CloudBankIndex {
  $schema?: string;
  banks: CloudBankEntry[];
  updatedAt: string;
}
