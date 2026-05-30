import * as XLSX from 'xlsx';
import {
  type ColumnMapping,
  type ExcelParseResult,
  type ExcelSheetData,
  type OptionItem,
  type QuestionItem,
  type QuestionType,
} from '../types/quiz';
import { normalizeType as normalizeTypeBase } from './bankNormalize';

function normalizeExcelType(raw: unknown): QuestionType | null {
  if (raw === undefined || raw === null) return null;
  // Try base first (English/numeric keywords)
  const base = normalizeTypeBase(raw);
  if (base) return base;
  // Chinese keywords specific to Excel import
  const value = String(raw).trim().toLowerCase();
  if (['单选题', '单项选择', '单选'].includes(value)) return 'single';
  if (['多选题', '多项选择', '多选'].includes(value)) return 'multiple';
  if (['判断题', '判断'].includes(value)) return 'judge';
  if (['不定项', '不定项选择', '不定项选择题'].includes(value))
    return 'indeterminate';
  return null;
}

// ── Read Excel file ─────────────────────────────────────

/**
 * Read an Excel file and return parsed sheet data.
 * Converts all values to strings for consistent handling.
 */
export function readExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        const sheets: Record<string, ExcelSheetData> = {};

        for (const name of sheetNames) {
          const worksheet = workbook.Sheets[name];
          const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false,
          });

          if (rawData.length === 0) {
            sheets[name] = { headers: [], rows: [] };
            continue;
          }

          // First row as potential headers
          const firstRow = rawData[0].map((v) => String(v ?? '').trim());
          const restRows = rawData
            .slice(1)
            .map((row) => row.map((v) => String(v ?? '').trim()));

          sheets[name] = {
            headers: firstRow,
            rows: restRows,
          };
        }

        resolve({ sheetNames, sheets });
      } catch (err) {
        reject(new Error('Excel 文件解析失败：' + (err as Error).message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Auto-detect column mapping from headers ─────────────

const TYPE_KEYWORDS = [
  '题型',
  '类型',
  'type',
  'questiontype',
  'question_type',
  'kind',
  '题型分类',
  '题目类型',
];
const STEM_KEYWORDS = [
  '题目',
  '题干',
  '试题',
  '问题',
  'stem',
  'question',
  'title',
  '内容',
  '考题',
  '题目内容',
];
const OPTION_KEYWORDS = ['选项', 'option', 'options', 'choice', 'choices'];
/** Headers that contain OPTION_KEYWORDS but should NOT be treated as option columns */
const OPTION_EXCLUDE = ['选项数', '选项个数', '选项数量', '选项数目'];
const ANSWER_KEYWORDS = [
  '答案',
  '正确答案',
  'answer',
  'correct',
  'key',
  '参考答案',
  '标准答案',
  '正确选项',
];
const ANALYSIS_KEYWORDS = [
  '解析',
  '答案解析',
  '分析',
  'explanation',
  'analysis',
  '详解',
  '解答',
];
const DIFFICULTY_KEYWORDS = [
  '难度',
  '难易度',
  'difficulty',
  'difficult',
  '难易',
  '等级',
  'level',
];

function matchKeyword(header: string, keywords: string[]): boolean {
  const lower = header.toLowerCase().replace(/[\s_\-（）()]/g, '');
  return keywords.some((kw) =>
    lower.includes(kw.toLowerCase().replace(/[\s_\-（）()]/g, '')),
  );
}

function isOptionLabel(header: string): boolean {
  const h = header.trim().toLowerCase();
  // Match patterns like "选项A", "选项1", "A", "optionA", "option1", "选项1"
  if (/^选项?[a-z0-9一二三四五六]$/i.test(h)) return true;
  if (/^[a-z]$/i.test(h) && h !== 'a') return false; // single letter but not 'a' (could be answer)
  if (/^[a-z][）)\s]/.test(h)) return true;
  if (/^option\s*[a-z0-9]/.test(h)) return true;
  return false;
}

/**
 * Try to auto-detect column mapping from header names.
 * Returns a partial mapping — user can adjust afterward.
 */
export function autoDetectMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {
    typeCol: null,
    stemCol: 0,
    optionCols: [],
    answerCol: headers.length - 1,
    analysisCol: null,
    difficultyCol: null,
    hasHeader: true,
  };

  let foundType = false;
  let foundStem = false;
  let foundAnswer = false;
  let foundAnalysis = false;
  let foundDifficulty = false;
  const optionCols: number[] = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!header) continue;

    // Type column
    if (!foundType && matchKeyword(header, TYPE_KEYWORDS)) {
      mapping.typeCol = i;
      foundType = true;
      continue;
    }

    // Stem column
    if (!foundStem && matchKeyword(header, STEM_KEYWORDS)) {
      mapping.stemCol = i;
      foundStem = true;
      continue;
    }

    // Answer column
    if (!foundAnswer && matchKeyword(header, ANSWER_KEYWORDS)) {
      mapping.answerCol = i;
      foundAnswer = true;
      continue;
    }

    // Analysis column
    if (!foundAnalysis && matchKeyword(header, ANALYSIS_KEYWORDS)) {
      mapping.analysisCol = i;
      foundAnalysis = true;
      continue;
    }

    // Difficulty column
    if (!foundDifficulty && matchKeyword(header, DIFFICULTY_KEYWORDS)) {
      mapping.difficultyCol = i;
      foundDifficulty = true;
      continue;
    }

    // Option columns
    if (
      (isOptionLabel(header) || matchKeyword(header, OPTION_KEYWORDS)) &&
      !OPTION_EXCLUDE.some((ex) => header.includes(ex))
    ) {
      optionCols.push(i);
    }
  }

  // If no option columns detected via keywords, try heuristic: columns between stem and answer
  if (optionCols.length === 0 && foundStem && foundAnswer) {
    const stemIdx = mapping.stemCol!;
    const ansIdx = mapping.answerCol!;
    const start = Math.min(stemIdx, ansIdx) + 1;
    const end = Math.max(stemIdx, ansIdx);
    for (let i = start; i < end; i++) {
      if (i !== stemIdx && i !== ansIdx) {
        optionCols.push(i);
      }
    }
  }

  mapping.optionCols = optionCols;
  return mapping;
}

