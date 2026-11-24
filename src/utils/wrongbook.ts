import { questionTypeLabel, QUESTION_TYPE_ORDER } from './questionType';
import { questionKey } from './dedup';
import { evaluateStatus } from './scoring';
import type { BankMetaEntry, QuestionItem } from '../types/bank';
import type { QuestionType } from '../types/core';
import type {
  Paper,
  PaperAttempt,
  QuestionSource,
} from '../types/quiz';

export const UNKNOWN_BANK_LABEL = '未知题库';
export const UNKNOWN_COURSE_LABEL = '未知课程';

/** 错题的来源归属：组卷时记录的题库 / 课程，缺失时回退推断 */
export interface ResolvedQuestionSource {
  bankId: string;
  bankName: string;
  course: string;
}

export interface WrongBookItem {
  key: string;
  question: QuestionItem;
  paper: Paper;
  attempt: PaperAttempt;
  status: 'wrong' | 'partial';
  selected: string[];
  /** 该题在全部试卷、全部已提交作答中答错 / 部分正确的累计次数 */
  wrongCount: number;
  source: ResolvedQuestionSource;
}

export interface WrongBookFilterState {
  types: QuestionType[];
  courses: string[];
  banks: string[];
}

export interface WrongBookFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface WrongBookFilterOptions {
  types: WrongBookFilterOption[];
  courses: WrongBookFilterOption[];
  banks: WrongBookFilterOption[];
}

/** 去掉 `#2` 这类历史去重后缀，便于解析题库 id 前缀 */
function stripIdSuffix(id: string) {
  const hashIndex = id.indexOf('#');
  return hashIndex === -1 ? id : id.slice(0, hashIndex);
}

/**
 * 解析题目来源，按以下顺序回退：
 * 1. 试卷里已记录的逐题来源；
 * 2. 题目 id 前缀 `bankId:原id` 对应的题库元数据；
 * 3. 单一题库试卷的 `bankNames`；
 * 4. 未知标签。
 */
export function resolveQuestionSource(
  questionId: string,
  paper: Paper,
  metaByBankId: Map<string, BankMetaEntry>,
  stored?: QuestionSource,
): ResolvedQuestionSource {
  const baseId = stripIdSuffix(questionId);
  const separatorIndex = baseId.indexOf(':');
  const prefixBankId = separatorIndex > 0 ? baseId.slice(0, separatorIndex) : '';

  const storedMeta = stored?.bankId
    ? metaByBankId.get(stored.bankId)
    : undefined;
  const prefixMeta = prefixBankId
    ? metaByBankId.get(prefixBankId)
    : undefined;
  const meta = storedMeta ?? prefixMeta;

  const singleBankName =
    paper.bankNames?.length === 1 ? paper.bankNames[0] : '';

  return {
    bankId: stored?.bankId || prefixBankId || '',
    bankName:
      stored?.bankName ||
      meta?.meta.name ||
      singleBankName ||
      UNKNOWN_BANK_LABEL,
    course: stored?.course || meta?.meta.course || UNKNOWN_COURSE_LABEL,
  };
}

/**
 * 聚合错题本条目：
 * - 只统计已提交 / 练习模式下的作答（未交卷考试不算）；
 * - `wrong` 与 `partial` 都计入；
 * - 按题干 + 选项文本去重，保留最近一次作答，累计次数覆盖全部出现记录。
 */
export function buildWrongBookItems(
  papers: Paper[],
  attemptsByPaper: Map<string, PaperAttempt[]>,
  metaByBankId: Map<string, BankMetaEntry>,
): WrongBookItem[] {
  const occurrences: Omit<WrongBookItem, 'key' | 'wrongCount' | 'source'>[] =
    [];

  for (const paper of papers) {
    const attempts = attemptsByPaper.get(paper.id) ?? [];
    for (const attempt of attempts) {
      if (attempt.mode === 'exam' && !attempt.submittedAt) continue;

      for (const question of paper.questions) {
        const entry = attempt.answers[question.id];
        if (!entry || entry.selected.length === 0) continue;

        const status = evaluateStatus(question, entry.selected);
        if (status !== 'wrong' && status !== 'partial') continue;

        occurrences.push({
          question,
          paper,
          attempt,
          status,
          selected: entry.selected,
        });
      }
    }
  }

  const keyCounts = new Map<string, number>();
  for (const occurrence of occurrences) {
    const key = questionKey(occurrence.question);
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }

  // 最新作答在前，保证每个去重键保留的是最近一次出现
  occurrences.sort((a, b) => b.attempt.startedAt - a.attempt.startedAt);

  const seen = new Set<string>();
  const items: WrongBookItem[] = [];
  for (const occurrence of occurrences) {
    const key = questionKey(occurrence.question);
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      ...occurrence,
      key,
      wrongCount: keyCounts.get(key) ?? 1,
      source: resolveQuestionSource(
        occurrence.question.id,
        occurrence.paper,
        metaByBankId,
        occurrence.paper.questionSources?.[occurrence.question.id],
      ),
    });
  }

  return items;
}

function matchesSearch(item: WrongBookItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const { question } = item;
  if (question.stem.toLowerCase().includes(normalized)) return true;
  if (question.options.some((o) => o.text.toLowerCase().includes(normalized))) {
    return true;
  }
  if (question.analysis?.toLowerCase().includes(normalized)) return true;
  return false;
}

/**
 * 关键词搜索也属于筛选条件：与题型 / 课程 / 题库一起统一判断，
 * 便于「清除筛选」一次性清空全部条件。
 */
export function matchesWrongBookFilters(
  item: WrongBookItem,
  filters: WrongBookFilterState,
  query = '',
): boolean {
  if (
    filters.types.length > 0 &&
    !filters.types.includes(item.question.type)
  ) {
    return false;
  }
  if (
    filters.courses.length > 0 &&
    !filters.courses.includes(item.source.course)
  ) {
    return false;
  }
  if (
    filters.banks.length > 0 &&
    !filters.banks.includes(item.source.bankName)
  ) {
    return false;
  }
  return matchesSearch(item, query);
}

function buildOptions(
  values: { value: string; label: string }[],
): WrongBookFilterOption[] {
  const counts = new Map<string, WrongBookFilterOption>();
  for (const { value, label } of values) {
    const existing = counts.get(value);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(value, { value, label, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'),
  );
}

export function buildWrongBookFilterOptions(
  items: WrongBookItem[],
): WrongBookFilterOptions {
  const typeCounts = new Map<QuestionType, number>();
  for (const item of items) {
    typeCounts.set(
      item.question.type,
      (typeCounts.get(item.question.type) ?? 0) + 1,
    );
  }

  const types = QUESTION_TYPE_ORDER.filter((type) => typeCounts.has(type)).map(
    (type) => ({
      value: type,
      label: questionTypeLabel(type, true),
      count: typeCounts.get(type) ?? 0,
    }),
  );

  return {
    types,
    courses: buildOptions(
      items.map((item) => ({
        value: item.source.course,
        label: item.source.course,
      })),
    ),
    banks: buildOptions(
      items.map((item) => ({
        value: item.source.bankName,
        label: item.source.bankName,
      })),
    ),
  };
}
