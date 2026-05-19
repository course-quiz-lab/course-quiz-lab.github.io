import { openDB, type DBSchema } from 'idb';
import { toRaw } from 'vue';
import type { AttemptState, Bank, Mode } from '../types/quiz';

interface QuizDb extends DBSchema {
  banks: {
    key: string;
    value: Bank;
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
const DB_VERSION = 1;
const LAST_BANK_KEY = 'last-bank-id';

let dbPromise: ReturnType<typeof openDB<QuizDb>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<QuizDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('banks');
        db.createObjectStore('attempts');
        db.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

function attemptKey(bankId: string, mode: Mode) {
  return `${bankId}:${mode}`;
}

export async function saveBank(bankId: string, bank: Bank) {
  const db = await getDb();
  const raw = JSON.parse(JSON.stringify(toRaw(bank)));
  await db.put('banks', raw, bankId);
  await db.put('meta', bankId, LAST_BANK_KEY);
}

export async function loadBank(bankId: string) {
  const db = await getDb();
  return db.get('banks', bankId);
}

export async function clearBank(bankId: string) {
  const db = await getDb();
  await db.delete('banks', bankId);
  await db.delete('attempts', attemptKey(bankId, 'practice'));
  await db.delete('attempts', attemptKey(bankId, 'exam'));
}

export async function getLastBankId() {
  const db = await getDb();
  return db.get('meta', LAST_BANK_KEY);
}

export async function saveAttempt(attempt: AttemptState) {
  const db = await getDb();
  await db.put(
    'attempts',
    JSON.parse(JSON.stringify(toRaw(attempt))),
    attemptKey(attempt.bankId, attempt.mode),
  );
}

export async function loadAttempt(bankId: string, mode: Mode) {
  const db = await getDb();
  return db.get('attempts', attemptKey(bankId, mode));
}

export async function clearAttempt(bankId: string, mode: Mode) {
  const db = await getDb();
  await db.delete('attempts', attemptKey(bankId, mode));
}
