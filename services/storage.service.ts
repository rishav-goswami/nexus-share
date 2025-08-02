
import { openDB, IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, ITEMS_STORE_NAME, FILES_STORE_NAME } from '../constants';
import type { SharedItem } from '../types';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(ITEMS_STORE_NAME)) {
        const store = db.createObjectStore(ITEMS_STORE_NAME, { keyPath: 'id' });
        store.createIndex('roomId', 'roomId');
      }
      if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
        db.createObjectStore(FILES_STORE_NAME);
      }
    },
  });
  return dbPromise;
};

export const storageService = {
  async addItem(item: SharedItem): Promise<void> {
    const db = await initDB();
    await db.put(ITEMS_STORE_NAME, item);
  },

  async getItems(roomId: string): Promise<SharedItem[]> {
    const db = await initDB();
    const items = await db.getAllFromIndex(ITEMS_STORE_NAME, 'roomId', roomId);
    return items.sort((a, b) => a.timestamp - b.timestamp);
  },

  async storeFile(fileId: string, blob: Blob): Promise<void> {
    const db = await initDB();
    await db.put(FILES_STORE_NAME, blob, fileId);
  },

  async getFile(fileId: string): Promise<Blob | undefined> {
    const db = await initDB();
    return db.get(FILES_STORE_NAME, fileId);
  },

  async hasFile(fileId: string): Promise<boolean> {
    const db = await initDB();
    const file = await db.getKey(FILES_STORE_NAME, fileId);
    return file !== undefined;
  },

  async deleteItem(itemId: string): Promise<void> {
    const db = await initDB();
    await db.delete(ITEMS_STORE_NAME, itemId);
  },

  async deleteFile(fileId: string): Promise<void> {
    const db = await initDB();
    await db.delete(FILES_STORE_NAME, fileId);
  },
};
