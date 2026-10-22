"use client";

import type {
  OfflineTrainingDatabase, OfflineTrainingTransaction,
  LocalTrainingSnapshot, TrainingOutboxCommand,
} from "./protocol";

/**
 * Web-only opt-in adapter. This database deliberately does NOT read, migrate,
 * delete or replace the legacy JFS localStorage account snapshot.
 */
const DATABASE = "jfs-training-outbox-dev-v1";
const VERSION = 1;
const SESSIONS = "sessions";
const COMMANDS = "commands";

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? Error("IndexedDB request failed"));
  });
}

export class WebIndexedDbTrainingDatabase implements OfflineTrainingDatabase {
  private connection?: Promise<IDBDatabase>;
  private open(): Promise<IDBDatabase> {
    if (this.connection) return this.connection;
    if (typeof indexedDB === "undefined")
      return Promise.reject(Error("IndexedDB is unavailable in this environment"));
    this.connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SESSIONS)) {
          db.createObjectStore(SESSIONS, { keyPath: ["ownerId", "sessionId"] });
        }
        if (!db.objectStoreNames.contains(COMMANDS)) {
          const store = db.createObjectStore(COMMANDS,
            { keyPath: ["ownerId", "commandId"] });
          store.createIndex("byAccount", "ownerId", { unique: false });
        }
      };
      request.onblocked = () => reject(Error("Close other tabs before upgrading local training storage"));
      request.onerror = () => reject(request.error ?? Error("Cannot open offline training database"));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
    }).catch(error => {
      this.connection = undefined;
      throw error;
    });
    return this.connection;
  }

  async transact<T>(fn: (tx: OfflineTrainingTransaction) => Promise<T>): Promise<T> {
    const db = await this.open();
    const transaction = db.transaction([SESSIONS, COMMANDS], "readwrite", {
      durability: "strict",
    });
    const sessionStore = transaction.objectStore(SESSIONS);
    const commandStore = transaction.objectStore(COMMANDS);
    // Register completion before any async IDBRequest resolves.
    const committed = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(transaction.error ?? Error("Offline transaction rolled back"));
      transaction.onerror = () => {
        // onabort is the authoritative completion error.
      };
    });
    const tx: OfflineTrainingTransaction = {
      getSnapshot: (ownerId, sessionId) =>
        asPromise(sessionStore.get([ownerId, sessionId])) as Promise<LocalTrainingSnapshot|undefined>,
      putSnapshot: async snapshot => {
        await asPromise(sessionStore.put(structuredClone(snapshot)));
      },
      getCommand: (ownerId, commandId) =>
        asPromise(commandStore.get([ownerId, commandId])) as Promise<TrainingOutboxCommand|undefined>,
      listCommands: ownerId =>
        asPromise(commandStore.index("byAccount").getAll(ownerId))
          as Promise<TrainingOutboxCommand[]>,
      putCommand: async command => {
        await asPromise(commandStore.put(structuredClone(command)));
      },
      deleteCommand: async (ownerId, commandId) => {
        await asPromise(commandStore.delete([ownerId, commandId]));
      },
    };
    try {
      const result = await fn(tx);
      await committed;
      return result;
    } catch (error) {
      if (transaction.readyState !== "done") {
        try { transaction.abort(); } catch { /* it already aborted */ }
      }
      await committed.catch(() => {});
      throw error;
    }
  }
}