// ── Smart type inference from answer column ────────────

const JUDGE_ANSWER_SET = new Set([
  '对',
  '错',
  '正确',
  '错误',
  '是',
  '否',
  't',
  'f',
  'true',
  'false',
  '√',
  '×',
  '✓',
  '✗',
  '正确',
  '错误',
]);
const MULTI_SEPARATOR_RE = /[,、;；]/;

/**
 * Infer question type from answer values across all rows.
 * Scans the answer column to determine the most likely type.
 */
export function inferTypeFromAnswers(
  rows: string[][],
  answerCol: number,
): QuestionType {
  let judgeCount = 0;
  let multiCount = 0;
  let totalNonEmpty = 0;

  for (const row of rows) {
    const answer = (row[answerCol] ?? '').trim();
    if (!answer) continue;
    totalNonEmpty++;

    // Check if answer looks like judge (对/错/T/F etc.)
    if (JUDGE_ANSWER_SET.has(answer.toLowerCase())) {
      judgeCount++;
      continue;
    }

    // Check if answer contains multiple values separated by delimiters
    if (MULTI_SEPARATOR_RE.test(answer)) {
      multiCount++;
      continue;
    }

    // Check if answer is multiple letters like "ACD"
    if (/^[a-z]{2,}$/i.test(answer)) {
      multiCount++;
      continue;
    }
  }

  if (totalNonEmpty === 0) return 'single';

  // If more than half are judge-like, it's a judge bank
  if (judgeCount / totalNonEmpty > 0.5) return 'judge';
  // If significant portion is multi, it's multiple
  if (multiCount / totalNonEmpty > 0.3) return 'multiple';

  return 'single';
}

