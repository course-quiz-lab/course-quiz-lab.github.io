import type { QuestionItem } from './bank';
import type { Mode, UserAnswer, ViewMode } from './core';

export type {
  QuestionType,
  Mode,
  ViewMode,
  ImportMethod,
  OptionItem,
  UserAnswer,
} from './core';
export { isMultiSelectType } from './core';

export type {
  BankMeta,
  QuestionItem,
  Bank,
  BankMetaEntry,
  CloudBankCounts,
  CloudBankEntry,
  CloudBankIndex,
} from './bank';

export type {
  ColumnMapping,
  ExcelSheetData,
  ExcelParseResult,
  ExcelPreviewData,
} from './excel';

export interface Paper {
  id: string;
  title: string;
  createdAt: number;
  questions: QuestionItem[];
}

export interface PaperAttempt {
  id: string;
  paperId: string;
  mode: Mode;
  view: ViewMode;
  currentIndex: number;
  startedAt: number;
  submittedAt?: number;
  answers: Record<string, UserAnswer>;
}

// TODO: Remove AttemptState after refactor
export interface AttemptState {
  bankId: string;
  mode: Mode;
  view: ViewMode;
  currentIndex: number;
  startedAt: number;
  submittedAt?: number;
  answers: Record<string, UserAnswer>;
  questionOrder?: string[];
  /** Shuffled question copies with remapped option texts and answers */
  shuffledQuestions?: Record<string, QuestionItem>;
}
