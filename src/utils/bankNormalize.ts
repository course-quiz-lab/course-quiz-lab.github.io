/**
 * 题型、选项、答案的归一化函数。
 *
 * 将用户提供的各种输入格式（如 "single-choice"、"判断题"、
 * 选项为字符串数组或对象数组、答案为字母或数字等）统一转换
 * 为内部 QuestionItem 所使用的标准格式。
 */

import type { OptionItem, QuestionItem, QuestionType } from '../types/quiz';
import { asLabel, asNumericLabel, labelAt, toIndex } from './bankLabel';

// ── Constants ───────────────────────────────────────────

const DEFAULT_BOOLEAN_OPTIONS: OptionItem[] = [
  { id: 'T', text: '正确', index: 0 },
  { id: 'F', text: '错误', index: 1 },
];

const JUDGE_TRUE_VALUES = ['t', 'true', '1', '正确', '是', '对'];
const JUDGE_FALSE_VALUES = ['f', 'false', '0', '错误', '否', '错'];

// ── Type Normalization ──────────────────────────────────

/**
 * 将各种题型写法归一为标准题型标识。
 * 支持英文 / 中文 / 缩写等多种输入。
 */
export function normalizeType(raw: unknown): QuestionType | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).toLowerCase();
  if (['single', 'single-choice', 'sc', 'radio'].includes(value))
    return 'single';
  if (['multiple', 'multi', 'mc', 'checkbox'].includes(value))
    return 'multiple';
  if (['indeterminate', 'multi-any'].includes(value)) return 'indeterminate';
  if (['boolean', 'judge', 'true-false', 'tf'].includes(value)) return 'judge';
  return null;
}

// ── Options Normalization ───────────────────────────────

/**
 * 将用户提供的选项列表归一化为 OptionItem[]。
 *
 * 支持两种输入格式：
 * 1. 字符串数组 `["文本A", "文本B"]`
 * 2. 对象数组 `[{ id, text, index }, ...]`
 *
 * 判断题直接返回默认的 ["正确","错误"]。
 */
export function normalizeOptionList(
  raw: unknown,
  type: QuestionType,
): OptionItem[] | null {
  if (type === 'judge') return DEFAULT_BOOLEAN_OPTIONS;
  if (!Array.isArray(raw) || raw.length < 2) return null;

  const items: OptionItem[] = [];
  raw.forEach((value, index) => {
    if (!value) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;
      items.push({ id: labelAt(index, raw.length), text: trimmed, index });
      return;
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      const text = String(obj.text ?? obj.label ?? obj.value ?? '').trim();
      if (!text) return;
      const id =
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : labelAt(index, raw.length);
      items.push({
        id,
        text,
        index: typeof obj.index === 'number' ? obj.index : index,
      });
    }
  });

  return items.length >= 2 ? items : null;
}

// ── Answer Normalization ────────────────────────────────

/** 处理判断题答案：true/false、"T"/"F"、"正确"/"错误" 等 → ["T"] / ["F"] */
function handleJudgeAnswer(raw: unknown): string[] | null {
  if (typeof raw === 'boolean') return [raw ? 'T' : 'F'];
  const v = String(raw).toLowerCase();
  if (JUDGE_TRUE_VALUES.includes(v)) return ['T'];
  if (JUDGE_FALSE_VALUES.includes(v)) return ['F'];
  return null;
}

/** 处理单选题答案：数字索引、字母标签、或包含单个元素的数组 */
function handleSingleAnswer(raw: unknown, count: number): string[] | null {
  // 数字索引 0, "0"
  const idx = toIndex(raw);
  if (Number.isFinite(idx)) {
    const label = labelAt(idx, count);
    if (label) return [label];
  }
  // 字母标签 "A"
  if (typeof raw === 'string') {
    const label = asLabel(raw, count);
    if (label) return [label];
  }
  // 数组 ["A"] 或 [0]
  if (Array.isArray(raw) && raw.length === 1) {
    const first = raw[0];
    if (typeof first === 'string') {
      const label = asLabel(first, count) ?? asNumericLabel(first, count);
      if (label) return [label];
    }
    if (typeof first === 'number') {
      const label = labelAt(first, count);
      if (label) return [label];
    }
  }
  return null;
}

/** 处理多选题 / 不定项答案：数字索引数组、字母标签数组、混合数组 */
function handleMultiAnswer(raw: unknown, count: number): string[] | null {
  if (!Array.isArray(raw)) return null;
  const values: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const label = asLabel(item, count) ?? asNumericLabel(item, count);
      if (label) values.push(label);
    } else if (typeof item === 'number') {
      const label = labelAt(item, count);
      if (label) values.push(label);
    }
  }
  return values.length ? values : null;
}

/**
 * 将用户提供的答案归一化为内部使用的字母标签数组。
 *
 * 支持格式：
 * - 判断题：`true` / `false`（布尔值）、`"T"` / `"F"`、`"正确"` / `"错误"` 等
 * - 单选题：`0`（数字索引）、`"A"`（字母标签）、`["A"]` 或 `[0]`（单元素数组）
 * - 多选题 / 不定项：`[0, 2]`、`["A", "C"]`、`["A", 2]` 等
 */
export function normalizeAnswer(
  raw: unknown,
  type: QuestionType,
  optionsCount: number,
): string[] | null {
  if (raw === undefined || raw === null) return null;
  if (type === 'judge') return handleJudgeAnswer(raw);
  if (type === 'single') return handleSingleAnswer(raw, optionsCount);
  return handleMultiAnswer(raw, optionsCount);
}
