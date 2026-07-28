// © 2026 typeof (Scolup) | Licensed under AGPL 3.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  prefetchAll,
  startAutoPrefetch,
  stopAutoPrefetch,
  configure,
  clearSession,
} from '../src/index';
import { setAccount, setToken } from '../src/core/store';

describe('Prefetch Module', () => {
  let originalFetch: typeof globalThis.fetch;
  let requestedEndpoints: string[] = [];

  const mockAccount = {
    loginId: 1234567,
    id: 9876,
    uid: 'session_uid',
    identifiant: 'Test.user',
    accountType: 'E' as const,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    schoolName: 'Ecole Test',
    main: true,
    profile: {
      sexe: 'M' as const,
      photoUrl: 'https://example.com/photo.jpg',
    },
    modules: [],
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requestedEndpoints = [];
    setAccount(mockAccount);
    setToken('test_token');
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    stopAutoPrefetch();
    await clearSession();
  });

  it('runs prefetchAll with config overrides and makes concurrent calls', async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = input.toString();
      requestedEndpoints.push(urlStr);
      return new Response(JSON.stringify({ code: 200, message: '', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await prefetchAll({
      enabled: true,
      modules: ['grades', 'messages'],
    });

    expect(requestedEndpoints.length).toBe(2);
    expect(requestedEndpoints.some((url) => url.includes('notes.awp'))).toBe(true);
    expect(requestedEndpoints.some((url) => url.includes('messages.awp'))).toBe(true);
  });

  it('does nothing in prefetchAll if not enabled', async () => {
    globalThis.fetch = async (input) => {
      requestedEndpoints.push(input.toString());
      return new Response('{}');
    };

    await prefetchAll({ enabled: false });

    expect(requestedEndpoints.length).toBe(0);
  });

  it('can start and stop auto-prefetch based on config interval', async () => {
    configure({
      prefetch: {
        enabled: true,
        interval: '5s',
        modules: ['grades'],
      },
    });

    let calls = 0;
    globalThis.fetch = async (input) => {
      calls++;
      return new Response(JSON.stringify({ code: 200, message: '', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    startAutoPrefetch();
    stopAutoPrefetch();

    expect(calls).toBe(0);
  });
});
// © 2026 typeof (Scolup) | Licensed under AGPL 3.
