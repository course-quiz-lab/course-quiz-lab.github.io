import type { QuestionItem } from '../types/quiz';

export type AnswerStatus = 'correct' | 'partial' | 'wrong' | 'unanswered';

export function evaluateStatus(
  question: QuestionItem,
  selected: string[],
): AnswerStatus {
  if (!selected || selected.length === 0) return 'unanswered';

  const correct = question.answer;
  if (question.type === 'multiple') {
    // const selectedSet = new Set(selected);
    const correctSet = new Set(correct);
    const isSubset = selected.every((value) => correctSet.has(value));
    const isEqual = selected.length === correct.length && isSubset;
    if (isEqual) return 'correct';
    if (isSubset) return 'partial';
    return 'wrong';
  }
  return selected[0] === correct[0] ? 'correct' : 'wrong';
}
