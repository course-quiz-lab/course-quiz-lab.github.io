export type QuestionType = 'single' | 'multiple' | 'judge' | 'indeterminate';
export type Mode = 'practice' | 'exam';
export type ViewMode = 'single' | 'paper';
export type ImportMethod = 'upload' | 'link' | 'cloud' | 'xlsx' | 'word';

/**
 * 题库元数据，对应 schema 中的 metadata 对象。
 * - name: 题库名称（如 "大学物理题库"）
 * - course: 课程全称（字符串，如 "大学物理"）
 * - sourceUrl: 源文件链接
 */
export interface BankMeta {
  id?: string;
  name: string;
  course: string;
  author: string;
  source?: string;
  sourceUrl?: string;
  total?: number;
}

export interface OptionItem {
  id: string;
  text: string;
  index: number;
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

export interface UserAnswer {
  selected: string[];
  submitted: boolean;
  flagged: boolean;
  updatedAt: number;
}

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

/** Lightweight metadata entry stored in `bank-metas` for listing without loading full bank */
export interface BankMetaEntry {
  bankId: string;
  meta: BankMeta;
  importedAt: number;
}

export function isMultiSelectType(type: QuestionType) {
  return type === 'multiple' || type === 'indeterminate';
}

// ── Cloud Bank Types ────────────────────────────────────

/** Per-type question count from cloud index */
export interface CloudBankCounts {
  single: number;
  multiple: number;
  judge: number;
  indeterminate: number;
}

/** Entry in the cloud bank index.json */
export interface CloudBankEntry {
  metadata: BankMeta;
  count: CloudBankCounts;
  url: string;
}

/** Structure of the cloud bank index.json */
export interface CloudBankIndex {
  $schema?: string;
  banks: CloudBankEntry[];
  updatedAt: string;
}

// ── Excel Import Types ──────────────────────────────────

/** Column mapping configuration for Excel import */
export interface ColumnMapping {
  /** Index of the column containing question type, or null if not present (smart inference) */
  typeCol: number | null;
  /** Index of the column containing the question stem */
  stemCol: number;
  /** Ordered array of column indices for options */
  optionCols: number[];
  /** Index of the column containing the answer */
  answerCol: number;
  /** Index of the column containing analysis/explanation, or null if not present */
  analysisCol: number | null;
  /** Index of the column containing difficulty, or null if not present */
  difficultyCol: number | null;
  /** Whether the first row is a header row */
  hasHeader: boolean;
}

/** Raw parsed data from an Excel sheet */
export interface ExcelSheetData {
  headers: string[];
  rows: string[][];
}

/** Result of reading an Excel file */
export interface ExcelParseResult {
  sheetNames: string[];
  sheets: Record<string, ExcelSheetData>;
}

/** Preview data shown before confirming import */
export interface ExcelPreviewData {
  totalRows: number;
  typeBreakdown: Record<string, number>;
  samples: QuestionItem[];
  errors: string[];
  unsupportedRows: string[];
}
