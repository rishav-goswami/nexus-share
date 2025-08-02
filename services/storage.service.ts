
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

  async getItem(itemId: string): Promise<SharedItem | undefined> {
    const db = await initDB();
    return db.get(ITEMS_STORE_NAME, itemId);
  },

  async getItems(roomId: string): Promise<SharedItem[]> {
    const db = await initDB();
    const items = await db.getAllFromIndex(ITEMS_STORE_NAME, 'roomId', roomId);
    return items.sort((a, b) => a.createdAt - b.createdAt);
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

  async cleanupOldItems(): Promise<void> {
    const db = await initDB();
    const tx = db.transaction([ITEMS_STORE_NAME, FILES_STORE_NAME], 'readwrite');
    const itemsStore = tx.objectStore(ITEMS_STORE_NAME);
    const filesStore = tx.objectStore(FILES_STORE_NAME);
    
    let cursor = await itemsStore.openCursor();
    const now = Date.now();
    const deletedFiles = new Set<string>();

    while (cursor) {
      const item = cursor.value;
      if (now > item.expiresAt) {
        cursor.delete();
        if (item.type === 'file') {
            deletedFiles.add(item.id);
        }
      }
      cursor = await cursor.continue();
    }
    
    for (const fileId of deletedFiles) {
        await filesStore.delete(fileId);
    }

    await tx.done;
    console.log(`Cleanup complete. Removed ${deletedFiles.size} expired files and associated items.`);
  },
};
