import type { QuestionItem } from '../types/bank';

/**
 * Build a normalized key for question deduplication.
 * Uses stem + option texts sorted by option id, so shuffled options are handled correctly.
 */
export function questionKey(q: QuestionItem): string {
  const opts = [...q.options]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((o) => o.text)
    .join('|');
  return q.stem + '|||' + opts;
}

/**
 * Deduplicate an array of questions, keeping the first occurrence per normalized key.
 * Returns the deduplicated array.
 */
export function deduplicateQuestions(questions: QuestionItem[]): QuestionItem[] {
  const seen = new Set<string>();
  const result: QuestionItem[] = [];
  for (const q of questions) {
    const key = questionKey(q);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(q);
    }
  }
  return result;
}
