// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { getConfig } from './store';
import { edFetch } from './fetch';
import { randomUUID } from './env';
import type { StorageAdapter } from '../types';

interface QueuedMutation {
  id: string;
  endpoint: string;
  options: Record<string, unknown>;
  timestamp: number;
}

export class OfflineQueue {
  private queue: QueuedMutation[] = [];
  private storage?: StorageAdapter;
  private flushPromise: Promise<void> | null = null;

  private lastAdapter: StorageAdapter | undefined = undefined;
  private initPromise: Promise<void> | null = null;
  private writeChain: Promise<any> = Promise.resolve();
  private opChain: Promise<any> = Promise.resolve();

  constructor() {
    // Initialization is deferred and resolved per activeStorage adapter
  }

  private get activeStorage(): StorageAdapter | undefined {
    return this.storage || getConfig().storage;
  }

  private async runOp<T>(op: () => Promise<T> | T): Promise<T> {
    const next = this.opChain.then(op);
    this.opChain = next.catch(() => {});
    return next;
  }

  private async getInitPromise(storage: StorageAdapter): Promise<void> {
    const underlying = (storage as any).__rawStorage || storage;
    if (this.lastAdapter === underlying && this.initPromise) {
      return this.initPromise;
    }
    this.lastAdapter = underlying;
    this.initPromise = (async () => {
      try {
        const saved = await storage.get('ed_offline_queue');
        if (saved) {
          const loaded = JSON.parse(saved);
          this.queue = [...loaded, ...this.queue];
        }
      } catch {
        // preserve existing items on error
      }
    })();
    return this.initPromise;
  }

  private enqueueWrite(storage: StorageAdapter, data: string): Promise<void> {
    const next = this.writeChain.then(async () => {
      try {
        await storage.set('ed_offline_queue', data);
      } catch {
        // swallow storage-write failures so the promise still resolves safely
      }
    });
    this.writeChain = next;
    return next;
  }

  async push(endpoint: string, options: Record<string, unknown>): Promise<void> {
    const storage = this.activeStorage;

    const mutation: QueuedMutation = {
      id: randomUUID(),
      endpoint,
      options,
      timestamp: Date.now(),
    };
    this.queue.push(mutation);

    if (storage) {
      await this.runOp(async () => {
        await this.getInitPromise(storage);
        const snapshot = JSON.stringify(this.queue);
        await this.enqueueWrite(storage, snapshot);
      });
    }
  }

  async flush(): Promise<void> {
    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = (async () => {
      try {
        const storage = this.activeStorage;
        if (storage) {
          await this.getInitPromise(storage);
        }

        if (this.queue.length === 0) return;

        const remainingQueue: QueuedMutation[] = [];

        for (const mutation of this.queue) {
          try {
            await edFetch(mutation.endpoint, {
              ...mutation.options,
              skipQueue: true,
            });
          } catch {
            remainingQueue.push(mutation);
          }
        }

        this.queue = remainingQueue;
        if (storage) {
          const snapshot = JSON.stringify(this.queue);
          await this.enqueueWrite(storage, snapshot);
        }
      } finally {
        this.flushPromise = null;
      }
    })();

    return this.flushPromise;
  }

  getQueue(): QueuedMutation[] {
    return this.queue;
  }

  clear(): void {
    this.queue = [];
    this.flushPromise = null;
  }
}

export const offlineQueue = new OfflineQueue();
