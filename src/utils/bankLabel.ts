/**
 * 字母标签 / 数字索引转换工具。
 *
 * 题目选项用字母标签标识（A, B, C…），
 * 而 schema 格式的答案用数字索引（0, 1, 2…），
 * 本模块提供两者间的双向转换函数。
 */

// ── Constants ───────────────────────────────────────────

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ── Label ←→ Index ─────────────────────────────────────

/** 数字索引 → 字母标签，如 0→"A", 1→"B"（超过 26 个选项时返回数字字符串） */
export function labelAt(index: number, total: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= total) return '';
  return total > LETTERS.length ? String(index + 1) : LETTERS[index];
}

/** 字母标签 → 数字索引，如 "A"→0, "B"→1 */
export function indexOf(label: string): number {
  return label.toUpperCase().charCodeAt(0) - 65;
}

// ── String → Label Resolvers ────────────────────────────

/** 尝试将字符串解析为字母标签并校验范围，成功返回标签，否则 undefined */
export function asLabel(raw: string, count: number): string | undefined {
  const upper = raw.trim().toUpperCase();
  if (!/^[A-Z]$/.test(upper)) return;
  const idx = indexOf(upper);
  return idx >= 0 && idx < count ? upper : undefined;
}

/** 尝试将字符串解析为数字索引再转成字母标签 */
export function asNumericLabel(raw: string, count: number): string | undefined {
  const num = Number(raw.trim());
  return Number.isFinite(num) && Number.isInteger(num)
    ? labelAt(num, count) || undefined
    : undefined;
}

// ── Arbitrary → Index ──────────────────────────────────

/** 任意值 → 数字索引（NaN 表示无效） */
export function toIndex(raw: unknown): number {
  if (raw === undefined || raw === null) return Number.NaN;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : Number.NaN;
  const text = String(raw).trim();
  if (!text) return Number.NaN;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
