import {
  isMultiSelectType,
  type Bank,
  type BankMeta,
  type OptionItem,
  type QuestionItem,
  type QuestionType,
} from '../types/quiz';
import { simpleHash } from './hash';

export interface ValidationResult {
  bank?: Bank;
  errors: string[];
  warning?: string;
}

const DEFAULT_BOOLEAN_OPTIONS: OptionItem[] = [
  { id: 'T', text: '正确', index: 0 },
  { id: 'F', text: '错误', index: 1 },
];

const ANSWER_SPLIT_RE = /[,、;]/;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

function buildOptionLabel(index: number, total: number) {
  if (total > LETTERS.length) return String(index + 1);
  return LETTERS[index] ?? String(index + 1);
}

function normalizeOptionList(
  raw: unknown,
  type: QuestionType,
): OptionItem[] | null {
  if (type === 'judge') {
    return DEFAULT_BOOLEAN_OPTIONS;
  }
  if (!Array.isArray(raw)) return null;
  if (raw.length < 2) return null;

  const items: OptionItem[] = [];
  raw.forEach((value, index) => {
    if (typeof value !== 'string' || !value.trim()) return;
    const label = buildOptionLabel(index, raw.length);
    items.push({ id: label, text: value.trim(), index });
  });

  return items.length >= 2 ? items : null;
}

function normalizeAnswerIndex(raw: unknown) {
  if (raw === undefined || raw === null) return Number.NaN;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : Number.NaN;
  const text = String(raw).trim();
  if (!text) return Number.NaN;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function indexToLabel(index: number, total: number) {
  if (!Number.isInteger(index) || index < 0 || index >= total) return '';
  return buildOptionLabel(index, total);
}

function normalizeAnswer(
  raw: unknown,
  type: QuestionType,
  optionsCount: number,
): string[] | null {
  if (raw === undefined || raw === null) return null;
  if (type === 'judge') {
    if (typeof raw === 'boolean') return [raw ? 'T' : 'F'];
    const value = String(raw).toLowerCase();
    if (['t', 'true', '1', '正确', '是', '对'].includes(value)) return ['T'];
    if (['f', 'false', '0', '错误', '否', '错'].includes(value)) return ['F'];
    return null;
  }
  if (type === 'single') {
    const index = normalizeAnswerIndex(raw);
    const label = indexToLabel(index, optionsCount);
    return label ? [label] : null;
  }
  if (Array.isArray(raw)) {
    const values = raw
      .map((item) => indexToLabel(normalizeAnswerIndex(item), optionsCount))
      .filter(Boolean);
    return values.length ? values : null;
  }
  const index = normalizeAnswerIndex(raw);
  const value = indexToLabel(index, optionsCount);
  if (!value) return null;
  if (ANSWER_SPLIT_RE.test(value)) {
    return [value];
  }
  return [value];
}

export function buildBankId(bank: Bank) {
  if (bank.meta.id) return bank.meta.id;
  const courseId = bank.meta.course.code || bank.meta.course.name;
  const payload = `${courseId}:${bank.meta.author}:${bank.questions.length}`;
  return `bank-${simpleHash(payload)}`;
}

export function validateBankSchema(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { errors: ['文件内容不是有效的对象。'] };
  }

  const input = raw as Record<string, unknown>;
  if (!input.metadata || typeof input.metadata !== 'object') {
    errors.push('元数据 metadata 缺失或格式不正确。');
  }

  const metaInput = (input.metadata ?? input.meta ?? {}) as Record<
    string,
    unknown
  >;
  const courseInput = (metaInput.course ?? {}) as Record<string, unknown>;
  const courseCode = String(courseInput.code ?? '').trim();
  const courseName = String(courseInput.name ?? '').trim();
  const author = String(metaInput.author ?? '').trim();

  if (!courseCode) {
    errors.push('元数据缺少课程代码。');
  }
  if (!courseName) {
    errors.push('元数据缺少课程名称。');
  }
  if (!author) {
    errors.push('元数据缺少作者。');
  }

  const questionsInput = input.questions;
  if (!Array.isArray(questionsInput) || questionsInput.length === 0) {
    errors.push('题目列表 questions 为空或格式不正确。');
  }

  const questions: QuestionItem[] = [];
  if (Array.isArray(questionsInput)) {
    questionsInput.forEach((rawQuestion, index) => {
      if (!rawQuestion || typeof rawQuestion !== 'object') {
        errors.push(`第 ${index + 1} 题：题目结构不正确。`);
        return;
      }
      const item = rawQuestion as Record<string, unknown>;
      const type = normalizeType(item.type ?? item.questionType ?? item.kind);
      if (!type) {
        errors.push(`第 ${index + 1} 题：题目类型无效。`);
        return;
      }
      const stem = String(
        item.stem ?? item.title ?? item.question ?? '',
      ).trim();
      if (!stem) {
        errors.push(`第 ${index + 1} 题：题干为空。`);
        return;
      }
      const options = normalizeOptionList(item.options, type);
      if (!options) {
        errors.push(`第 ${index + 1} 题：选项格式不正确。`);
        return;
      }
      const answer = normalizeAnswer(
        item.answer ?? item.answers ?? item.correct,
        type,
        options.length,
      );
      if (!answer || answer.length === 0) {
        errors.push(`第 ${index + 1} 题：答案缺失或无效。`);
        return;
      }
      if (!isMultiSelectType(type) && answer.length !== 1) {
        errors.push(`第 ${index + 1} 题：答案只能有一个。`);
        return;
      }
      if (isMultiSelectType(type)) {
        const unique = new Set(answer);
        if (unique.size !== answer.length) {
          errors.push(`第 ${index + 1} 题：答案存在重复选项。`);
          return;
        }
      }
      const analysis = item.analysis ?? item.explanation;
      const difficultyRaw = item.difficulty ?? item.level;
      const difficulty =
        difficultyRaw === undefined ? undefined : String(difficultyRaw).trim();
      const id = String(item.id ?? `q-${index + 1}`);

      const optionIds = new Set(options.map((option) => option.id));
      const invalidAnswers = answer.filter(
        (value) => !optionIds.has(value.trim()),
      );
      if (invalidAnswers.length > 0) {
        errors.push(`第 ${index + 1} 题：答案与选项不匹配。`);
        return;
      }

      questions.push({
        id,
        type,
        stem,
        options,
        answer: answer.map((value) => value.trim()),
        analysis: analysis ? String(analysis) : undefined,
        difficulty: difficulty || undefined,
      });
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  const courseLinkRaw = courseInput.link;
  const courseLink =
    typeof courseLinkRaw === 'string' && courseLinkRaw.trim()
      ? courseLinkRaw.trim()
      : undefined;
  const sourceRaw = metaInput.source;
  const source =
    typeof sourceRaw === 'string' && sourceRaw.trim()
      ? sourceRaw.trim()
      : undefined;
  const publishedRaw = metaInput.publishedAt;
  const publishedAt =
    typeof publishedRaw === 'string' && publishedRaw.trim()
      ? publishedRaw.trim()
      : undefined;

  const meta: BankMeta = {
    id: metaInput.id ? String(metaInput.id) : undefined,
    course: {
      code: courseCode,
      name: courseName,
      link: courseLink,
    },
    author,
    source,
    publishedAt,
    total: questions.length,
  };

  const warning =
    questions.length > 5000 ? '题目数量超过 5000，可能影响性能。' : undefined;

  return {
    bank: { meta, questions },
    errors,
    warning,
  };
}
