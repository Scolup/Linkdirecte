// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { offlineQueue } from '../src/core/queue';
import { configure, clearSession } from '../src/index';

describe('Offline Queue Module', () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: string[] = [];

  const mockStorage = {
    store: new Map<string, string>(),
    get(key: string) {
      return this.store.get(key) || null;
    },
    set(key: string, val: string) {
      this.store.set(key, val);
    },
    delete(key: string) {
      this.store.delete(key);
    },
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requests = [];
    mockStorage.store.clear();
    offlineQueue.getQueue().length = 0;
    configure({
      storage: mockStorage,
      maxRetries: 0,
    });
    (offlineQueue as any).storage = mockStorage;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    (offlineQueue as any).storage = undefined;
    (offlineQueue as any).lastAdapter = undefined;
    (offlineQueue as any).initPromise = undefined;
    (offlineQueue as any).opChain = Promise.resolve();
    (offlineQueue as any).writeChain = Promise.resolve();
    (offlineQueue as any).queue = [];
    await clearSession();
  });

  it('pushes mutations to queue and persists them to storage', async () => {
    await offlineQueue.push('/some-endpoint.awp', { body: 'data' });

    const queue = offlineQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].endpoint).toBe('/some-endpoint.awp');
    expect(queue[0].options).toEqual({ body: 'data' });

    const savedStr = mockStorage.get('ed_offline_queue');
    expect(savedStr).toBeDefined();
    expect(JSON.parse(savedStr!)[0].endpoint).toBe('/some-endpoint.awp');
  });

  it('flushes the queue successfully and deletes items upon successful request', async () => {
    globalThis.fetch = async (input) => {
      requests.push(input.toString());
      return new Response(JSON.stringify({ code: 200, message: '', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await offlineQueue.push('/mutation-1.awp', { method: 'POST', body: { x: 1 } });
    await offlineQueue.push('/mutation-2.awp', { method: 'POST', body: { x: 2 } });

    expect(offlineQueue.getQueue().length).toBe(2);

    await offlineQueue.flush();

    expect(requests.length).toBe(2);
    expect(requests[0]).toContain('/mutation-1.awp');
    expect(requests[1]).toContain('/mutation-2.awp');

    expect(offlineQueue.getQueue().length).toBe(0);
    const saved = JSON.parse(mockStorage.get('ed_offline_queue') || '[]');
    expect(saved.length).toBe(0);
  });

  it('prevents concurrent flushes from executing in parallel and duplicating calls', async () => {
    let callCount = 0;
    globalThis.fetch = async (input) => {
      callCount++;
      await new Promise((r) => setTimeout(r, 10));
      return new Response(JSON.stringify({ code: 200, message: '', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await offlineQueue.push('/mutation-concurrent.awp', { method: 'POST', body: { x: 1 } });

    await Promise.all([offlineQueue.flush(), offlineQueue.flush()]);

    expect(callCount).toBe(1);
  });

  it('preserves mutation pushed before hydration resolves (deferred-get test)', async () => {
    let resolveGet: (val: string | null) => void = () => {};
    const deferredGetPromise = new Promise<string | null>((resolve) => {
      resolveGet = resolve;
    });

    const slowStorage = {
      get(key: string) {
        if (key === 'ed_offline_queue') {
          return deferredGetPromise;
        }
        return null;
      },
      async set(key: string, val: string) {},
      async delete(key: string) {},
    };

    (offlineQueue as any).storage = undefined;
    (offlineQueue as any).lastAdapter = undefined;
    (offlineQueue as any).initPromise = undefined;
    configure({ storage: slowStorage });

    const pushPromise = offlineQueue.push('/slow-endpoint.awp', { method: 'POST' });

    resolveGet(null);
    await pushPromise;

    expect(offlineQueue.getQueue().length).toBe(1);
    expect(offlineQueue.getQueue()[0].endpoint).toBe('/slow-endpoint.awp');
  });

  it('serializes queue persistence in order even if async sets have variable delays', async () => {
    const writeHistory: string[] = [];
    let resolveFirstSet: () => void = () => {};
    const firstSetPromise = new Promise<void>((r) => {
      resolveFirstSet = r;
    });

    let isFirst = true;

    const slowSetStorage = {
      store: new Map<string, string>(),
      async get(key: string) {
        return this.store.get(key) || null;
      },
      async set(key: string, val: string) {
        if (isFirst) {
          isFirst = false;
          await firstSetPromise;
        }
        this.store.set(key, val);
        writeHistory.push(val);
      },
      async delete(key: string) {},
    };

    (offlineQueue as any).storage = undefined;
    (offlineQueue as any).lastAdapter = undefined;
    (offlineQueue as any).initPromise = undefined;
    configure({ storage: slowSetStorage });

    const p1 = offlineQueue.push('/mutation-slow.awp', { body: 1 });
    const p2 = offlineQueue.push('/mutation-fast.awp', { body: 2 });

    resolveFirstSet();
    await Promise.all([p1, p2]);

    const finalStored = JSON.parse(slowSetStorage.store.get('ed_offline_queue') || '[]');
    expect(finalStored.length).toBe(2);
    expect(finalStored[1].endpoint).toBe('/mutation-fast.awp');

    expect(writeHistory.length).toBe(2);
    expect(writeHistory[0]).toContain('/mutation-slow.awp');
    expect(writeHistory[1]).toContain('/mutation-fast.awp');
  });

  it('returns shared promise on concurrent flush and both remain pending until delayed fetch completes', async () => {
    let resolveFetch: (res: any) => void = () => {};
    const fetchPromise = new Promise<any>((resolve) => {
      resolveFetch = resolve;
    });

    globalThis.fetch = async () => {
      await fetchPromise;
      return new Response(JSON.stringify({ code: 200, message: '', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    (offlineQueue as any).storage = undefined;
    (offlineQueue as any).lastAdapter = undefined;
    (offlineQueue as any).initPromise = undefined;
    configure({ storage: mockStorage });

    await offlineQueue.push('/mutation-flush.awp', { method: 'POST' });

    let f1Resolved = false;
    let f2Resolved = false;

    const f1 = offlineQueue.flush().then(() => {
      f1Resolved = true;
    });
    const f2 = offlineQueue.flush().then(() => {
      f2Resolved = true;
    });

    expect(f1Resolved).toBe(false);
    expect(f2Resolved).toBe(false);

    resolveFetch(null);
    await Promise.all([f1, f2]);

    expect(f1Resolved).toBe(true);
    expect(f2Resolved).toBe(true);
  });

  it('allows flushing again after flushing an empty queue (flush empty-queue path regression)', async () => {
    let callCount = 0;
    globalThis.fetch = async (input) => {
      callCount++;
      return new Response(JSON.stringify({ code: 200, message: '', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    (offlineQueue as any).storage = undefined;
    (offlineQueue as any).lastAdapter = undefined;
    (offlineQueue as any).initPromise = undefined;
    configure({ storage: mockStorage });

    // Flush an empty queue first (no requests should be sent, flushPromise should be cleared!)
    await offlineQueue.flush();
    expect(callCount).toBe(0);

    // Enqueue a mutation
    await offlineQueue.push('/mutation-after-empty.awp', { method: 'POST', body: { x: 1 } });

    // Flush again
    await offlineQueue.flush();

    // Verify the mutation was delivered
    expect(callCount).toBe(1);
    expect(offlineQueue.getQueue().length).toBe(0);
  });
});
