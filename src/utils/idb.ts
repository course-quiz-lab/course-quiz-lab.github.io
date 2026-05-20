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
const MAX_BANKS = 10;

let dbPromise: ReturnType<typeof openDB<QuizDb>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<QuizDb>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
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

const ATTEMPT_KEY = 'latest';

// ── Banks ────────────────────────────────────────────────

export async function saveBank(bankId: string, bank: Bank) {
  const db = await getDb();
  const raw = JSON.parse(JSON.stringify(toRaw(bank)));
  await db.put('banks', raw, bankId);
  await db.put('meta', bankId, LAST_BANK_KEY);
  // Also persist lightweight meta for listing
  await saveBankMeta(bankId, bank.meta);
  // Enforce 10-bank limit (skip if bank already existed → it's an update)
  await enforceBankLimit(MAX_BANKS, bankId);
}

export async function loadBank(bankId: string) {
  const db = await getDb();
  return db.get('banks', bankId);
}

export async function clearBank(bankId: string) {
  const db = await getDb();
  await db.delete('banks', bankId);
  await db.delete('bank-metas', bankId);
  // Also clear global attempt if it belongs to this bank
  const saved = await loadAttempt();
  if (saved?.bankId === bankId) {
    await clearAttempt();
  }
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

/**
 * If total metas exceed `max`, delete oldest entries.
 * `skipBankId` — if that bank already exists in the store, it's an update, not a new import.
 */
export async function enforceBankLimit(max = MAX_BANKS, skipBankId?: string) {
  const db = await getDb();
  const all = await db.getAll('bank-metas');
  const isUpdate = skipBankId
    ? all.some((e) => e.bankId === skipBankId)
    : false;
  if (isUpdate) return;
  if (all.length <= max) return;
  all.sort((a, b) => a.importedAt - b.importedAt);
  const toDelete = all.slice(0, all.length - max);
  for (const entry of toDelete) {
    await clearBank(entry.bankId);
  }
}

// ── Attempts (single latest) ────────────────────────────

export async function saveAttempt(attempt: AttemptState) {
  const db = await getDb();
  await db.put(
    'attempts',
    JSON.parse(JSON.stringify(toRaw(attempt))),
    ATTEMPT_KEY,
  );
}

export async function loadAttempt(): Promise<AttemptState | undefined> {
  const db = await getDb();
  return db.get('attempts', ATTEMPT_KEY);
}

export async function clearAttempt() {
  const db = await getDb();
  await db.delete('attempts', ATTEMPT_KEY);
}
