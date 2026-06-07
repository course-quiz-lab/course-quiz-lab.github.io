import type { QuestionItem } from './bank';

/** Column mapping configuration for Excel import */
export interface ColumnMapping {
  typeCol: number | null;
  stemCol: number;
  optionCols: number[];
  answerCol: number;
  analysisCol: number | null;
  difficultyCol: number | null;
  hasHeader: boolean;
}

/** Raw parsed data from an Excel sheet */
export interface ExcelSheetData {
  headers: string[];
  rows: string[][];
}

/** Result of reading an Excel file */
export interface ExcelParseResult {
  sheetNames: string[];
  sheets: Record<string, ExcelSheetData>;
}

/** Preview data shown before confirming import */
export interface ExcelPreviewData {
  totalRows: number;
  typeBreakdown: Record<string, number>;
  samples: QuestionItem[];
  errors: string[];
  unsupportedRows: string[];
}