/**
 * Infer type for a single row based on its answer value.
 */
export function inferTypeFromAnswer(answer: string): QuestionType {
  const trimmed = answer.trim();
  if (!trimmed) return 'single';

  if (JUDGE_ANSWER_SET.has(trimmed.toLowerCase())) return 'judge';

  if (MULTI_SEPARATOR_RE.test(trimmed)) return 'multiple';

  if (/^[a-z]{2,}$/i.test(trimmed)) return 'multiple';

  return 'single';
}

// ── Parse questions with mapping ───────────────────────

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function buildOptionLabel(index: number, total: number): string {
  if (total > LETTERS.length) return String(index + 1);
  return LETTERS[index] ?? String(index + 1);
}

function normalizeAnswerValue(
  answer: string,
  type: QuestionType,
  optionsCount: number,
): string[] | null {
  const trimmed = answer.trim();
  if (!trimmed) return null;

  if (type === 'judge') {
    const val = trimmed.toLowerCase();
    if (['t', 'true', '1', '正确', '是', '对', '√', '✓'].includes(val))
      return ['T'];
    if (['f', 'false', '0', '错误', '否', '错', '×', '✗'].includes(val))
      return ['F'];
    return null;
  }

  // Try to match answer as letter index
  const upper = trimmed.toUpperCase();

  // Single letter like "B" → index 1
  if (/^[A-Z]$/.test(upper)) {
    const idx = upper.charCodeAt(0) - 65;
    if (idx >= 0 && idx < optionsCount) return [upper];
  }

  // Numeric index → convert to letter
  const num = Number(trimmed);
  if (Number.isFinite(num) && Number.isInteger(num)) {
    const label = buildOptionLabel(num, optionsCount);
    if (label) return [label];
  }

  if (type === 'multiple') {
    // Comma/separator separated: "A,B,C" or "A、B、C"
    const parts = trimmed
      .split(MULTI_SEPARATOR_RE)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const validParts = parts.filter((p) => /^[A-Z]$/.test(p));
    if (validParts.length > 0) return validParts;

    // Multiple letters like "ACD"
    const letters = [...trimmed]
      .map((c) => c.toUpperCase())
      .filter((c) => /^[A-Z]$/.test(c));
    if (letters.length >= 2) return letters;
  }

  // Single: try multi-separator but only take first
  if (type === 'single') {
    const first = trimmed.split(MULTI_SEPARATOR_RE)[0]?.trim().toUpperCase();
    if (/^[A-Z]$/.test(first)) return [first];
  }

  return null;
}

export interface ParseQuestionsResult {
  questions: QuestionItem[];
  errors: string[];
  unsupportedRows: string[];
}

/**
 * Parse rows from an Excel sheet into QuestionItem[] using the provided column mapping.
 */
