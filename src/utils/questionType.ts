import type { QuestionType } from '../types/core';

/** 题型展示顺序：与组卷页保持一致 */
export const QUESTION_TYPE_ORDER: QuestionType[] = [
  'single',
  'multiple',
  'indeterminate',
  'judge',
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: '单项选择题',
  multiple: '多项选择题',
  indeterminate: '不定项选择题',
  judge: '判断题',
};

export const QUESTION_TYPE_SHORT_LABELS: Record<QuestionType, string> = {
  single: '单选',
  multiple: '多选',
  indeterminate: '不定项',
  judge: '判断',
};

export function questionTypeLabel(type: QuestionType, short = false) {
  const labels = short ? QUESTION_TYPE_SHORT_LABELS : QUESTION_TYPE_LABELS;
  return labels[type] ?? '未知题型';
}
