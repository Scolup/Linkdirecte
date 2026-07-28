// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  parseDuration,
  buildCacheKey,
  getFromCache,
  setInCache,
  clearCache,
  resolveModule,
} from '../src/core/cache';
import { setConfig } from '../src/core/store';

describe('Cache Core Module', () => {
  beforeEach(() => {
    clearCache();
    setConfig({ cacheMaxEntries: 3 });
  });

  afterEach(() => {
    clearCache();
  });

  it('correctly parses duration strings', () => {
    expect(parseDuration('10s')).toBe(10_000);
    expect(parseDuration('5m')).toBe(300_000);
    expect(parseDuration('2h')).toBe(7_200_000);
    expect(parseDuration(undefined)).toBe(0);
    expect(parseDuration('invalid')).toBe(0);
  });

  it('resolves modules correctly from endpoints', () => {
    expect(resolveModule('/eleves/9876/notes.awp')).toBe('grades');
    expect(resolveModule('/E/9876/emploidutemps.awp')).toBe('timetable');
    expect(resolveModule('/invalid-endpoint')).toBeUndefined();
  });

  it('handles standard cache set, get, hit and miss', () => {
    const key = buildCacheKey('/test-endpoint', { foo: 'bar', baz: 123 });
    const key2 = buildCacheKey('/test-endpoint', { baz: 123, foo: 'bar' });

    expect(key).toBe(key2);

    setInCache(key, { data: 'my_data' }, 10_000);

    const cached = getFromCache<any>(key);
    expect(cached).toBeDefined();
    expect(cached.data).toBe('my_data');

    expect(getFromCache('another-key')).toBeUndefined();
  });

  it('expires entries properly', async () => {
    const key = 'expiring-key';
    setInCache(key, 'value', 2);

    await new Promise((r) => setTimeout(r, 10));

    expect(getFromCache(key)).toBeUndefined();
  });

  it('evicts old entries when max size limit is exceeded', () => {
    setInCache('k1', 'v1', 50_000);
    setInCache('k2', 'v2', 50_000);
    setInCache('k3', 'v3', 50_000);

    expect(getFromCache('k1')).toBe('v1');

    setInCache('k4', 'v4', 50_000);

    expect(getFromCache('k1')).toBeUndefined();
    expect(getFromCache('k2')).toBe('v2');
    expect(getFromCache('k3')).toBe('v3');
    expect(getFromCache('k4')).toBe('v4');
  });

  it('clears cache when clearSession is called', async () => {
    const { clearSession } = await import('../src/core/store');
    setInCache('temp', 'val', 50_000);
    expect(getFromCache('temp')).toBe('val');

    await clearSession();

    expect(getFromCache('temp')).toBeUndefined();
  });

  it('prevents pre-logout in-flight requests from repopulating cache after logout (deferred-fetch test)', async () => {
    const { edFetch } = await import('../src/core/fetch');
    const { clearSession } = await import('../src/core/store');

    let resolveFetch: (res: any) => void = () => {};
    const fetchPromise = new Promise<any>((resolve) => {
      resolveFetch = resolve;
    });

    globalThis.fetch = async () => {
      await fetchPromise;
      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: { notes: [] },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    setConfig({
      cache: { grades: '10m' },
    });

    const gradesPromise = edFetch('/notes.awp');

    await clearSession();

    resolveFetch(null);
    await gradesPromise;

    const key = buildCacheKey('/notes.awp');
    expect(getFromCache(key)).toBeUndefined();
  });
});