export function parseQuestionsWithMapping(
  rows: string[][],
  mapping: ColumnMapping,
): ParseQuestionsResult {
  const questions: QuestionItem[] = [];
  const errors: string[] = [];
  const unsupportedRows: string[] = [];

  // If no type column, pre-infer type for the whole dataset
  let globalInferredType: QuestionType | null = null;
  if (mapping.typeCol === null) {
    globalInferredType = inferTypeFromAnswers(rows, mapping.answerCol);
  }

  // Build set of columns occupied by type/stem/options/answer
  const mappedCols = new Set<number>();
  if (mapping.typeCol !== null) mappedCols.add(mapping.typeCol);
  mappedCols.add(mapping.stemCol);
  mappedCols.add(mapping.answerCol);
  if (mapping.analysisCol !== null) mappedCols.add(mapping.analysisCol);
  if (mapping.difficultyCol !== null) mappedCols.add(mapping.difficultyCol);
  for (const c of mapping.optionCols) mappedCols.add(c);

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];

    // Treat "—" (em dash), "-", "—" as empty values
    const isEmptyValue = (v: string) => {
      const t = (v ?? '').trim();
      return !t || t === '—' || t === '-' || t === '–';
    };

    // Check stem — try primary column first, then fallback to other unmapped columns
    let stem = (row[mapping.stemCol] ?? '').trim();
    if (isEmptyValue(stem)) {
      // Try other unmapped columns for a stem
      for (let c = 0; c < row.length; c++) {
        if (mappedCols.has(c)) continue;
        const val = (row[c] ?? '').trim();
        if (!isEmptyValue(val)) {
          stem = val;
          break;
        }
      }
    }

    if (!stem) {
      // Skip completely empty rows
      const hasContent =
        mapping.optionCols.some((c) => !isEmptyValue(row[c])) ||
        !isEmptyValue(row[mapping.answerCol]);
      if (!hasContent) continue;
      errors.push(`第 ${rowIdx + 1} 行：题干为空`);
      continue;
    }

    // Determine type
    let type: QuestionType;
    if (mapping.typeCol !== null) {
      const rawType = (row[mapping.typeCol] ?? '').trim();
      const normalized = normalizeExcelType(rawType);
      if (!normalized) {
        unsupportedRows.push(
          `第 ${rowIdx + 1} 行：无法识别题型「${rawType || '空'}」，已跳过`,
        );
        continue;
      }
      type = normalized;
    } else if (globalInferredType) {
      // Use global inference, but also do per-row check for judge
      const answer = (row[mapping.answerCol] ?? '').trim();
      type = inferTypeFromAnswer(answer);
    } else {
      type = 'single';
    }

    // Collect options (skip empty and em-dash placeholders)
    const rawOptions: string[] = [];
    for (const colIdx of mapping.optionCols) {
      const val = (row[colIdx] ?? '').trim();
      if (!isEmptyValue(val)) rawOptions.push(val);
    }

    if (rawOptions.length < 2 && type !== 'judge') {
      errors.push(`第 ${rowIdx + 1} 行：有效选项不足 2 个`);
      continue;
    }

    // Detect judge-in-disguise: options look like "正确"/"错误" but type is 'single'
    if (type !== 'judge' && rawOptions.length >= 2) {
      const optLower = rawOptions.slice(0, 2).map((o) => o.toLowerCase());
      const hasJudgeOpts =
        (optLower[0].includes('对') || optLower[0].includes('正')) &&
        (optLower[1].includes('错') || optLower[1].includes('误'));
      if (hasJudgeOpts) {
        type = 'judge';
      }
    }

    // Build proper OptionItem[]
    let options: OptionItem[];
    if (type === 'judge') {
      options = [
        { id: 'T', text: '正确', index: 0 },
        { id: 'F', text: '错误', index: 1 },
      ];
    } else {
      options = rawOptions.map((text, index) => ({
        id: buildOptionLabel(index, rawOptions.length),
        text,
        index,
      }));
    }

    // Parse answer
    const rawAnswer = (row[mapping.answerCol] ?? '').trim();
    if (isEmptyValue(rawAnswer)) {
      unsupportedRows.push(`第 ${rowIdx + 1} 行：答案为空，已跳过`);
      continue;
    }
    let answer = normalizeAnswerValue(rawAnswer, type, options.length);

    // For judge, also try by matching content of answer to option text
    if (!answer || answer.length === 0) {
      if (type === 'judge') {
        // Case: judge question with A/B/C/D style options where
        // A="正确", B="错误" and answer is written as "A" or "B"
        const upperAns = rawAnswer.toUpperCase();
        if (/^[A-Z]$/.test(upperAns) && rawOptions.length >= 2) {
          const idx = upperAns.charCodeAt(0) - 65;
          if (idx >= 0 && idx < rawOptions.length) {
            const optText = rawOptions[idx].toLowerCase();
            if (
              optText.includes('对') ||
              optText.includes('正') ||
              optText === 't'
            ) {
              answer = ['T'];
            } else if (
              optText.includes('错') ||
              optText.includes('误') ||
              optText === 'f'
            ) {
              answer = ['F'];
            }
          }
        }
        // Also handle numeric index answer (0 or 1)
        if (!answer) {
          const num = Number(rawAnswer);
          if (
            Number.isFinite(num) &&
            Number.isInteger(num) &&
            rawOptions.length >= 2
          ) {
            const idx = Math.max(0, Math.min(num, rawOptions.length - 1));
            const optText = rawOptions[idx].toLowerCase();
            if (
              optText.includes('对') ||
              optText.includes('正') ||
              optText === 't'
            ) {
              answer = ['T'];
            } else if (
              optText.includes('错') ||
              optText.includes('误') ||
              optText === 'f'
            ) {
              answer = ['F'];
            }
          }
        }

        // Fallback: try matching by option text content
        if (!answer) {
          const lowerAns = rawAnswer.toLowerCase();
          if (
            lowerAns.includes('对') ||
            lowerAns.includes('正') ||
            lowerAns === 't' ||
            lowerAns === 'true' ||
            lowerAns === '1' ||
            lowerAns === '√'
          ) {
            answer = ['T'];
          } else if (
            lowerAns.includes('错') ||
            lowerAns.includes('误') ||
            lowerAns === 'f' ||
            lowerAns === 'false' ||
            lowerAns === '0' ||
            lowerAns === '×'
          ) {
            answer = ['F'];
          }
        }
      } else {
        // Try matching answer to option text (e.g. answer column says "正确" and option text is "正确")
        for (const opt of options) {
          if (opt.text.toLowerCase() === rawAnswer.toLowerCase()) {
            answer = [opt.id];
            break;
          }
        }
      }
    }

    if (!answer || answer.length === 0) {
      unsupportedRows.push(
        `第 ${rowIdx + 1} 行：答案「${rawAnswer}」无法识别，已跳过`,
      );
      continue;
    }

    // Validate answer against options
    const optionIds = new Set(options.map((o) => o.id));
    const validAnswers = answer.filter((a) => optionIds.has(a));
    if (validAnswers.length === 0) {
      unsupportedRows.push(`第 ${rowIdx + 1} 行：答案与选项不匹配，已跳过`);
      continue;
    }

    // Read optional analysis and difficulty
    let analysis: string | undefined;
    let difficulty: string | undefined;
    if (mapping.analysisCol !== null) {
      const val = (row[mapping.analysisCol] ?? '').trim();
      if (!isEmptyValue(val)) analysis = val;
    }
    if (mapping.difficultyCol !== null) {
      const val = (row[mapping.difficultyCol] ?? '').trim();
      if (!isEmptyValue(val)) difficulty = val;
    }

    questions.push({
      id: `q-excel-${rowIdx + 1}`,
      type,
      stem,
      options,
      answer: validAnswers,
      ...(analysis ? { analysis } : {}),
      ...(difficulty ? { difficulty } : {}),
    });
  }

  return { questions, errors, unsupportedRows };
}

/**
 * Group questions by type and pick samples (first of each type) for preview.
 */
export function buildPreviewData(
  questions: QuestionItem[],
  errors: string[],
  unsupportedRows: string[],
) {
  const typeBreakdown: Record<string, number> = {};
  const samples: QuestionItem[] = [];
  const seenTypes = new Set<QuestionType>();

  for (const q of questions) {
    typeBreakdown[q.type] = (typeBreakdown[q.type] ?? 0) + 1;
    if (!seenTypes.has(q.type)) {
      seenTypes.add(q.type);
      samples.push(q);
    }
  }

  return {
    totalRows: questions.length,
    typeBreakdown,
    samples,
    errors,
    unsupportedRows,
  };
}
