import type { QuestionItem } from '../types/bank';

/**
 * 按选项展示顺序排序答案编号。
 *
 * 生成试卷时若开启了「打乱选项顺序」，选项文本会被重排，答案编号随之重映射，
 * 但 `answer` 数组仍保留原始顺序，直接 join 会出现 CAB、BAC 这类乱序，
 * 展示前必须按选项顺序重新排序。
 */
export function sortAnswerIds(question: QuestionItem, ids: string[]): string[] {
  const order = new Map(
    question.options.map((option, index) => [option.id, index]),
  );
  const rank = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [...ids].sort((a, b) => rank(a) - rank(b));
}

/** 参考答案 / 作答文本：判断题转成“正确 / 错误”，选择题按选项顺序排列 */
export function formatAnswerText(
  question: QuestionItem,
  ids: string[] = question.answer,
  separator = ' / ',
): string {
  if (question.type === 'judge') {
    return ids.map((id) => (id === 'T' ? '正确' : '错误')).join(separator);
  }
  return sortAnswerIds(question, ids).join(separator);
}
