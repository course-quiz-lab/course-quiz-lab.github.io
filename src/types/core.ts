export type QuestionType = 'single' | 'multiple' | 'judge' | 'indeterminate';
export type Mode = 'practice' | 'exam';
export type ViewMode = 'single' | 'paper';
export type ImportMethod = 'upload' | 'link' | 'cloud' | 'xlsx' | 'word' | 'wrongbook';

export interface OptionItem {
  id: string;
  text: string;
  index: number;
}

export interface UserAnswer {
  selected: string[];
  submitted: boolean;
  flagged: boolean;
  updatedAt: number;
}

export function isMultiSelectType(type: QuestionType) {
  return type === 'multiple' || type === 'indeterminate';
}
