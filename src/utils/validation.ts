/**
 * 题库 schema 校验器。
 *
 * 职责：
 * 1. 校验用户提供的 JSON 是否符合题库 schema
 * 2. 将各种输入格式归一化为内部统一的 Bank 结构
 * 3. 生成题库唯一标识
 *
 * 题型/选项/答案的归一化逻辑委托给 ./bank-normalize，
 * 字母标签转换委托给 ./bank-label。
 */

import {
  isMultiSelectType,
  type Bank,
  type BankMeta,
  type QuestionItem,
} from '../types/quiz';
import {
  normalizeAnswer,
  normalizeOptionList,
  normalizeType,
} from './bankNormalize';
import { simpleHash } from './hash';

export interface ValidationResult {
  bank?: Bank;
  errors: string[];
  warning?: string;
}

// ── Bank ID ─────────────────────────────────────────────

export function buildBankId(bank: Bank) {
  if (bank.meta.id) return bank.meta.id;
  const courseId = bank.meta.course || 'unknown';
  const payload = `${courseId}:${bank.meta.author}:${bank.questions.length}`;
  return `bank-${simpleHash(payload)}`;
}

// ── Schema Validation ───────────────────────────────────

export function validateBankSchema(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { errors: ['文件内容不是有效的对象。'] };
  }

  const input = raw as Record<string, unknown>;
  const hasMeta = input.meta && typeof input.meta === 'object';
  const hasMetadata = input.metadata && typeof input.metadata === 'object';
  if (!hasMeta && !hasMetadata) {
    errors.push('元数据 meta/metadata 缺失或格式不正确。');
  }

  const metaInput = (input.metadata ?? input.meta ?? {}) as Record<
    string,
    unknown
  >;

  // 兼容新旧两种格式：新 schema course 为字符串，旧为对象
  const courseRaw = metaInput.course;
  const courseName =
    typeof courseRaw === 'string'
      ? courseRaw.trim()
      : String((courseRaw as Record<string, unknown>)?.name ?? '').trim();
  const bankName = String(metaInput.name ?? courseName ?? '').trim();
  const author = String(metaInput.author ?? '').trim();

  if (!bankName) errors.push('元数据缺少题库名称（name）。');
  if (!courseName) errors.push('元数据缺少课程名称（course）。');
  if (!author) errors.push('元数据缺少作者（author）。');

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

  if (errors.length > 0) return { errors };

  const source =
    typeof metaInput.source === 'string' && metaInput.source.trim()
      ? metaInput.source.trim()
      : undefined;
  const sourceUrl =
    typeof metaInput.sourceUrl === 'string' && metaInput.sourceUrl.trim()
      ? metaInput.sourceUrl.trim()
      : undefined;

  const meta: BankMeta = {
    id: metaInput.id ? String(metaInput.id) : undefined,
    name: bankName,
    course: courseName,
    author,
    source,
    sourceUrl,
    total: questions.length,
  };

  const warning =
    questions.length > 5000 ? '题目数量超过 5000，可能影响性能。' : undefined;

  const schemaRef =
    typeof input.$schema === 'string' ? input.$schema : undefined;

  return {
    bank: { $schema: schemaRef, meta, questions },
    errors,
    warning,
  };
}
