export type QuestionType =
  | 'single'
  | 'multiple'
  | 'judge'
  | 'indeterminate';
export type Mode = 'practice' | 'exam';
export type ViewMode = 'single' | 'paper';

export interface CourseMeta {
  code: string;
  name: string;
  link?: string;
}

export interface BankMeta {
  id?: string;
  course: CourseMeta;
  author: string;
  source?: string;
  publishedAt?: string;
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
