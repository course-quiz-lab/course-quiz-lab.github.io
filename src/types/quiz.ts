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

/** 题目来源信息：题库被删除或改名后，仍能按组卷时的归属筛选 */
export interface QuestionSource {
  bankId?: string;
  bankName?: string;
  course?: string;
}

export interface Paper {
  id: string;
  title: string;
  createdAt: number;
  questions: QuestionItem[];
  /** Names of source banks this paper draws questions from */
  bankNames?: string[];
  /** 逐题来源（题目 id → 来源）；旧试卷可能缺失，读取时按题库元数据回退推断 */
  questionSources?: Record<string, QuestionSource>;
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
