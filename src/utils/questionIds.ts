import type { QuestionItem } from '../types/bank';
import type { Paper } from '../types/quiz';

/**
 * 题目 id 只在单个题库内唯一：
 * - JSON 导入默认生成 `q-1`、`q-2`…（每个题库都从 1 开始）
 * - Excel 导入生成 `q-excel-1`…
 *
 * 混合多个题库组卷时，id 会撞车，而作答记录（`attempt.answers`）以 id 为键，
 * 于是答一道题会把另一个题库里同 id 的题一起标记为已作答。
 * 组卷时把题库标识拼进 id，保证同一份试卷内 id 唯一。
 */
export function makeUniqueQuestionId(
  question: QuestionItem,
  bankId: string,
  used: Set<string>,
): string {
  const base = `${bankId}:${question.id}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}#${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

/**
 * 修复历史试卷中重复的题目 id（早期版本组卷时未做去重）。
 * 保留首次出现的 id，后续重复项追加 `#2`、`#3`… 后缀。
 */
export function ensureUniqueQuestionIds(paper: Paper): {
  paper: Paper;
  changed: boolean;
} {
  const used = new Set<string>();
  let changed = false;

  const questions = paper.questions.map((question) => {
    if (!used.has(question.id)) {
      used.add(question.id);
      return question;
    }
    let id = `${question.id}#2`;
    let suffix = 2;
    while (used.has(id)) {
      suffix += 1;
      id = `${question.id}#${suffix}`;
    }
    used.add(id);
    changed = true;
    return { ...question, id };
  });

  return { paper: changed ? { ...paper, questions } : paper, changed };
}
