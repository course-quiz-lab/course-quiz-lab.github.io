import type {
  Bank,
  BankMeta,
  OptionItem,
  QuestionItem,
  QuestionType,
} from '../types/quiz';
import { simpleHash } from './hash';

export interface ValidationResult {
  bank?: Bank;
  errors: string[];
  warning?: string;
}

const DEFAULT_JUDGE_OPTIONS: OptionItem[] = [
  { id: 'T', text: '正确' },
  { id: 'F', text: '错误' },
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function normalizeType(raw: unknown): QuestionType | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).toLowerCase();
  if (['single', 'single-choice', 'sc', 'radio'].includes(value))
    return 'single';
  if (['multiple', 'multi', 'mc', 'checkbox'].includes(value))
    return 'multiple';
  if (['judge', 'true-false', 'tf', 'boolean'].includes(value)) return 'judge';
  return null;
}

function normalizeOptionList(
  raw: unknown,
  type: QuestionType,
): OptionItem[] | null {
  if (type === 'judge') {
    return DEFAULT_JUDGE_OPTIONS;
  }
  if (!Array.isArray(raw)) return null;
  if (raw.length < 2) return null;
  const items: OptionItem[] = [];
  raw.forEach((item, index) => {
    if (typeof item === 'string') {
      const id = LETTERS[index] ?? `O${index + 1}`;
      items.push({ id, text: item });
      return;
    }
    if (typeof item === 'object' && item) {
      const candidate = item as {
        id?: unknown;
        label?: unknown;
        text?: unknown;
      };
      const id = String(
        candidate.id ?? candidate.label ?? LETTERS[index] ?? `O${index + 1}`,
      );
      const text = String(
        candidate.text ?? candidate.label ?? candidate.id ?? '',
      );
      items.push({ id, text });
    }
  });
  return items.length >= 2 ? items : null;
}

function normalizeAnswer(raw: unknown, type: QuestionType): string[] | null {
  if (raw === undefined || raw === null) return null;
  if (type === 'judge') {
    if (typeof raw === 'boolean') return [raw ? 'T' : 'F'];
    const value = String(raw).toLowerCase();
    if (['t', 'true', '1', '正确', '是', '对'].includes(value)) return ['T'];
    if (['f', 'false', '0', '错误', '否', '错'].includes(value)) return ['F'];
    return null;
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }
  const value = String(raw);
  if (value.includes(',') || value.includes('、') || value.includes(';')) {
    return value
      .split(/[,、;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [value];
}

export function buildBankId(bank: Bank) {
  if (bank.meta.id) return bank.meta.id;
  const payload = `${bank.meta.title}:${bank.questions.length}`;
  return `bank-${simpleHash(payload)}`;
}

export function validateBankSchema(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { errors: ['文件内容不是有效的对象。'] };
  }

  const input = raw as Record<string, unknown>;
  const metaInput = (input.meta ?? input.metadata ?? {}) as Record<
    string,
    unknown
  >;
  const title = String(metaInput.title ?? metaInput.name ?? '');
  if (!title) {
    errors.push('题库缺少标题。');
  }

  const questionsInput = input.questions ?? input.items ?? input.list;
  if (!Array.isArray(questionsInput) || questionsInput.length === 0) {
    errors.push('题目列表为空或格式不正确。');
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
      const stem = String(item.stem ?? item.title ?? item.question ?? '');
      if (!stem) {
        errors.push(`第 ${index + 1} 题：题干为空。`);
        return;
      }
      const options = normalizeOptionList(
        item.options ?? item.choices ?? item.optionList,
        type,
      );
      if (!options) {
        errors.push(`第 ${index + 1} 题：选项格式不正确。`);
        return;
      }
      const answer = normalizeAnswer(
        item.answer ?? item.answers ?? item.correct,
        type,
      );
      if (!answer || answer.length === 0) {
        errors.push(`第 ${index + 1} 题：答案缺失或无效。`);
        return;
      }
      if (type === 'single' && answer.length !== 1) {
        errors.push(`第 ${index + 1} 题：单选题答案只能有一个。`);
        return;
      }
      const analysis = item.analysis ?? item.explanation;
      const difficultyRaw = item.difficulty ?? item.level;
      const difficulty =
        difficultyRaw === undefined ? undefined : Number(difficultyRaw);
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
        difficulty: Number.isFinite(difficulty) ? difficulty : undefined,
      });
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  const meta: BankMeta = {
    id: metaInput.id ? String(metaInput.id) : undefined,
    title,
    description: metaInput.description
      ? String(metaInput.description)
      : undefined,
    subject: metaInput.subject ? String(metaInput.subject) : undefined,
    version: metaInput.version ? String(metaInput.version) : undefined,
    source: metaInput.source ? String(metaInput.source) : undefined,
    createdAt: metaInput.createdAt ? String(metaInput.createdAt) : undefined,
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
