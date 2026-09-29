import type { StoredAnalysis } from '../analysis/contract';

const DATABASE_NAME = 'darkroom-local';
const DATABASE_VERSION = 1;
const STORE_NAME = 'analyses';
const MAX_HISTORY_ITEMS = 30;

// Keep this address stable so local browser data survives normal project-folder
// migrations. `localhost` and `127.0.0.1` are different browser origins.
export const DEFAULT_LOCAL_ORIGIN = 'http://127.0.0.1:4174';

export function getHistoryOriginHint(currentOrigin: string): string | null {
  if (!currentOrigin || currentOrigin === DEFAULT_LOCAL_ORIGIN) return null;
  return `历史记录按网址保存在当前浏览器。你之前如果使用过 ${DEFAULT_LOCAL_ORIGIN}，请回到那个地址查看；迁移项目文件夹本身不会删除原记录。`;
}

export type AnalysisHistoryRecord = StoredAnalysis & {
  id: string;
  createdAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地历史记录'));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('本地历史记录写入失败'));
    transaction.onabort = () => reject(transaction.error ?? new Error('本地历史记录写入已取消'));
  });
}

export function createHistoryRecord(stored: StoredAnalysis): AnalysisHistoryRecord {
  return {
    ...stored,
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
}

export async function saveAnalysisHistory(stored: StoredAnalysis): Promise<AnalysisHistoryRecord> {
  const database = await openDatabase();
  const record = createHistoryRecord(stored);
  try {
    const write = database.transaction(STORE_NAME, 'readwrite');
    write.objectStore(STORE_NAME).put(record);
    await waitForTransaction(write);

    const records = await listAnalysisHistory(database);
    if (records.length > MAX_HISTORY_ITEMS) {
      const cleanup = database.transaction(STORE_NAME, 'readwrite');
      const store = cleanup.objectStore(STORE_NAME);
      for (const oldRecord of records.slice(MAX_HISTORY_ITEMS)) store.delete(oldRecord.id);
      await waitForTransaction(cleanup);
    }
    return record;
  } finally {
    database.close();
  }
}

export async function listAnalysisHistory(existingDatabase?: IDBDatabase): Promise<AnalysisHistoryRecord[]> {
  const database = existingDatabase ?? await openDatabase();
  try {
    const records = await new Promise<AnalysisHistoryRecord[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onerror = () => reject(request.error ?? new Error('无法读取本地历史记录'));
      request.onsuccess = () => resolve(request.result as AnalysisHistoryRecord[]);
    });
    return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } finally {
    if (!existingDatabase) database.close();
  }
}

export async function deleteAnalysisHistory(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}
