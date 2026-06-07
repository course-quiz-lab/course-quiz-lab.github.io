import { openDB, type DBSchema } from 'idb';
import { toRaw } from 'vue';
import type { AttemptState } from '../types/quiz';
import type { Bank, BankMeta } from '../types/bank';
import type { Paper, PaperAttempt } from '../types/quiz';

interface BankMetaEntry {
  bankId: string;
  meta: BankMeta;
  importedAt: number;
}

interface QuizDb extends DBSchema {
  banks: {
    key: string;
    value: Bank;
  };
  'bank-metas': {
    key: string;
    value: BankMetaEntry;
  };
  attempts: {
    key: string;
    value: AttemptState;
  };
  papers: {
    key: string;
    value: Paper;
  };
  'paper-attempts': {
    key: string;
    value: PaperAttempt;
    indexes: { 'by-paper': string };
  };
  meta: {
    key: string;
    value: string;
  };
}

const DB_NAME = 'quiz-lab';
const DB_VERSION = 4;
const LAST_BANK_KEY = 'last-bank-id';

let dbPromise: ReturnType<typeof openDB<QuizDb>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<QuizDb>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, _transaction) {
        // Use contains() checks to safely create missing stores regardless of version history
        if (!db.objectStoreNames.contains('banks')) {
          db.createObjectStore('banks');
        }
        if (!db.objectStoreNames.contains('attempts')) {
          db.createObjectStore('attempts');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('bank-metas')) {
          db.createObjectStore('bank-metas');
        }
        if (!db.objectStoreNames.contains('papers')) {
          db.createObjectStore('papers');
        }
        if (!db.objectStoreNames.contains('paper-attempts')) {
          const paperAttemptsStore = db.createObjectStore('paper-attempts');
          paperAttemptsStore.createIndex('by-paper', 'paperId');
        }
      },
    });
  }
  return dbPromise;
}

// ── Banks ────────────────────────────────────────────────

export async function saveBank(bankId: string, bank: Bank) {
  const db = await getDb();
  const raw = JSON.parse(JSON.stringify(toRaw(bank)));
  await db.put('banks', raw, bankId);
  await db.put('meta', bankId, LAST_BANK_KEY);
  await saveBankMeta(bankId, bank.meta);
}

export async function loadBank(bankId: string) {
  const db = await getDb();
  return db.get('banks', bankId);
}

export async function clearBank(bankId: string) {
  const db = await getDb();
  await db.delete('banks', bankId);
  await db.delete('bank-metas', bankId);
  await clearAttempt(bankId);
}

export async function getLastBankId() {
  const db = await getDb();
  return db.get('meta', LAST_BANK_KEY);
}

// ── Bank Metas (lightweight listing) ─────────────────────

export async function saveBankMeta(bankId: string, meta: BankMeta) {
  const db = await getDb();
  const entry: BankMetaEntry = {
    bankId,
    meta: JSON.parse(JSON.stringify(toRaw(meta))),
    importedAt: Date.now(),
  };
  await db.put('bank-metas', entry, bankId);
}

export async function listBankMetas(): Promise<BankMetaEntry[]> {
  const db = await getDb();
  const entries = await db.getAll('bank-metas');
  entries.sort((a, b) => b.importedAt - a.importedAt);
  return entries;
}

export async function deleteBankMeta(bankId: string) {
  const db = await getDb();
  await db.delete('bank-metas', bankId);
}

export async function bankMetaExists(bankId: string): Promise<boolean> {
  const db = await getDb();
  const entry = await db.get('bank-metas', bankId);
  return !!entry;
}

// ── Attempts (one per bank) ────────────────────────────

export async function saveAttempt(attempt: AttemptState) {
  const db = await getDb();
  await db.put(
    'attempts',
    JSON.parse(JSON.stringify(toRaw(attempt))),
    attempt.bankId,
  );
}

export async function loadAttempt(
  bankId: string,
): Promise<AttemptState | undefined> {
  const db = await getDb();
  return db.get('attempts', bankId);
}

export async function clearAttempt(bankId: string) {
  const db = await getDb();
  await db.delete('attempts', bankId);
}

/** 列出所有有作答记录的题库 ID */
export async function listAttemptBankIds(): Promise<string[]> {
  const db = await getDb();
  const keys = await db.getAllKeys('attempts');
  return keys.filter((k): k is string => typeof k === 'string');
}

// ── Papers ────────────────────────────────────────────────

export async function savePaper(paper: Paper) {
  const db = await getDb();
  await db.put('papers', JSON.parse(JSON.stringify(toRaw(paper))), paper.id);
}

export async function loadPaper(paperId: string): Promise<Paper | undefined> {
  const db = await getDb();
  return db.get('papers', paperId);
}

export async function listPapers(): Promise<Paper[]> {
  const db = await getDb();
  const papers = await db.getAll('papers');
  papers.sort((a, b) => b.createdAt - a.createdAt);
  return papers;
}

export async function deletePaper(paperId: string) {
  const db = await getDb();
  await db.delete('papers', paperId);
  // Delete associated attempts
  const attempts = await listPaperAttempts(paperId);
  for (const attempt of attempts) {
    await db.delete('paper-attempts', attempt.id);
  }
}

// ── Paper Attempts ────────────────────────────────────────

export async function savePaperAttempt(attempt: PaperAttempt) {
  const db = await getDb();
  await db.put(
    'paper-attempts',
    JSON.parse(JSON.stringify(toRaw(attempt))),
    attempt.id,
  );
}

export async function loadPaperAttempt(
  attemptId: string,
): Promise<PaperAttempt | undefined> {
  const db = await getDb();
  return db.get('paper-attempts', attemptId);
}

export async function listPaperAttempts(
  paperId?: string,
): Promise<PaperAttempt[]> {
  const db = await getDb();
  let attempts: PaperAttempt[] = [];
  if (paperId) {
    attempts = await db.getAllFromIndex('paper-attempts', 'by-paper', paperId);
  } else {
    attempts = await db.getAll('paper-attempts');
  }
  attempts.sort((a, b) => b.startedAt - a.startedAt);
  return attempts;
}

export async function deletePaperAttempt(attemptId: string) {
  const db = await getDb();
  await db.delete('paper-attempts', attemptId);
}
