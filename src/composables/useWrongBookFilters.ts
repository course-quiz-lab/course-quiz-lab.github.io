import { computed, reactive, ref, watch } from 'vue';
import type { QuestionType } from '../types/core';
import type {
  WrongBookFilterOptions,
  WrongBookFilterState,
} from '../utils/wrongbook';

/**
 * 错题本筛选只做「仅显示」：多选即只显示选中项，空数组表示全部。
 * 仅持久化三组筛选值；搜索关键词不缓存，每次进入页面清空。
 */
const STORAGE_KEY = 'quiz-wrongbook-filters';

const QUESTION_TYPES: QuestionType[] = [
  'single',
  'multiple',
  'indeterminate',
  'judge',
];

function isQuestionType(value: unknown): value is QuestionType {
  return (
    typeof value === 'string' &&
    QUESTION_TYPES.includes(value as QuestionType)
  );
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );
}

function readStoredFilters(): WrongBookFilterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { types: [], courses: [], banks: [] };

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      types: readStringArray(parsed?.types).filter(isQuestionType),
      courses: readStringArray(parsed?.courses),
      banks: readStringArray(parsed?.banks),
    };
  } catch {
    return { types: [], courses: [], banks: [] };
  }
}

function persistFilters(filters: WrongBookFilterState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* 隐私模式等场景下写失败时静默降级为不持久化 */
  }
}

function intersect(values: string[], available: string[]) {
  const availableSet = new Set(available);
  return values.filter((value) => availableSet.has(value));
}

function isSameArray(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function useWrongBookFilters() {
  const stored = readStoredFilters();
  const filters = reactive<WrongBookFilterState>({
    types: stored.types,
    courses: stored.courses,
    banks: stored.banks,
  });

  /** 搜索词并入筛选条件，但不持久化：每次进入页面清空 */
  const searchQuery = ref('');

  watch(
    filters,
    (value) => {
      persistFilters({
        types: [...value.types],
        courses: [...value.courses],
        banks: [...value.banks],
      });
    },
    { deep: true },
  );

  const hasActiveFilters = computed(
    () =>
      searchQuery.value.trim().length > 0 ||
      filters.types.length > 0 ||
      filters.courses.length > 0 ||
      filters.banks.length > 0,
  );

  /**
   * 数据加载后调用：把持久化的选择与当前可用选项求交集。
   * 题库删除或试卷清理后，失效选项不会让列表恒为空。
   */
  function syncWithOptions(options: WrongBookFilterOptions) {
    const types = intersect(
      filters.types,
      options.types.map((option) => option.value),
    ).filter(isQuestionType);
    const courses = intersect(
      filters.courses,
      options.courses.map((option) => option.value),
    );
    const banks = intersect(
      filters.banks,
      options.banks.map((option) => option.value),
    );

    if (!isSameArray(filters.types, types)) filters.types = types;
    if (!isSameArray(filters.courses, courses)) filters.courses = courses;
    if (!isSameArray(filters.banks, banks)) filters.banks = banks;
  }

  /** 一键清除全部筛选条件（含搜索词） */
  function clearFilters() {
    filters.types = [];
    filters.courses = [];
    filters.banks = [];
    searchQuery.value = '';
  }

  return {
    filters,
    searchQuery,
    hasActiveFilters,
    syncWithOptions,
    clearFilters,
  };
}
