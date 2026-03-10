import { openDB, type IDBPDatabase } from 'idb';
import type { StoredFile, StoredAnnotations } from '@/types';

const DB_NAME = 'markdown-annotator';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' });
        }
        if (!db.objectStoreNames.contains('annotations')) {
          db.createObjectStore('annotations', { keyPath: 'path' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// --- File operations ---

export async function getAllFiles(): Promise<StoredFile[]> {
  const db = await getDb();
  return db.getAll('files');
}

export async function getFile(path: string): Promise<StoredFile | undefined> {
  const db = await getDb();
  return db.get('files', path);
}

export async function saveFile(file: StoredFile): Promise<void> {
  const db = await getDb();
  await db.put('files', file);
}

export async function deleteFileFromDb(path: string): Promise<void> {
  const db = await getDb();
  await db.delete('files', path);
}

// --- Annotation operations ---

export async function getAllAnnotations(): Promise<StoredAnnotations[]> {
  const db = await getDb();
  return db.getAll('annotations');
}

export async function getAnnotations(
  path: string,
): Promise<StoredAnnotations | undefined> {
  const db = await getDb();
  return db.get('annotations', path);
}

export async function saveAnnotations(
  ann: StoredAnnotations,
): Promise<void> {
  const db = await getDb();
  await db.put('annotations', ann);
}

export async function deleteAnnotationsFromDb(
  path: string,
): Promise<void> {
  const db = await getDb();
  await db.delete('annotations', path);
}

// --- Settings ---

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get('settings', key);
  return row?.value as T | undefined;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put('settings', { key, value });
}
