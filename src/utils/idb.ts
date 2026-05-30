import { openDB, type DBSchema } from 'idb';
import { toRaw } from 'vue';
import type { AttemptState, Bank, BankMeta } from '../types/quiz';

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
  meta: {
    key: string;
    value: string;
  };
}

const DB_NAME = 'quiz-lab';
const DB_VERSION = 2;
const LAST_BANK_KEY = 'last-bank-id';

let dbPromise: ReturnType<typeof openDB<QuizDb>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<QuizDb>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, _transaction) {
        if (oldVersion < 1) {
          db.createObjectStore('banks');
          db.createObjectStore('attempts');
          db.createObjectStore('meta');
        }
        if (oldVersion < 2) {
          db.createObjectStore('bank-metas');
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
