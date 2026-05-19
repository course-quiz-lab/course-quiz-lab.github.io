export type QuestionType = 'single' | 'multiple' | 'judge';
export type Mode = 'practice' | 'exam';
export type ViewMode = 'single' | 'paper';

export interface BankMeta {
  id?: string;
  title: string;
  description?: string;
  subject?: string;
  version?: string;
  source?: string;
  createdAt?: string;
  total?: number;
}

export interface OptionItem {
  id: string;
  text: string;
}

export interface QuestionItem {
  id: string;
  type: QuestionType;
  stem: string;
  options: OptionItem[];
  answer: string[];
  analysis?: string;
  difficulty?: number;
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
}
